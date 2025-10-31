import type Anthropic from '@anthropic-ai/sdk';

import type {AgentDefinition} from '@sigil/src/agent/framework/defineAgent';
import type {AgentState, AgentExecutionContext} from '@sigil/src/agent/framework/types';
import {isErr} from '@sigil/src/common/errors';

import type {ExecuteCallbacks} from '../executeAgent';
import {formatReflectionHandlerResult, safeInvokeCallback} from '../util';

/**
 * Result of processing tool uses from a model response
 *
 * Contains tool results to send back to the model, termination flags,
 * and updated state after all tool handlers have executed.
 *
 * @template Output - The type of validated output the agent produces
 * @template Run - The type of run state (persists across attempts)
 * @template Attempt - The type of attempt state (resets each attempt)
 */
export interface ProcessToolUsesResult<Output, Run extends object, Attempt extends object> {
	/**
	 * Tool results to append to conversation history
	 *
	 * Each result corresponds to a tool use block from the model response.
	 * Array may be empty if only termination tools (submit/output) were called.
	 */
	toolResults: Anthropic.ToolResultBlockParam[];

	/**
	 * Whether the submit tool was called during processing
	 *
	 * In reflection mode, submit signals that the model is satisfied with
	 * its output and ready for validation. Iteration should terminate.
	 */
	wasSubmitFound: boolean;

	/**
	 * Whether the output tool was called during processing
	 *
	 * In non-reflection mode, output tool call terminates iteration immediately.
	 * In reflection mode, output can be called multiple times before submit.
	 */
	wasOutputFound: boolean;

	/**
	 * Input from the most recent output tool call
	 *
	 * This is the candidate output that will be validated. May be undefined
	 * if output tool was never called in this iteration.
	 */
	lastOutputToolInput: Output | undefined;

	/**
	 * Updated run state after all tool handlers executed
	 *
	 * Run state persists across retry attempts. Helper tools can modify it
	 * via their handlers (e.g., storing parsed data for use in subsequent tools).
	 */
	updatedRunState: Run;

	/**
	 * Updated attempt state after all tool handlers executed
	 *
	 * Attempt state resets each retry attempt. Helper tools can modify it
	 * within a single attempt (e.g., tracking intermediate computation results).
	 */
	updatedAttemptState: Attempt;
}

/**
 * Parameters for processing tool uses
 *
 * @template Input - The type of input data the agent accepts
 * @template Output - The type of validated output the agent produces
 * @template Run - The type of run state (persists across attempts)
 * @template Attempt - The type of attempt state (resets each attempt)
 */
export interface ProcessToolUsesParams<Input, Output, Run extends object, Attempt extends object> {
	/**
	 * Tool use blocks extracted from the model response
	 */
	toolUses: Anthropic.ToolUseBlock[];

	/**
	 * Agent definition containing tool configurations and handlers
	 */
	agent: AgentDefinition<Input, Output, Run, Attempt>;

	/**
	 * Current execution context (attempt, iteration numbers, etc.)
	 */
	context: AgentExecutionContext;

	/**
	 * State tier containing run and attempt state
	 */
	state: {
		/**
		 * Current agent state containing run, attempt, and context tiers
		 */
		current: AgentState<Run, Attempt>;

		/**
		 * Run state reference (mutated via Object.assign for persistence)
		 */
		run: Run;
	};

	/**
	 * Whether reflection mode is enabled (has reflectionHandler)
	 */
	isReflectionEnabled: boolean;

	/**
	 * Most recent output tool input (tracks across multiple output calls)
	 */
	lastOutputToolInput: Output | undefined;

	/**
	 * Submit tool definition for reflection mode
	 */
	submitTool: Anthropic.Tool;

	/**
	 * Callback functions for observability
	 */
	callbacks: {
		/**
		 * Callback to invoke before tool execution
		 */
		onToolCall?: ExecuteCallbacks<Output>['onToolCall'];

		/**
		 * Callback to invoke after tool execution
		 */
		onToolResult?: ExecuteCallbacks<Output>['onToolResult'];
	};

	/**
	 * Array to collect callback errors (mutated in place)
	 */
	callbackErrors: Error[];
}

/**
 * Processes all tool uses from a model response
 *
 * Handles three types of tools in a single pass:
 * - Submit tool: Signals readiness for validation (reflection mode only)
 * - Output tool: Contains candidate output for validation
 * - Helper tools: Provide data or computation results to the model
 *
 * Maintains exact execution order and callback timing:
 * 1. onToolCall callback before execution
 * 2. Tool handler execution with exception safety
 * 3. onToolResult callback after execution
 * 4. State updates (Object.assign for run, direct replacement for attempt)
 *
 * @param params - Processing parameters including tool uses, agent config, and state
 * @returns Result containing tool results array, termination flags, and updated states
 */
