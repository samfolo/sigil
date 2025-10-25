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

import {vi} from 'vitest';

import type {AgentExecutionState} from '@sigil/src/agent/framework/types';
import type {
	ValidationLayerMetadata,
	ValidationLayerResult,
} from '@sigil/src/agent/framework/validation';
import type {AgentError} from '@sigil/src/common/errors';
import {AGENT_ERROR_CODES} from '@sigil/src/common/errors';


import type {
	ExecuteCallbacks,
	ExecuteFailure,
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
		onValidationFailure: (state, errors) => {
			invocations.push({
				type: 'onValidationFailure',
				errors,
				state,
			});
		},
		onValidationLayerStart: (state, layer) => {
			invocations.push({
				type: 'onValidationLayerStart',
				layer,
				state,
			});
		},
		onValidationLayerComplete: (state, layer) => {
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
 * - Sample metadata for latency and token usage
 *
 * Note: This is the success data structure, not wrapped in ok().
 * Tests wrap it with ok() as needed.
 */
export const EXPECTED_SUCCESS: ExecuteSuccess<TestOutput> = {
	output: {result: 'success result'},
	attempts: 1,
	metadata: {
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
 * Note: This is an ExecuteFailure structure, not wrapped in err().
 * Tests wrap it with err() as needed.
 */
export const EXPECTED_MAX_ATTEMPTS_ERROR: ExecuteFailure = {
	errors: [
		{
			code: AGENT_ERROR_CODES.MAX_ATTEMPTS_EXCEEDED,
			severity: 'error',
			category: 'execution',
			context: {
				attempts: 3,
				maxAttempts: 3,
			},
		},
	],
	metadata: {
		latency: 5000,
		tokens: {
			input: 300,
			output: 150,
		},
	},
};

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
 * Note: This is an ExecuteFailure structure, not wrapped in err().
 * Tests wrap it with err() as needed.
 */
export const EXPECTED_VALIDATION_FAILED_ERROR: ExecuteFailure = {
	errors: [
		{
			code: AGENT_ERROR_CODES.VALIDATION_FAILED,
			severity: 'error',
			category: 'execution',
			context: {
				layer: 'zod',
				attempt: 2,
			},
		},
	],
	metadata: {
		latency: 2000,
		tokens: {
			input: 200,
			output: 100,
		},
	},
};

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
 * Note: This is an ExecuteFailure structure, not wrapped in err().
 * Tests wrap it with err() as needed.
 */
export const EXPECTED_API_ERROR: ExecuteFailure = {
	errors: [
		{
			code: AGENT_ERROR_CODES.API_ERROR,
			severity: 'error',
			category: 'model',
			context: {
				statusCode: 500,
				message: 'Internal server error',
			},
		},
	],
	metadata: {
		latency: 1000,
		tokens: {
			input: 0,
			output: 0,
		},
	},
};

/**
 * Mock API call configuration
 *
 * Discriminated union representing different response types for mock API calls.
 * Used with createMockApiCalls to configure sequential API responses in tests.
 */
export type MockCallConfig =
	| {
			type: 'success';
			result?: string;
			inputTokens?: number;
			outputTokens?: number;
			delay?: number;
	  }
	| {
			type: 'invalid';
			inputTokens?: number;
			outputTokens?: number;
			delay?: number;
	  }
	| {
			type: 'error';
			error: Error;
			delay?: number;
	  }
	| {
			type: 'custom';
			response: any;
			delay?: number;
	  };

/**
 * Creates a mock API function with sequential responses
 *
 * Generates a vi.fn() mock that returns different responses on each call.
 * The final config entry persists for all subsequent calls beyond the array length.
 *
 * @param configs - Array of response configurations
 * @returns Configured vi.fn() mock
 *
 * @example
 * ```typescript
 * // Simple retry scenario
 * mockMessagesCreate = createMockApiCalls([
 *   {type: 'invalid'},
 *   {type: 'success', result: 'valid result that is long enough'}
 * ]);
 *
 * // Token accumulation test
 * mockMessagesCreate = createMockApiCalls([
 *   {type: 'invalid', inputTokens: 100, outputTokens: 50},
 *   {type: 'success', result: 'valid result', inputTokens: 150, outputTokens: 75}
 * ]);
 *
 * // Latency measurement
 * mockMessagesCreate = createMockApiCalls([
 *   {type: 'invalid', delay: 50},
 *   {type: 'success', result: 'valid result', delay: 50}
 * ]);
 * ```
 */
export const createMockApiCalls = (configs: MockCallConfig[]) => {
	const mock = vi.fn();
	let callIndex = 0;

	mock.mockImplementation(async () => {
		const config = configs[Math.min(callIndex++, configs.length - 1)];

		if (config.delay) {
			await new Promise((resolve) => {
				setTimeout(resolve, config.delay);
			});
		}

		if (config.type === 'error') {
			throw config.error;
		}

		if (config.type === 'custom') {
			return config.response;
		}

		if (config.type === 'invalid') {
			return createInvalidResponse(
				config.inputTokens ?? 100,
				config.outputTokens ?? 50
			);
		}

		// success
		return createSuccessResponse(
			config.result ?? 'success result',
			config.inputTokens ?? 100,
			config.outputTokens ?? 50
		);
	});

	return mock;
};
