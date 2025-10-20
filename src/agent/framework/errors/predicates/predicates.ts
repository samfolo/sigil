/**
 * Type guards for agent errors
 */

import type {AgentError} from '@sigil/src/agent/framework/errors/types';

/**
 * Type guard to check if a value is an array of AgentError objects
 *
 * Performs runtime validation of the array structure to ensure type safety.
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
export const isAgentErrorArray = (value: unknown): value is AgentError[] => {
	if (!Array.isArray(value)) {
		return false;
	}

	if (value.length === 0) {
		return true;
	}

	// Check first element has required AgentError properties
	const firstItem = value.at(0);
	if (!firstItem || typeof firstItem !== 'object') {
		return false;
	}

	const hasRequiredProps =
		'code' in firstItem &&
		'severity' in firstItem &&
		'category' in firstItem &&
		'context' in firstItem;

	return hasRequiredProps;
};
