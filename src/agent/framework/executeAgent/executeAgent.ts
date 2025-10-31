import type Anthropic from '@anthropic-ai/sdk';
import * as z from 'zod';

import {createAnthropicClient} from '@sigil/src/agent/clients/anthropic';
import {DEFAULT_MAX_ITERATIONS} from '@sigil/src/agent/framework/common';
import type {AgentDefinition, ObservabilityConfig} from '@sigil/src/agent/framework/defineAgent';
import {buildSystemPrompt, buildUserPrompt, buildErrorPrompt} from '@sigil/src/agent/framework/prompts/build';
import type {AgentExecutionState} from '@sigil/src/agent/framework/types';
import type {
	ValidationLayerMetadata,
	ValidationLayerResult,
	ValidationLayerCallbacks,
	ValidationLayerIdentity,
} from '@sigil/src/agent/framework/validation';
import {formatValidationErrorForPrompt} from '@sigil/src/agent/framework/validation/format';
import {validateLayers} from '@sigil/src/agent/framework/validation/validateLayers';
import type {AgentError, Result, ExecutionPhase} from '@sigil/src/common/errors';
import {err, ok, isErr, AGENT_ERROR_CODES, safeStringify} from '@sigil/src/common/errors';

/**
 * Default submit tool definition for reflection mode
 *
 * Automatically injected when output tool has a reflection handler.
 * Signals that the model is satisfied with its output and ready for validation.
 */
const DEFAULT_SUBMIT_TOOL: Anthropic.Tool = {
	name: 'submit',
	description: 'Submit your final output for validation. Call this when you are satisfied with your output.',
	input_schema: {
		type: 'object',
		properties: {},
		required: [],
	},
};

/**
 * Default state initialiser that uses input as the initial state
 *
 * Used when no custom initialState function is provided in the agent definition.
 * Assumes State type equals Input type.
 */
const DEFAULT_STATE_INITIALISER = <Input, State>(input: Input): State => input as unknown as State;

/**
 * Token usage statistics for an agent execution
 */
export interface ExecuteMetadataTokenUsageStatistics {
  /**
   * Number of input tokens consumed
   */
  input: number;

  /**
   * Number of output tokens generated
   */
  output: number;
}

/**
 * Execution metadata containing resource usage and performance data
 */
export interface ExecuteMetadata {
  /**
   * Total execution latency in milliseconds
   */
  latency?: number;

  /**
   * Token usage statistics
   */
  tokens?: ExecuteMetadataTokenUsageStatistics;

  /**
   * Errors thrown by callbacks during execution
   *
   * Callbacks are observability hooks and should not throw errors. However, if they do,
   * those errors are caught and collected here to prevent callback failures from breaking
   * agent execution. The presence of callback errors indicates bugs in callback implementations
   * that should be fixed.
   */
  callbackErrors?: Error[];
}

/**
 * Callback functions for monitoring agent execution progress
 *
 * Callbacks are synchronous, fire-and-forget observability hooks. They should
 * be lightweight operations like logging or metrics collection. For async operations,
 * use non-blocking patterns (e.g., `void asyncOperation().catch(handleError)`).
 *
 * @template Output - The type of validated output the agent produces
 */
export interface ExecuteCallbacks<Output> {
  /**
   * Called when an execution attempt starts
   *
   * @param state - Execution state containing attempt number and max attempts
   */
  onAttemptStart?: (state: AgentExecutionState) => void;

  /**
   * Called when an execution attempt completes
   *
   * @param state - Execution state containing attempt number and max attempts
   * @param success - Whether the attempt succeeded validation
   */
  onAttemptComplete?: (state: AgentExecutionState, success: boolean) => void;

  /**
   * Called when output validation fails
   *
   * @param state - Execution state containing attempt number and max attempts
   * @param errors - Validation errors from the output schema
   */
  onValidationFailure?: (state: AgentExecutionState, errors: unknown) => void;

  /**
   * Called when a validation layer starts execution
   *
   * @param state - Execution state containing attempt number and max attempts
   * @param layer - Metadata about the layer being executed
   */
  onValidationLayerStart?: (
    state: AgentExecutionState,
    layer: ValidationLayerMetadata
  ) => void;

  /**
   * Called when a validation layer completes execution
   *
   * @param state - Execution state containing attempt number and max attempts
   * @param layer - Result of the layer execution (discriminated union)
   */
  onValidationLayerComplete?: (
    state: AgentExecutionState,
    layer: ValidationLayerResult
  ) => void;

