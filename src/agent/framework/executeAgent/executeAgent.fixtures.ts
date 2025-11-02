/**
 * Test fixtures for agent execution system
 *
 * Comprehensive test cases covering:
 * - Minimal valid execution options
 * - Execution options with maxAttempts override
 * - Success results with metadata
 * - Error scenarios (max attempts, validation failures, API errors)
 */

import {AGENT_ERROR_CODES} from '@sigil/src/common/errors';


import type {
	ExecuteFailure,
	ExecuteOptions,
	ExecuteSuccess,
} from './types';

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
 * 2. Execution options with maxAttempts override
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
 * 3. Expected success result - successful execution on first attempt
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
 * 4. Expected max attempts exceeded error
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
 * 5. Expected validation failed error
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
 * 6. Expected API error
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
 * Creates a successful API response
 *
 * Helper to construct a mock API response with valid tool_use output.
 * Used in tests to simulate successful agent executions.
 *
 * @param result - The result value to include in the response
 * @param inputTokens - Number of input tokens consumed
 * @param outputTokens - Number of output tokens generated
 * @param toolName - Name of the tool to use (defaults to 'generate_output')
 * @returns Mock API response object
 */
export const createSuccessResponse = (
	result = 'success result',
	inputTokens = 100,
	outputTokens = 50,
	toolName = 'generate_output'
) => ({
	id: 'msg_test123',
	type: 'message' as const,
	role: 'assistant' as const,
	model: 'claude-sonnet-4-5-20250929',
	content: [
		{
			type: 'tool_use' as const,
			id: 'toolu_test123',
			name: toolName,
			input: {result},
		},
	],
	stop_reason: 'tool_use' as const,
	stop_sequence: null,
	usage: {
		input_tokens: inputTokens,
		output_tokens: outputTokens,
	},
});

/**
 * Creates API response with submit tool use
 *
 * Returns a response where the model calls the submit tool to finalise output.
 * Used to test reflection mode termination.
 *
 * @param inputTokens - Number of input tokens consumed
 * @param outputTokens - Number of output tokens generated
 * @returns Mock API response object
 */
export const createSubmitToolResponse = (
	inputTokens: number = 100,
	outputTokens: number = 50
) => ({
	id: 'msg_submit',
	type: 'message' as const,
	role: 'assistant' as const,
	model: 'claude-sonnet-4-5-20250929',
	content: [
		{
			type: 'tool_use' as const,
			id: 'toolu_submit',
			name: 'submit',
			input: {},
		},
	],
	stop_reason: 'tool_use' as const,
	stop_sequence: null,
	usage: {
		input_tokens: inputTokens,
		output_tokens: outputTokens,
	},
});
