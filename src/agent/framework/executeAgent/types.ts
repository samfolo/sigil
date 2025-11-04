import type {AgentExecutionContext} from '@sigil/src/agent/framework/types';
import type {ValidationLayerMetadata, ValidationLayerResult} from '@sigil/src/agent/framework/validation';
import type {AgentError} from '@sigil/src/common/errors';

/**
 * Duration metrics for execution tracking
 */
export interface DurationMetrics {
	/**
	 * Execution start time from performance.now()
	 */
	startTime: number;
}

/**
 * Token count tracking
 */
export interface TokenMetrics {
	/**
	 * Total input tokens consumed
	 */
	input: number;

	/**
	 * Total output tokens generated
	 */
	output: number;

	/**
	 * Total tokens used to create cache entries
	 */
	cacheCreationInput?: number;

	/**
	 * Total tokens read from cache
	 */
	cacheReadInput?: number;
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
	tokens?: TokenMetrics;

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
	 * @param context - Execution context containing attempt number and max attempts
	 */
	onAttemptStart?: (context: AgentExecutionContext) => void;

	/**
	 * Called when an execution attempt completes
	 *
	 * @param context - Execution context containing attempt number and max attempts
	 * @param success - Whether the attempt succeeded validation
	 */
	onAttemptComplete?: (context: AgentExecutionContext, success: boolean) => void;

	/**
	 * Called when output validation fails
	 *
	 * @param context - Execution context containing attempt number and max attempts
	 * @param errors - Validation errors from the output schema
	 */
	onValidationFailure?: (context: AgentExecutionContext, errors: unknown) => void;

	/**
	 * Called when a validation layer starts execution
	 *
	 * @param context - Execution context containing attempt number and max attempts
	 * @param layer - Metadata about the layer being executed
	 */
	onValidationLayerStart?: (
		context: AgentExecutionContext,
		layer: ValidationLayerMetadata
	) => void;

	/**
	 * Called when a validation layer completes execution
	 *
	 * @param context - Execution context containing attempt number and max attempts
	 * @param layer - Result of the layer execution (discriminated union)
	 */
	onValidationLayerComplete?: (
		context: AgentExecutionContext,
		layer: ValidationLayerResult
	) => void;

	/**
	 * Called when a tool is invoked (before execution)
	 *
	 * Fires for helper tools, output tool (in reflection mode), and submit tool.
	 * Use for logging tool invocations or showing "Agent is using tool X" in UI.
	 *
	 * @param context - Execution context containing attempt number and max attempts
	 * @param toolName - Name of the tool being called
	 * @param toolInput - Input provided to the tool by the model
	 */
	onToolCall?: (
		context: AgentExecutionContext,
		toolName: string,
		toolInput: unknown
	) => void;

	/**
	 * Called when a tool execution completes (after execution)
	 *
	 * Fires for both successful tool executions and errors. Check the result string
	 * to determine if an error occurred (will contain "Error:" prefix for errors).
	 *
	 * @param context - Execution context containing attempt number and max attempts
	 * @param toolName - Name of the tool that was called
	 * @param toolResult - Result from the tool (or error message if execution failed)
	 */
	onToolResult?: (
		context: AgentExecutionContext,
		toolName: string,
		toolResult: string
	) => void;

	/**
	 * Called when agent execution succeeds
	 *
	 * @param output - The validated output from the agent
	 * @param metadata - Optional execution metadata including token usage and latency
	 */
	onSuccess?: (output: Output, metadata?: ExecuteMetadata) => void;

	/**
	 * Called when agent execution fails after all attempts
	 *
	 * @param errors - Array of AgentError describing what went wrong
	 * @param metadata - Optional execution metadata including token usage and latency
	 */
	onFailure?: (errors: AgentError[], metadata?: ExecuteMetadata) => void;
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
	 * Contains information about resource usage and performance
	 */
	metadata?: ExecuteMetadata;
}