  /**
   * Called when a tool is invoked (before execution)
   *
   * Fires for helper tools, output tool (in reflection mode), and submit tool.
   * Use for logging tool invocations or showing "Agent is using tool X" in UI.
   *
   * @param state - Execution state containing attempt number and max attempts
   * @param toolName - Name of the tool being called
   * @param toolInput - Input provided to the tool by the model
   */
  onToolCall?: (
    state: AgentExecutionState,
    toolName: string,
    toolInput: unknown
  ) => void;

  /**
   * Called when a tool execution completes (after execution)
   *
   * Fires for both successful tool executions and errors. Check the result string
   * to determine if an error occurred (will contain "Error:" prefix for errors).
   *
   * @param state - Execution state containing attempt number and max attempts
   * @param toolName - Name of the tool that was called
   * @param toolResult - Result from the tool (or error message if execution failed)
   */
  onToolResult?: (
    state: AgentExecutionState,
    toolName: string,
    toolResult: string
  ) => void;

  /**
   * Called when agent execution succeeds
   *
   * @param output - The validated output from the agent
   */
  onSuccess?: (output: Output) => void;

  /**
   * Called when agent execution fails after all attempts
   *
   * @param errors - Array of AgentError describing what went wrong
   */
  onFailure?: (errors: AgentError[]) => void;
}

/**
 * Configuration options for executing an agent
 *
 * @template Input - The type of input data the agent accepts
 * @template Output - The type of validated output the agent produces
 */
export interface ExecuteOptions<Input, Output> {
  /**
   * Input data to pass to the agent
   */
  input: Input;

  /**
   * Override the agent's default maximum number of execution attempts
   *
   * If not provided, uses the agent's configured maxAttempts value
   */
  maxAttempts?: number;

  /**
   * Optional callback functions to monitor execution progress
   */
  callbacks?: ExecuteCallbacks<Output>;

  /**
   * Optional AbortSignal to cancel execution mid-flight
   *
   * When the signal is aborted, execution will stop at the next cancellation
   * checkpoint and return an EXECUTION_CANCELLED error. The signal is propagated
   * to all async operations (prompt generation, validation, API calls) and callbacks.
   */
  signal?: AbortSignal;
}

/**
 * Successful agent execution result data
 *
 * This is the success data structure, not a Result wrapper.
 * Failures are represented by ExecuteFailure in the Result pattern:
 * `Result<ExecuteSuccess<Output>, ExecuteFailure>`
 *
 * @template Output - The type of validated output the agent produces
 */
export interface ExecuteSuccess<Output> {
  /**
   * Validated output from the agent
   *
   * Guaranteed to match the agent's output schema
   */
  output: Output;

  /**
   * Number of attempts taken to produce valid output
   *
   * Value between 1 and maxAttempts (inclusive)
   */
  attempts: number;

  /**
   * Optional execution metadata
   *
   * Contains information about resource usage and performance
   */
  metadata?: ExecuteMetadata;
}

/**
 * Failed agent execution result data
 *
 * This is the failure data structure, not a Result wrapper.
 * Returned in the error case of the Result pattern:
 * `Result<ExecuteSuccess<Output>, ExecuteFailure>`
 */
export interface ExecuteFailure {
  /**
   * Array of errors that occurred during execution
   */
  errors: AgentError[];

  /**
   * Optional execution metadata
   *
   * Contains information about resource usage and performance.
   * Populated even for failed executions to track cost and latency of failures.
   */
  metadata?: ExecuteMetadata;
}

