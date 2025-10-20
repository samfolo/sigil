/**
 * Generic type guards for structured errors
 */

import type {StructuredError} from './types';

/**
 * Creates a type guard to check if a value is an array of structured errors
 *
 * Performs runtime validation of the array structure to ensure type safety.
 *
 * @param value - Value to check
 * @returns True if value is a non-empty array with required structured error properties
 *
 * @example
 * ```typescript
 * const isMyErrorArray = isStructuredErrorArray(value);
 * if (isMyErrorArray) {
 *   console.log(value); // TypeScript knows this is StructuredError[]
 * }
 * ```
 */
export const isStructuredErrorArray = <Code extends string, Category extends string, Context>(
	value: unknown
): value is StructuredError<Code, Category, Context>[] => {
	if (!Array.isArray(value)) {
		return false;
	}

	if (value.length === 0) {
		return true;
	}

	// Check first element has required StructuredError properties
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
