import type Anthropic from '@anthropic-ai/sdk';

import type {AgentDefinition} from '@sigil/src/agent/framework/defineAgent';
import type {AgentState} from '@sigil/src/agent/framework/defineAgent/types';
import type {AgentExecutionContext} from '@sigil/src/agent/framework/types';
import type {Result} from '@sigil/src/common/errors';
import {err, ok, AGENT_ERROR_CODES} from '@sigil/src/common/errors';

import type {DurationMetrics, ExecuteFailure, TokenMetrics} from '../types';
import {createCancellationError} from '../util';

import {buildMetadata} from './buildMetadata';
import type {ProcessToolUsesState, ProcessToolUsesCallbacks} from './processToolUses';
import {processToolUses} from './processToolUses';

/**
 * Parameters for running the iteration loop
 */
export interface RunIterationLoopParams<Input, Output, Run extends object, Attempt extends object> {
	agent: AgentDefinition<Input, Output, Run, Attempt>;
	anthropic: Anthropic;
	context: AgentExecutionContext;
	state: ProcessToolUsesState<Run, Attempt>;
	conversationHistory: Anthropic.MessageParam[];
	systemPrompt: string;
	tools: Anthropic.Tool[];
	isReflectionEnabled: boolean;
	maxIterations: number;
	signal?: AbortSignal;
	callbacks: ProcessToolUsesCallbacks<Output>;
	callbackErrors: Error[];
	durationMetrics: DurationMetrics;
	tokenMetrics: TokenMetrics;
}

/**
 * Result of running the iteration loop
 */
export interface RunIterationLoopResult<Output, Run extends object, Attempt extends object> {
	output: Output;
	iterationCount: number;
	lastResponse: Anthropic.Message;
	updatedState: AgentState<Run, Attempt>;
	tokenMetrics: TokenMetrics;
}

/**
 * Runs the agent iteration loop, calling the API and processing tool uses until
 * termination conditions are met.
 *
 * This function encapsulates the core iteration logic: making API calls, processing
 * tool uses, managing conversation history, and handling termination conditions.
 *
 * @returns Result containing output and execution metadata, or error details
 */
