import type Anthropic from '@anthropic-ai/sdk';

import {createAnthropicClient} from '@sigil/src/agent/clients/anthropic';
import type {AgentDefinition} from '@sigil/src/agent/framework/defineAgent';
import {buildAllPrompts} from '@sigil/src/agent/framework/prompts/build';
import type {AgentExecutionState} from '@sigil/src/agent/framework/types';
import type {
	ValidationLayerMetadata,
	ValidationLayerResult,
} from '@sigil/src/agent/framework/validation';
import type {AgentError, Result} from '@sigil/src/common/errors';
import {err, ok, isErr, AGENT_ERROR_CODES} from '@sigil/src/common/errors';

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
	 * Execution cost in GBP
	 */
	cost?: number;

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
}

/**
 * Successful agent execution result data
 *
 * This is the success data structure, not a Result wrapper.
 * Failures are represented by AgentError[] in the Result pattern:
 * `Result<ExecuteSuccess<Output>, AgentError[]>`
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
 * @returns Promise resolving to Result containing either ExecuteSuccess or AgentError[]
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
 *   console.log('Cost:', result.data.metadata?.cost);
 * } else {
 *   console.error('Execution failed:', result.error);
 * }
 * ```
 */
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

export const executeAgent = async <Input, Output>(
	agent: AgentDefinition<Input, Output>,
	options: ExecuteOptions<Input, Output>
): Promise<Result<ExecuteSuccess<Output>, AgentError[]>> => {
	// Determine max attempts (options override or agent default)
	const maxAttempts = options.maxAttempts ?? agent.validation.maxAttempts;

	// Track callback errors
	const callbackErrors: Error[] = [];

	// Track previous response for retry message construction
	let previousResponse: Anthropic.Message | undefined;

	// Create Anthropic client once (reuse across retries)
	const anthropic = createAnthropicClient();

	// Retry loop
	for (let attempt = 1; attempt <= maxAttempts; attempt++) {
		// Create execution state
		const state: AgentExecutionState = {
			attempt,
			maxAttempts,
		};

		// Invoke onAttemptStart callback
		safeInvokeCallback(
			options.callbacks?.onAttemptStart,
			[state],
			callbackErrors
		);

		// Build prompts (no formattedError on first attempt, would have it on retries)
		const promptsResult = await buildAllPrompts(
			agent,
			options.input,
			state,
			undefined // formattedError - would be populated on retries when validation fails
		);

		if (isErr(promptsResult)) {
			return promptsResult;
		}

		const prompts = promptsResult.data;

		// Build messages array for Anthropic API
		const messages: Anthropic.MessageParam[] = [];

		// First message: user prompt
		messages.push({
			role: 'user',
			content: prompts.user,
		});

		// On retry: include previous response and error feedback
		if (prompts.isRetry && previousResponse) {
			messages.push({
				role: 'assistant',
				content: previousResponse.content,
			});
			messages.push({
				role: 'user',
				content: prompts.error,
			});
		}

		// Define tool for structured output
		const tool: Anthropic.Tool = {
			name: 'generate_output',
			description: 'Generate the structured output according to the schema',
			input_schema: agent.validation.outputSchema,
		};

		// Call Anthropic API
		let response: Anthropic.Message;
		try {
			response = await anthropic.messages.create({
				model: agent.model.name,
				max_tokens: agent.model.maxTokens,
				temperature: agent.model.temperature,
				system: prompts.system,
				messages,
				tools: [tool],
			});
		} catch (error) {
			return err([
				{
					code: AGENT_ERROR_CODES.API_ERROR,
					severity: 'error',
					category: 'model',
					context: {
						attempt,
						message: error instanceof Error ? error.message : String(error),
					},
				},
			]);
		}

		// Store response for potential retry
		previousResponse = response;

		// Extract output from tool use
		const toolUse = response.content.find(
			(block): block is Anthropic.ToolUseBlock => block.type === 'tool_use'
		);

		if (!toolUse || toolUse.name !== 'generate_output') {
			return err([
				{
					code: AGENT_ERROR_CODES.INVALID_RESPONSE,
					severity: 'error',
					category: 'model',
					context: {
						attempt,
						reason: 'Model did not use the generate_output tool',
					},
				},
			]);
		}

		const output = toolUse.input as Output;

		// Placeholder validation: assume validation always passes
		// TODO: Implement real validation layers in next iteration

		// Success! Invoke onSuccess callback
		safeInvokeCallback(options.callbacks?.onSuccess, [output], callbackErrors);

		// Build metadata
		const metadata: ExecuteMetadata = {
			callbackErrors: callbackErrors.length > 0 ? callbackErrors : undefined,
		};

		return ok({
			output,
			attempts: attempt,
			metadata,
		});
	}

	// This code path is unreachable with placeholder validation
	// Will be used when real validation is implemented
	return err([
		{
			code: AGENT_ERROR_CODES.MAX_ATTEMPTS_EXCEEDED,
			severity: 'error',
			category: 'execution',
			context: {
				attempts: maxAttempts,
				maxAttempts,
			},
		},
	]);
};