/**
 * Executes an agent with retry logic and multi-layer validation
 *
 * This function orchestrates the complete agent execution flow:
 * 1. Iterates up to maxAttempts times
 * 2. On each attempt:
 *    - Generates system and user prompts from the agent's prompt functions
 *    - Calls the LLM with the generated prompts
 *    - Validates the response through multiple validation layers:
 *      - Zod schema validation (outputSchema)
 *      - Custom validators (if configured)
 * 3. On validation failure:
 *    - Formats errors into LLM-actionable feedback
 *    - Retries with error context in the next attempt
 * 4. On validation success:
 *    - Returns ExecuteSuccess with validated output and metadata
 * 5. On max attempts exceeded:
 *    - Returns AgentError[] with MAX_ATTEMPTS_EXCEEDED code
 *
 * Uses the Result pattern for type-safe error handling. Check success with
 * isOk/isErr type guards from @sigil/src/common/errors/result.
 *
 * @template Input - The type of input data the agent accepts
 * @template Output - The type of validated output the agent produces
 *
 * @param agent - Agent definition created by defineAgent()
 * @param options - Execution configuration including input data and optional overrides
 * @returns Promise resolving to Result containing either ExecuteSuccess or ExecuteFailure
 *
 * @example
 * ```typescript
 * import {isOk, isErr} from '@sigil/src/common/errors';
 * import {executeAgent} from '@sigil/src/agent/framework/executeAgent';
 * import {myAgent} from './agents/myAgent';
 *
 * const result = await executeAgent(myAgent, {
 *   input: {data: 'example'},
 *   maxAttempts: 5,
 *   callbacks: {
 *     onAttemptStart: (state) => console.log(`Attempt ${state.attempt}`),
 *     onValidationLayerStart: (state, layer) => {
 *       console.log(`[${state.attempt}] Starting ${layer.type}: ${layer.name}`);
 *     },
 *     onValidationLayerComplete: (state, layer) => {
 *       if (layer.success) {
 *         console.log(`[${state.attempt}] ✓ ${layer.name} passed`);
 *       } else {
 *         console.log(`[${state.attempt}] × ${layer.name} failed:`, layer.error);
 *       }
 *     },
 *     onSuccess: (output) => console.log('Success!', output),
 *   },
 * });
 *
 * if (isOk(result)) {
 *   console.log('Output:', result.data.output);
 *   console.log('Attempts:', result.data.attempts);
 *   console.log('Latency:', result.data.metadata?.latency);
 *   console.log('Tokens:', result.data.metadata?.tokens);
 * } else {
 *   console.error('Execution failed:', result.error.errors);
 *   console.error('Failure metadata:', result.error.metadata);
 * }
 * ```
 */
/**
 * Creates an EXECUTION_CANCELLED error with proper context
 *
 * @param attempt - Current attempt number when cancellation occurred
 * @param phase - Execution phase where cancellation was detected
 * @returns ExecuteFailure with EXECUTION_CANCELLED error
 */
const createCancellationError = (
	attempt: number,
	phase: ExecutionPhase,
	observability: ObservabilityConfig,
	startTime: number,
	totalInputTokens: number,
	totalOutputTokens: number,
	callbackErrors: Error[]
): ExecuteFailure => {
	const error: AgentError = {
		code: AGENT_ERROR_CODES.EXECUTION_CANCELLED,
		severity: 'error',
		category: 'execution',
		context: {
			attempt,
			phase,
		},
	};

	const metadata = buildMetadata({
		observability,
		startTime,
		totalInputTokens,
		totalOutputTokens,
		callbackErrors
	});

	return {
		errors: [error],
		metadata,
	};
};

/**
 * Formatted tool result for Anthropic API
 */
interface FormattedToolResult {
  content: string;
  is_error?: boolean;
}

/**
 * Formats a reflection handler result for Anthropic API
 */
const formatReflectionHandlerResult = (result: Result<string, string>): FormattedToolResult => {
	if (isErr(result)) {
		return {
			content: result.error,
			is_error: true,
		};
	}
	return {
		content: result.data,
	};
};

/**
 * Options for building execution metadata
 */
interface BuildMetadataOptions {
  /**
   * Observability configuration from agent definition
   */
  observability: ObservabilityConfig;

  /**
   * Execution start time from performance.now()
   */
  startTime: number;

  /**
   * Total input tokens consumed across all attempts
   */
  totalInputTokens: number;

  /**
   * Total output tokens generated across all attempts
   */
  totalOutputTokens: number;

  /**
   * Array of callback errors (empty if none occurred)
   */
  callbackErrors: Error[];
}

/**
 * Helper function to safely invoke callbacks and collect errors
 *
 * Wraps callback invocations in try-catch to prevent callback failures from
 * breaking agent execution. Collects any callback errors for inclusion in metadata.
 *
 * @param callback - The callback function to invoke (may be undefined)
 * @param args - Arguments to pass to the callback
 * @param callbackErrors - Array to collect any errors that occur
 */
const safeInvokeCallback = <Args extends unknown[]>(
	callback: ((...args: Args) => void) | undefined,
	args: Args,
	callbackErrors: Error[]
): void => {
	if (!callback) {
		return;
	}

	try {
		callback(...args);
	} catch (error) {
		callbackErrors.push(
			error instanceof Error ? error : new Error(String(error))
		);
	}
};