export const runIterationLoop = async <Input, Output, Run extends object, Attempt extends object>(
	params: RunIterationLoopParams<Input, Output, Run, Attempt>
): Promise<Result<RunIterationLoopResult<Output, Run, Attempt>, ExecuteFailure>> => {
	const {
		agent,
		anthropic,
		context,
		state,
		conversationHistory,
		systemPrompt,
		tools,
		isReflectionEnabled,
		maxIterations,
		signal,
		callbacks,
		callbackErrors,
		durationMetrics,
		tokenMetrics,
	} = params;

	let currentState = state.current;
	let iterationCount = 0;
	let output: Output | undefined;
	let response: Anthropic.Message | undefined;
	let lastOutputToolInput: Output | undefined;

	// Iteration loop for tool calling
	while (iterationCount < maxIterations) {
		iterationCount++;

		// Create new context with updated iteration (immutable update)
		const iterationContext: AgentExecutionContext = {
			...context,
			iteration: iterationCount,
		};

		// Update currentState with new context
		currentState = {
			...currentState,
			context: iterationContext,
		};

		// Check for cancellation before API call
		if (signal?.aborted) {
			return err(createCancellationError({
				attempt: context.attempt,
				phase: 'iteration',
				observability: agent.observability,
				durationMetrics,
				tokenMetrics,
				callbackErrors,
				buildMetadata,
			}));
		}

		// Call Anthropic API
		try {
			response = await anthropic.messages.create(
				{
					model: agent.model.name,
					max_tokens: agent.model.maxTokens,
					temperature: agent.model.temperature,
					system: systemPrompt,
					messages: conversationHistory,
					tools,
				},
				{
					signal,
				}
			);
		} catch (error) {
			return err({
				errors: [
					{
						code: AGENT_ERROR_CODES.API_ERROR,
						severity: 'error',
						category: 'model',
						context: {
							attempt: context.attempt,
							message: error instanceof Error ? error.message : String(error),
						},
					},
				],
				metadata: buildMetadata({
					observability: agent.observability,
					durationMetrics,
					tokenMetrics,
					callbackErrors,
				}),
			});
		}

		// Accumulate token usage
		tokenMetrics.input += response.usage.input_tokens;
		tokenMetrics.output += response.usage.output_tokens;

		// Check stop reason - exit if not tool_use
		if (response.stop_reason !== 'tool_use') {
			break;
		}

		// Find all tool uses in the response
		const toolUses = response.content.filter(
			(block): block is Anthropic.ToolUseBlock => block.type === 'tool_use'
		);

		// Process ALL tools and build tool results
		const processResult = processToolUses({
			toolUses,
			agent,
			context: iterationContext,
			state: {
				current: currentState,
				run: state.run,
			},
			isReflectionEnabled,
			lastOutputToolInput,
			callbacks,
			callbackErrors,
		});

		const toolResults = processResult.toolResults;
		const submitFound = processResult.wasSubmitFound;
		const outputFound = processResult.wasOutputFound;
		lastOutputToolInput = processResult.lastOutputToolInput;

		// Update currentState with processed results
		currentState = {
			context: iterationContext,
			run: processResult.updatedRunState,
			attempt: processResult.updatedAttemptState,
		};

		// Check termination conditions AFTER processing all tools
		if (submitFound) {
			// Submit called - check that output was called previously
			if (!lastOutputToolInput) {
				return err({
					errors: [
						{
							code: AGENT_ERROR_CODES.SUBMIT_BEFORE_OUTPUT,
							severity: 'error',
							category: 'model',
							context: {
								attempt: context.attempt,
								iterationCount,
							},
						},
					],
					metadata: buildMetadata({
						observability: agent.observability,
						durationMetrics,
						tokenMetrics,
						callbackErrors,
					}),
				});
			}
			// Use last output tool input and exit loop
			output = lastOutputToolInput;
			break;
		}

		if (outputFound && !isReflectionEnabled) {
			// Output tool called in non-reflection mode - exit immediately
			// Note: If the model called multiple tools in this response (e.g., [helper, output, helper]),
			// all tools were processed above and their results added to toolResults array.
			// However, we exit here without appending toolResults to conversation history,
			// effectively discarding them. This is intentional: we're terminating the iteration
			// loop anyway, and the model already provided its final output via the output tool.
			output = lastOutputToolInput;
			break;
		}

		// Append conversation history
		conversationHistory.push({
			role: 'assistant',
			content: response.content,
		});

		conversationHistory.push({
			role: 'user',
			content: toolResults,
		});

		// Continue to next iteration
	}

	// Check if output tool was ever called
	// This check takes priority over MAX_ITERATIONS_EXCEEDED because it's more
	// specific and actionable - it tells exactly what went wrong (protocol violation)
	// rather than just indicating resource exhaustion.
	if (!output) {
		return err({
			errors: [
				{
					code: AGENT_ERROR_CODES.OUTPUT_TOOL_NOT_USED,
					severity: 'error',
					category: 'model',
					context: {
						attempt: context.attempt,
						iterationCount,
						expectedTool: agent.tools.output.name,
					},
				},
			],
			metadata: buildMetadata({
				observability: agent.observability,
				durationMetrics,
				tokenMetrics,
				callbackErrors,
			}),
		});
	}

	// Check if iteration limit exceeded
	// This check happens after the loop exits and verifies that we hit the limit
	// while the model still wanted to use tools (stop_reason === 'tool_use').
	// If the model naturally stopped with 'end_turn', we would have exited the loop
	// earlier without hitting this check.
	if (iterationCount >= maxIterations && response?.stop_reason === 'tool_use') {
		return err({
			errors: [
				{
					code: AGENT_ERROR_CODES.MAX_ITERATIONS_EXCEEDED,
					severity: 'error',
					category: 'execution',
					context: {
						attempt: context.attempt,
						iterationCount,
						maxIterations,
					},
				},
			],
			metadata: buildMetadata({
				observability: agent.observability,
				durationMetrics,
				tokenMetrics,
				callbackErrors,
			}),
		});
	}

	return ok({
		output,
		iterationCount,
		lastResponse: response!,
		updatedState: currentState,
		tokenMetrics: {
			input: tokenMetrics.input,
			output: tokenMetrics.output,
		},
	});
};
