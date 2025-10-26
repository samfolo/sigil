/**
 * Common test fixtures and setup for executeAgent test suite
 *
 * This file provides shared setup functions and re-exports
 * of fixtures used across all executeAgent test files.
 */

import type {Mock} from 'vitest';

import {createSuccessResponse} from './executeAgent.fixtures';

/**
 * Setup function for beforeEach hooks in test files
 *
 * Resets the mock and sets default successful response.
 * Call this in beforeEach of every test file with your mockMessagesCreate.
 *
 * @example
 * ```typescript
 * beforeEach(() => {
 *   setupExecuteAgentMocks(mockMessagesCreate);
 * });
 * ```
 */
export const setupExecuteAgentMocks = (mockMessagesCreate: Mock) => {
	mockMessagesCreate.mockReset();
	mockMessagesCreate.mockResolvedValue(createSuccessResponse());
};

/**
 * Re-export agent fixtures for use in tests
 */
export {
	VALID_MINIMAL_AGENT,
	VALID_COMPLETE_AGENT,
	AGENT_WITH_HELPER_TOOLS,
	AGENT_WITH_FAILING_HELPER,
	AGENT_WITH_MULTIPLE_HELPERS,
	AGENT_WITH_REFLECTION,
	AGENT_WITH_REJECTING_REFLECTION,
	AGENT_WITH_HELPERS_AND_REFLECTION,
	AGENT_WITH_THROWING_HELPER,
	AGENT_WITH_THROWING_REFLECTION,
	AGENT_WITH_DEFAULT_ITERATION_LIMIT,
} from '../defineAgent/defineAgent.fixtures';

/**
 * Re-export execution fixtures for use in tests
 */
export {
	VALID_EXECUTE_OPTIONS,
	VALID_EXECUTE_OPTIONS_WITH_MAX_ATTEMPTS_OVERRIDE,
	EXPECTED_SUCCESS,
	createExecuteOptionsWithCallbackTracking,
	createSuccessResponse,
	createInvalidResponse,
	createMockApiCalls,
	createHelperToolResponse,
	createSubmitToolResponse,
	createOutputThenSubmitResponse,
	createSubmitBeforeOutputResponse,
	createMixedToolResponse,
} from './executeAgent.fixtures';

/**
 * Re-export executeAgent function
 */
export {executeAgent} from './executeAgent';

/**
 * Re-export constants
 */
export {DEFAULT_MAX_ITERATIONS} from '../common';

/**
 * Re-export error codes and Result utilities
 */
export {
	isOk,
	isErr,
	AGENT_ERROR_CODES,
} from '@sigil/src/common/errors';
