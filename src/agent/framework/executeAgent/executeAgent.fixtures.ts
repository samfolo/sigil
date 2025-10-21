/**
 * Test fixtures for agent execution system
 *
 * Comprehensive test cases covering:
 * - Minimal valid execution options
 * - Execution options with callbacks
 * - Execution options with maxAttempts override
 * - Success results with metadata
 * - Error scenarios (max attempts, validation failures, API errors)
 */

import type {AgentExecutionState} from '@sigil/src/agent/framework/types';
import type {
	ValidationLayerMetadata,
	ValidationLayerResult,
} from '@sigil/src/agent/framework/validation';
import type {AgentError} from '@sigil/src/common/errors';
import {AGENT_ERROR_CODES} from '@sigil/src/common/errors';


import type {
	ExecuteCallbacks,
	ExecuteOptions,
	ExecuteSuccess,
} from './executeAgent';

/**
 * Simple output interface matching the test agent's output schema
 */
interface TestOutput {
	result: string;
}

/**
 * Callback invocation record for onAttemptStart
 */
interface OnAttemptStartInvocation {
	type: 'onAttemptStart';
	state: AgentExecutionState;
}

/**
 * Callback invocation record for onAttemptComplete
 */
interface OnAttemptCompleteInvocation {
	type: 'onAttemptComplete';
	state: AgentExecutionState;
	success: boolean;
}

/**
 * Callback invocation record for onValidationFailure
 */
interface OnValidationFailureInvocation {
	type: 'onValidationFailure';
	errors: unknown;
	state: AgentExecutionState;
}

/**
 * Callback invocation record for onSuccess
 */
interface OnSuccessInvocation {
	type: 'onSuccess';
	output: TestOutput;
}

/**
 * Callback invocation record for onFailure
 */
interface OnFailureInvocation {
	type: 'onFailure';
	errors: AgentError[];
}

/**
 * Callback invocation record for onValidationLayerStart
 */
interface OnValidationLayerStartInvocation {
	type: 'onValidationLayerStart';
	layer: ValidationLayerMetadata;
	state: AgentExecutionState;
}

/**
 * Callback invocation record for onValidationLayerComplete
 */
interface OnValidationLayerCompleteInvocation {
	type: 'onValidationLayerComplete';
	layer: ValidationLayerResult;
	state: AgentExecutionState;
}

/**
 * Discriminated union of all callback invocation types
 *
 * Tracks which callback was invoked and the arguments passed to it.
 * Maintains order of invocations for verifying callback sequence.
 */
export type CallbackInvocation =
	| OnAttemptStartInvocation
	| OnAttemptCompleteInvocation
	| OnValidationFailureInvocation
	| OnSuccessInvocation
	| OnFailureInvocation
	| OnValidationLayerStartInvocation
	| OnValidationLayerCompleteInvocation;

/**
 * Return type for createExecuteOptionsWithCallbackTracking factory
 */
export interface ExecuteOptionsWithCallbackTracking {
	/**
	 * Execution options configured with callback tracking
	 */
	options: ExecuteOptions<string, TestOutput>;

	/**
	 * Array of callback invocations in order
	 */
	invocations: CallbackInvocation[];
}

/**
 * 1. Minimal valid execution options - simplest possible configuration
 *
 * Basic string input with no maxAttempts override or callbacks.
 * Used with VALID_MINIMAL_AGENT from defineAgent fixtures in tests.
 */
export const VALID_EXECUTE_OPTIONS: ExecuteOptions<string, TestOutput> = {
	input: 'test input',
};

/**
 * 2. Factory for execution options with callback tracking
 *
 * Creates fresh execution options with callbacks that record all invocations.
 * Each invocation is pushed to the array in order, preserving call sequence.
 * Tests can filter by type to count specific callback invocations.
 *
 * @returns Object containing execution options and invocations array
 *
 * @example
 * ```typescript
 * const {options, invocations} = createExecuteOptionsWithCallbackTracking();
 * await executeAgent(agent, options);
 *
 * // Count specific callback types
 * const attemptStarts = invocations.filter(i => i.type === 'onAttemptStart');
 * expect(attemptStarts.length).toBe(3);
 *
 * // Verify callback order
 * expect(invocations.at(0)?.type).toBe('onAttemptStart');
 * expect(invocations.at(-1)?.type).toBe('onSuccess');
 * ```
 */
