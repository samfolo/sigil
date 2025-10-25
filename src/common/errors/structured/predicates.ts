/**
 * Generic type guards for structured errors
 */

import type {StructuredError} from './types';

/**
 * Creates a type guard to check if a value is an array of structured errors
 *
 * Performs runtime validation of the array structure and validates that
 * error codes match the expected domain codes to ensure type safety.
 *
 * @param value - Value to check
 * @param validCodes - Set of valid error codes for this domain
 * @returns True if value is a non-empty array with required structured error properties
 *
 * @example
 * ```typescript
 * const VALID_CODES = new Set(Object.values(MY_ERROR_CODES));
 * const isMyErrorArray = isStructuredErrorArray(value, VALID_CODES);
 * if (isMyErrorArray) {
 *   console.log(value); // TypeScript knows this is StructuredError[]
 * }
 * ```
 */
export const isStructuredErrorArray = <Code extends string, Category extends string, Context>(
	value: unknown,
	validCodes: ReadonlySet<string>
): value is StructuredError<Code, Category, Context>[] => {
	if (!Array.isArray(value) || value.length === 0) {
		return false;
	}

	// Check first element has required StructuredError properties
	const firstItem = value.at(0);
	if (!firstItem || typeof firstItem !== 'object' || !('code' in firstItem)) {
		return false;
	}

	// Validate that the code matches one of the valid domain codes (O(1) lookup)
	return validCodes.has(firstItem.code as string);
};
