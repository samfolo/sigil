/**
 * Type guards for agent errors
 */

import {isStructuredErrorArray} from '@sigil/src/common/errors/structured';

import {AGENT_ERROR_CODES} from './codes';
import type {AgentError, AgentErrorCategory, AgentErrorCode} from './types';

/**
 * Valid agent error codes for runtime validation
 */
const VALID_AGENT_ERROR_CODES = new Set(Object.values(AGENT_ERROR_CODES));

/**
 * Type guard to check if a value is an array of AgentError objects
 *
 * Performs runtime validation of the array structure and validates that
 * error codes match the agent domain to ensure type safety.
 *
 * @param value - Value to check
 * @returns True if value is AgentError[], false otherwise
 *
 * @example
 * ```typescript
 * if (isAgentErrorArray(result.error)) {
 *   console.log(formatAgentErrorsForDeveloper(result.error));
 * }
 * ```
 */
export const isAgentErrorArray = (value: unknown): value is AgentError[] => isStructuredErrorArray<AgentErrorCode, AgentErrorCategory, AgentError['context']>(
	value,
	VALID_AGENT_ERROR_CODES
);
