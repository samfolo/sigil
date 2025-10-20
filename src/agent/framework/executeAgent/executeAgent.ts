import type {AgentError} from '@sigil/src/common/errors';

import type {AgentExecutionState} from '@sigil/src/agent/framework/defineAgent/defineAgent';

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
	 * @param errors - Validation errors from the output schema
	 * @param state - Execution state containing attempt number and max attempts
	 */
	onValidationFailure?: (errors: unknown, state: AgentExecutionState) => void;

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