export const createExecuteOptionsWithCallbackTracking =
	(): ExecuteOptionsWithCallbackTracking => {
	const invocations: CallbackInvocation[] = [];

	const callbacks: ExecuteCallbacks<TestOutput> = {
		onAttemptStart: (state) => {
			invocations.push({
				type: 'onAttemptStart',
				state,
			});
		},
		onAttemptComplete: (state, success) => {
			invocations.push({
				type: 'onAttemptComplete',
				state,
				success,
			});
		},
		onValidationFailure: (errors, state) => {
			invocations.push({
				type: 'onValidationFailure',
				errors,
				state,
			});
		},
		onValidationLayerStart: (layer, state) => {
			invocations.push({
				type: 'onValidationLayerStart',
				layer,
				state,
			});
		},
		onValidationLayerComplete: (layer, state) => {
			invocations.push({
				type: 'onValidationLayerComplete',
				layer,
				state,
			});
		},
		onSuccess: (output) => {
			invocations.push({
				type: 'onSuccess',
				output,
			});
		},
		onFailure: (errors) => {
			invocations.push({
				type: 'onFailure',
				errors,
			});
		},
	};

	return {
		options: {
			input: 'test input with callbacks',
			callbacks,
		},
		invocations,
	};
};

/**
 * 3. Execution options with maxAttempts override
 *
 * Overrides the agent's default maxAttempts (3 in VALID_MINIMAL_AGENT) to 5.
 */
export const VALID_EXECUTE_OPTIONS_WITH_MAX_ATTEMPTS_OVERRIDE: ExecuteOptions<
	string,
	TestOutput
> = {
	input: 'test input',
	maxAttempts: 5,
};

/**
 * 4. Expected success result - successful execution on first attempt
 *
 * Represents a successful execution with:
 * - Valid output matching the agent's output schema
 * - Single attempt (no retries needed)
 * - Sample metadata for cost, latency, and token usage
 *
 * Note: This is the success data structure, not wrapped in ok().
 * Tests wrap it with ok() as needed.
 */
export const EXPECTED_SUCCESS: ExecuteSuccess<TestOutput> = {
	output: {result: 'success result'},
	attempts: 1,
	metadata: {
		cost: 0.05,
		latency: 2500,
		tokens: {
			input: 100,
			output: 50,
		},
	},
};

/**
 * 5. Expected max attempts exceeded error
 *
 * Represents failure after exhausting all retry attempts.
 * Occurs when the agent fails validation on every attempt.
 *
 * Context includes:
 * - attempts: Final attempt number when max was reached
 * - maxAttempts: The configured limit
 *
 * Note: This is an error array, not wrapped in err().
 * Tests wrap it with err() as needed.
 */
export const EXPECTED_MAX_ATTEMPTS_ERROR: AgentError[] = [
	{
		code: AGENT_ERROR_CODES.MAX_ATTEMPTS_EXCEEDED,
		severity: 'error',
		category: 'execution',
		context: {
			attempts: 3,
			maxAttempts: 3,
		},
	},
];

/**
 * 6. Expected validation failed error
 *
 * Represents failure during output validation on a specific attempt.
 * Can occur at either Zod schema validation or custom validator layer.
 *
 * Context includes:
 * - layer: Which validation layer failed ('zod' or 'custom')
 * - attempt: Which attempt number encountered the failure
 *
 * Note: This is an error array, not wrapped in err().
 * Tests wrap it with err() as needed.
 */
export const EXPECTED_VALIDATION_FAILED_ERROR: AgentError[] = [
	{
		code: AGENT_ERROR_CODES.VALIDATION_FAILED,
		severity: 'error',
		category: 'execution',
		context: {
			layer: 'zod',
			attempt: 2,
		},
	},
];

/**
 * 7. Expected API error
 *
 * Represents failure when calling the language model API.
 * Common causes: network issues, service outages, invalid credentials.
 *
 * Context includes:
 * - statusCode: HTTP status code from the API
 * - message: Human-readable error message
 *
 * Note: This is an error array, not wrapped in err().
 * Tests wrap it with err() as needed.
 */
export const EXPECTED_API_ERROR: AgentError[] = [
	{
		code: AGENT_ERROR_CODES.API_ERROR,
		severity: 'error',
		category: 'model',
		context: {
			statusCode: 500,
			message: 'Internal server error',
		},
	},
];
