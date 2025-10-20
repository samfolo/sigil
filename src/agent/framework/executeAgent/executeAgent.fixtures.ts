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
 * 1. Minimal valid execution options - simplest possible configuration
 *
 * Basic string input with no maxAttempts override or callbacks.
 * Used with VALID_MINIMAL_AGENT from defineAgent fixtures in tests.
 */
export const VALID_EXECUTE_OPTIONS: ExecuteOptions<string, TestOutput> = {
	input: 'test input',
};

/**
 * 2. Execution options with all callbacks defined
 *
 * Demonstrates callback instrumentation for monitoring execution progress.
 * Each callback tracks invocations for test verification.
 */
export const VALID_EXECUTE_OPTIONS_WITH_CALLBACKS: ExecuteOptions<
	string,
	TestOutput
> = (() => {
	const callbackInvocations = {
		attemptStarts: 0,
		attemptCompletes: 0,
		validationFailures: 0,
		successes: 0,
		failures: 0,
	};

	const callbacks: ExecuteCallbacks<TestOutput> = {
		onAttemptStart: () => {
			callbackInvocations.attemptStarts += 1;
		},
		onAttemptComplete: () => {
			callbackInvocations.attemptCompletes += 1;
		},
		onValidationFailure: () => {
			callbackInvocations.validationFailures += 1;
		},
		onSuccess: () => {
			callbackInvocations.successes += 1;
		},
		onFailure: () => {
			callbackInvocations.failures += 1;
		},
	};

	return {
		input: 'test input with callbacks',
		callbacks,
	};
})();

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