export const processToolUses = <Input, Output, Run extends object, Attempt extends object>(
	params: ProcessToolUsesParams<Input, Output, Run, Attempt>
): ProcessToolUsesResult<Output, Run, Attempt> => {
	const toolResults: Anthropic.ToolResultBlockParam[] = [];
	let wasSubmitFound = false;
	let wasOutputFound = false;
	let lastOutputToolInput = params.lastOutputToolInput;
	let currentState = params.state.current;

	for (const toolUse of params.toolUses) {
		// Check for submit tool
		if (toolUse.name === params.submitTool.name) {
			wasSubmitFound = true;
			// Fire callback for submit tool
			safeInvokeCallback(
				params.callbacks.onToolCall,
				[{...params.context}, toolUse.name, toolUse.input],
				params.callbackErrors
			);
			// Fire callback for submit tool result
			safeInvokeCallback(
				params.callbacks.onToolResult,
				[{...params.context}, toolUse.name, ''],
				params.callbackErrors
			);
			// Submit tool has no result (termination signal only)
			continue;
		}

		// Check for output tool
		if (toolUse.name === params.agent.tools.output.name) {
			wasOutputFound = true;
			lastOutputToolInput = toolUse.input as Output;

			// Fire callback before execution
			safeInvokeCallback(
				params.callbacks.onToolCall,
				[{...params.context}, toolUse.name, toolUse.input],
				params.callbackErrors
			);

			if (params.isReflectionEnabled) {
				// Execute reflection handler with exception safety
				try {
					const handlerResult = params.agent.tools.output.reflectionHandler!(lastOutputToolInput);
					const formatted = formatReflectionHandlerResult(handlerResult);

					toolResults.push({
						type: 'tool_result',
						tool_use_id: toolUse.id,
						content: formatted.content,
						is_error: formatted.is_error,
					});

					// Fire callback with result
					safeInvokeCallback(
						params.callbacks.onToolResult,
						[{...params.context}, toolUse.name, formatted.content],
						params.callbackErrors
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
						params.callbacks.onToolResult,
						[{...params.context}, toolUse.name, errorContent],
						params.callbackErrors
					);
				}
			}
			// In non-reflection mode, output tool doesn't produce a result
			continue;
		}

		// Handle helper tools via handler lookup
		// Fire callback before execution
		safeInvokeCallback(
			params.callbacks.onToolCall,
			[{...params.context}, toolUse.name, toolUse.input],
			params.callbackErrors
		);

		// Look up tool handler
		const tool = params.agent.tools.helpers?.[toolUse.name];
		if (!tool) {
			const errorContent = `Unknown tool: ${toolUse.name}`;
			toolResults.push({
				type: 'tool_result',
				tool_use_id: toolUse.id,
				content: errorContent,
				is_error: true,
			});
			safeInvokeCallback(
				params.callbacks.onToolResult,
				[{...params.context}, toolUse.name, errorContent],
				params.callbackErrors
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
					params.callbacks.onToolResult,
					[{...params.context}, toolUse.name, errorContent],
					params.callbackErrors
				);
			} else {
				// Extract new run state from handler result
				const newRun = handlerResult.data.newState.run;

				/**
				 * Use Object.assign to persist run state updates across retry attempts.
				 * This merge strategy allows handlers to add/update properties while
				 * preventing them from deleting existing state. Values are shallow-copied,
				 * creating defensive separation from handler-returned references.
				 */
				Object.assign(params.state.run, newRun);

				/**
				 * Create fresh currentState with framework-managed context.
				 * Handlers return {run, attempt} - framework adds context automatically.
				 */
				currentState = {
					context: params.context,
					run: params.state.run,
					attempt: handlerResult.data.newState.attempt,
				};
				const formattedResult = JSON.stringify(handlerResult.data.toolResult);
				toolResults.push({
					type: 'tool_result',
					tool_use_id: toolUse.id,
					content: formattedResult,
					is_error: false,
				});
				safeInvokeCallback(
					params.callbacks.onToolResult,
					[{...params.context}, toolUse.name, formattedResult],
					params.callbackErrors
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
				params.callbacks.onToolResult,
				[{...params.context}, toolUse.name, errorContent],
				params.callbackErrors
			);
		}
	}

	return {
		toolResults,
		wasSubmitFound,
		wasOutputFound,
		lastOutputToolInput,
		updatedRunState: params.state.run,
		updatedAttemptState: currentState.attempt,
	};
};