/**
 * Builds execution metadata based on observability configuration
 *
 * Respects the agent's observability flags to determine which metrics to include.
 * Always includes callback errors if any occurred, regardless of flags.
 *
 * @param options - Options for building metadata
 * @returns ExecuteMetadata object with fields populated based on observability flags
 */
const buildMetadata = (options: BuildMetadataOptions): ExecuteMetadata => {
	const endTime = performance.now();
	const metadata: ExecuteMetadata = {};

	// Include latency if tracking is enabled
	if (options.observability.trackLatency) {
		metadata.latency = endTime - options.startTime;
	}

	// Include token usage if tracking is enabled
	if (options.observability.trackTokens) {
		metadata.tokens = {
			input: options.totalInputTokens,
			output: options.totalOutputTokens,
		};
	}

	// Always include callback errors if any occurred
	if (options.callbackErrors.length > 0) {
		metadata.callbackErrors = options.callbackErrors;
	}

	return metadata;
};

export const executeAgent = async <Input, Output, State = Input>(
	agent: AgentDefinition<Input, Output, State>,
	options: ExecuteOptions<Input, Output>
): Promise<Result<ExecuteSuccess<Output>, ExecuteFailure>> => {
	// Track execution start time for latency calculation
	const startTime = performance.now();

	// Track token usage across all attempts
	let totalInputTokens = 0;
	let totalOutputTokens = 0;

	// Determine max attempts (options override or agent default)
	const maxAttempts = options.maxAttempts ?? agent.validation.maxAttempts;

	// Track callback errors
	const callbackErrors: Error[] = [];

	// Track last validation errors for MAX_ATTEMPTS_EXCEEDED error context
	let lastValidationError: unknown;

	// Track last failed validation layer for error formatting
	// Permanent structure to avoid TypeScript narrowing issues with undefined assignment
	const lastFailedLayer: ValidationLayerIdentity = {
		name: 'validation',
		description: 'No description provided for validation layer',
	};

	// Initialise state for execution
	const stateInitialiser = agent.initialState ?? DEFAULT_STATE_INITIALISER<Input, State>;
	let currentState: State = stateInitialiser(options.input);

	// Check for cancellation before building user prompt
	if (options.signal?.aborted) {
		return err(createCancellationError(
			0,
			'prompt_generation',
			agent.observability,
			startTime,
			totalInputTokens,
			totalOutputTokens,
			callbackErrors
		));
	}

	// Build user prompt once (immutable task description)
	const userPromptResult = await buildUserPrompt(agent, options.input, options.signal);
	if (isErr(userPromptResult)) {
		return err({
			errors: userPromptResult.error,
			metadata: buildMetadata({
				observability: agent.observability,
				startTime,
				totalInputTokens,
				totalOutputTokens,
				callbackErrors
			}),
		});
	}

	// Initialise conversation history with the original task
	const conversationHistory: Anthropic.MessageParam[] = [
		{
			role: 'user',
			content: userPromptResult.data,
		},
	];

	// Create Anthropic client once (reuse across retries)
	const anthropic = createAnthropicClient();

	// Retry loop
	for (let attempt = 1; attempt <= maxAttempts; attempt++) {
		// Check for cancellation at start of each iteration
		if (options.signal?.aborted) {
			return err(createCancellationError(
				attempt,
				'prompt_generation',
				agent.observability,
				startTime,
				totalInputTokens,
				totalOutputTokens,
				callbackErrors
			));
		}

		// Determine iteration limit for this attempt
		const maxIterations = agent.validation.maxIterationsPerAttempt ?? DEFAULT_MAX_ITERATIONS;

		// Create execution state
		const state: AgentExecutionState = {
			attempt,
			maxAttempts,
			iteration: 0, // Will be incremented before each API call in the loop
			maxIterations,
		};

		// Reset failed layer tracking for this attempt
		lastFailedLayer.name = 'validation';
		lastFailedLayer.description = 'No description provided for validation layer';

		// Invoke onAttemptStart callback
		safeInvokeCallback(
			options.callbacks?.onAttemptStart,
			[state],
			callbackErrors
		);

		// Check for cancellation before building system prompt
		if (options.signal?.aborted) {
			return err(createCancellationError(
				attempt,
				'prompt_generation',
				agent.observability,
				startTime,
				totalInputTokens,
				totalOutputTokens,
				callbackErrors
			));
		}

		// Build system prompt (can adapt based on attempt)
		const systemPromptResult = await buildSystemPrompt(
			agent,
			options.input,
			state,
		);

		if (isErr(systemPromptResult)) {
			return err({
				errors: systemPromptResult.error,
				metadata: buildMetadata({
					observability: agent.observability,
					startTime,
					totalInputTokens,
					totalOutputTokens,
					callbackErrors
				}),
			});
		}

		// Build tools array from agent configuration
		// Convert Zod schema to JSON Schema for Anthropic API
		// Agent output schemas are always objects, so this cast is safe
		const outputTool: Anthropic.Tool = {
			name: agent.tools.output.name,
			description: agent.tools.output.description,
			input_schema: z.toJSONSchema(agent.validation.outputSchema) as Anthropic.Tool.InputSchema,
		};

		// Build helper tools array from configuration
		const helperTools: Anthropic.Tool[] = agent.tools.helpers
			? Object.values(agent.tools.helpers).map((helper) => ({
				name: helper.name,
				description: helper.description,
				input_schema: z.toJSONSchema(helper.inputSchema) as Anthropic.Tool.InputSchema,
			}))
			: [];

		// Determine if reflection mode is enabled
		const reflectionEnabled = !!agent.tools.output.reflectionHandler;

		// Build tools array (inject submit tool if reflection enabled)
		const tools: Anthropic.Tool[] = [
			outputTool,
			...helperTools,
			...(reflectionEnabled ? [DEFAULT_SUBMIT_TOOL] : []),
		];

		// Iteration loop for tool calling
		let iterationCount = 0;
		let output: Output | undefined;
		let response: Anthropic.Message | undefined;
		let lastOutputToolInput: Output | undefined;

		// Make initial API call
		while (iterationCount < maxIterations) {
			state.iteration = ++iterationCount;

			// Check for cancellation before API call
			if (options.signal?.aborted) {
				return err(createCancellationError(
					attempt,
					'iteration',
					agent.observability,
					startTime,
					totalInputTokens,
					totalOutputTokens,
					callbackErrors
				));
			}

			// Call Anthropic API
			try {
				response = await anthropic.messages.create({
					model: agent.model.name,
					max_tokens: agent.model.maxTokens,
					temperature: agent.model.temperature,
					system: systemPromptResult.data,
					messages: conversationHistory,
					tools,
				},
				{
					signal: options.signal,
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
								attempt,
								message: error instanceof Error ? error.message : String(error),
							},
						},
					],
					metadata: buildMetadata({
						observability: agent.observability,
						startTime,
						totalInputTokens,
						totalOutputTokens,
						callbackErrors
					}),
				});
			}

			// Accumulate token usage
			totalInputTokens += response.usage.input_tokens;
			totalOutputTokens += response.usage.output_tokens;

			// Check stop reason - exit if not tool_use
			if (response.stop_reason !== 'tool_use') {
				break;
			}

			// Find all tool uses in the response
			const toolUses = response.content.filter(
				(block): block is Anthropic.ToolUseBlock => block.type === 'tool_use'
			);

			// Process ALL tools and build tool results
			const toolResults: Anthropic.ToolResultBlockParam[] = [];
			let submitFound = false;
			let outputFound = false;

			for (const toolUse of toolUses) {
				// Check for submit tool
				if (toolUse.name === DEFAULT_SUBMIT_TOOL.name) {
					submitFound = true;
					// Fire callback for submit tool
					safeInvokeCallback(
						options.callbacks?.onToolCall,
						[{...state}, toolUse.name, toolUse.input],
						callbackErrors
					);
					// Fire callback for submit tool result
					safeInvokeCallback(
						options.callbacks?.onToolResult,
						[{...state}, toolUse.name, ''],
						callbackErrors
					);
					// Submit tool has no result (termination signal only)
					continue;
				}

				// Check for output tool
				if (toolUse.name === agent.tools.output.name) {
					outputFound = true;
					lastOutputToolInput = toolUse.input as Output;

					// Fire callback before execution
					safeInvokeCallback(
						options.callbacks?.onToolCall,
						[{...state}, toolUse.name, toolUse.input],
						callbackErrors
					);

					if (reflectionEnabled) {
						// Execute reflection handler with exception safety
						try {
							const handlerResult = agent.tools.output.reflectionHandler!(lastOutputToolInput);
							const formatted = formatReflectionHandlerResult(handlerResult);

							toolResults.push({
								type: 'tool_result',
								tool_use_id: toolUse.id,
								content: formatted.content,
								is_error: formatted.is_error,
							});

							// Fire callback with result
							safeInvokeCallback(
								options.callbacks?.onToolResult,
								[{...state}, toolUse.name, formatted.content],
								callbackErrors
							);
						} catch (error) {
							// Reflection handler threw exception (contract violation)
							const errorContent = `Error: ${error instanceof Error ? error.message : String(error)}`;
							toolResults.push({
								type: 'tool_result',
								tool_use_id: toolUse.id,
								content: errorContent,
								is_error: true,
							});
							// Fire callback with error result
							safeInvokeCallback(
								options.callbacks?.onToolResult,
								[{...state}, toolUse.name, errorContent],
								callbackErrors
							);
						}
					}
					// In non-reflection mode, output tool doesn't produce a result
					continue;
				}

				// Handle helper tools via handler lookup
				// Fire callback before execution
				safeInvokeCallback(
					options.callbacks?.onToolCall,
					[{...state}, toolUse.name, toolUse.input],
					callbackErrors
				);

				// Look up tool handler
				const tool = agent.tools.helpers?.[toolUse.name];
				if (!tool) {
					const errorContent = `Unknown tool: ${toolUse.name}`;
					toolResults.push({
						type: 'tool_result',
						tool_use_id: toolUse.id,
						content: errorContent,
						is_error: true,
					});
					safeInvokeCallback(
						options.callbacks?.onToolResult,
						[{...state}, toolUse.name, errorContent],
						callbackErrors
					);
					continue;
				}

				// Execute handler with exception safety
				try {
					const handlerResult = tool.handler(currentState, toolUse.input);

					if (isErr(handlerResult)) {
						const errorContent = handlerResult.error;
						toolResults.push({
							type: 'tool_result',
							tool_use_id: toolUse.id,
							content: errorContent,
							is_error: true,
						});
						safeInvokeCallback(
							options.callbacks?.onToolResult,
							[{...state}, toolUse.name, errorContent],
							callbackErrors
						);
					} else {
						currentState = handlerResult.data.newState;
						const formattedResult = JSON.stringify(handlerResult.data.toolResult);
						toolResults.push({
							type: 'tool_result',
							tool_use_id: toolUse.id,
							content: formattedResult,
							is_error: false,
						});
						safeInvokeCallback(
							options.callbacks?.onToolResult,
							[{...state}, toolUse.name, formattedResult],
							callbackErrors
						);
					}
				} catch (error) {
					// Handler threw exception (contract violation)
					const errorContent = `Error: ${error instanceof Error ? error.message : String(error)}`;
					toolResults.push({
						type: 'tool_result',
						tool_use_id: toolUse.id,
						content: errorContent,
						is_error: true,
					});
					safeInvokeCallback(
						options.callbacks?.onToolResult,
						[{...state}, toolUse.name, errorContent],
						callbackErrors
					);
				}
			}

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
									attempt,
									iterationCount,
								},
							},
						],
						metadata: buildMetadata({
							observability: agent.observability,
							startTime,
							totalInputTokens,
							totalOutputTokens,
							callbackErrors
						}),
					});
				}
				// Use last output tool input and exit loop
				output = lastOutputToolInput;
				break;
			}

			if (outputFound && !reflectionEnabled) {
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
							attempt,
							iterationCount,
							expectedTool: agent.tools.output.name,
						},
					},
				],
				metadata: buildMetadata({
					observability: agent.observability,
					startTime,
					totalInputTokens,
					totalOutputTokens,
					callbackErrors
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
							attempt,
							iterationCount,
							maxIterations,
						},
					},
				],
				metadata: buildMetadata({
					observability: agent.observability,
					startTime,
					totalInputTokens,
					totalOutputTokens,
					callbackErrors
				}),
			});
		}

		// Check for cancellation before validation
		if (options.signal?.aborted) {
			return err(createCancellationError(
				attempt,
				'validation',
				agent.observability,
				startTime,
				totalInputTokens,
				totalOutputTokens,
				callbackErrors
			));
		}

		// Validate output through multi-layer validation
		// Map ExecuteCallbacks to ValidationLayerCallbacks
		// Always provide onLayerComplete to capture failed layer metadata for error formatting
		const validationCallbacks: ValidationLayerCallbacks = {
			onLayerStart: options.callbacks?.onValidationLayerStart
				? (layer: ValidationLayerMetadata) => {
					safeInvokeCallback(
						options.callbacks?.onValidationLayerStart,
						[{...state}, layer],
						callbackErrors
					);
				}
				: undefined,
			onLayerComplete: (layer: ValidationLayerResult) => {
				// Always capture failed layer metadata for error formatting
				if (!layer.success) {
					lastFailedLayer.name = layer.name;
					lastFailedLayer.description = layer.description;
				}

				// Call user callback if provided
				if (options.callbacks?.onValidationLayerComplete) {
					safeInvokeCallback(
						options.callbacks?.onValidationLayerComplete,
						[{...state}, layer],
						callbackErrors
					);
				}
			},
		};

		const validationResult = await validateLayers(
			output,
			agent.validation.outputSchema,
			agent.validation.customValidators,
			validationCallbacks,
		);

		// Handle validation success
		if (!isErr(validationResult)) {
			// Invoke onAttemptComplete callback with success
			safeInvokeCallback(
				options.callbacks?.onAttemptComplete,
				[{...state}, true],
				callbackErrors
			);

			// Invoke onSuccess callback
			safeInvokeCallback(
				options.callbacks?.onSuccess,
				[validationResult.data],
				callbackErrors
			);

			// Build metadata based on observability configuration
			const metadata = buildMetadata({
				observability: agent.observability,
				startTime,
				totalInputTokens,
				totalOutputTokens,
				callbackErrors
			});

			return ok({
				output: validationResult.data,
				attempts: attempt,
				metadata,
			});
		}

		// Handle validation failure
		lastValidationError = validationResult.error;

		// Invoke onAttemptComplete callback with failure
		safeInvokeCallback(
			options.callbacks?.onAttemptComplete,
			[{...state}, false],
			callbackErrors
		);

		// Invoke onValidationFailure callback
		safeInvokeCallback(
			options.callbacks?.onValidationFailure,
			[{...state}, validationResult.error],
			callbackErrors
		);

		// Append assistant response to conversation history
		// response is guaranteed to be defined here because output was extracted from it
		conversationHistory.push({
			role: 'assistant',
			content: response!.content,
		});

		// Format validation errors for prompt using layer-specific context
		// Falls back to generic context if layer metadata is missing or empty
		const layerName = lastFailedLayer.name || 'validation';
		const layerDescription = lastFailedLayer.description || 'No description provided for validation layer';
		const formattedError = formatValidationErrorForPrompt(
			validationResult.error,
			layerName,
			layerDescription
		);

		// Check for cancellation before building error prompt
		if (options.signal?.aborted) {
			return err(createCancellationError(
				attempt,
				'prompt_generation',
				agent.observability,
				startTime,
				totalInputTokens,
				totalOutputTokens,
				callbackErrors
			));
		}

		// Build error prompt
		const errorPromptResult = await buildErrorPrompt(
			agent,
			formattedError,
			state,
		);

		if (isErr(errorPromptResult)) {
			return err({
				errors: errorPromptResult.error,
				metadata: buildMetadata({
					observability: agent.observability,
					startTime,
					totalInputTokens,
					totalOutputTokens,
					callbackErrors
				}),
			});
		}

		// Append error prompt to conversation history
		conversationHistory.push({
			role: 'user',
			content: errorPromptResult.data,
		});

		// Continue to next iteration
	}

	// Max attempts exceeded - all attempts failed validation
	// Invoke onFailure callback
	const maxAttemptsError: AgentError = {
		code: AGENT_ERROR_CODES.MAX_ATTEMPTS_EXCEEDED,
		severity: 'error',
		category: 'execution',
		context: {
			attempts: maxAttempts,
			maxAttempts,
			lastError: lastValidationError ? safeStringify(lastValidationError) : undefined,
		},
	};

	safeInvokeCallback(
		options.callbacks?.onFailure,
		[[maxAttemptsError]],
		callbackErrors
	);

	// Build metadata based on observability configuration
	const metadata = buildMetadata({
		observability: agent.observability,
		startTime,
		totalInputTokens,
		totalOutputTokens,
		callbackErrors
	});

	return err({
		errors: [maxAttemptsError],
		metadata,
	});
};
