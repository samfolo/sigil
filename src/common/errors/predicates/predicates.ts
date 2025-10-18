/**
 * Type guard predicates for error types
 */

import type {SpecError} from '../types';

/**
 * Type guard to check if error is SpecError array
 *
 * Useful at boundaries handling Result<T, SpecError[] | string>
 *
 * @param error - Error value to check
 * @returns true if error is non-empty SpecError array
 */
export const isSpecErrorArray = (error: unknown): error is SpecError[] => {
	return (
		Array.isArray(error) &&
		error.length > 0 &&
		typeof error[0] === 'object' &&
		error[0] !== null &&
		'code' in error[0]
	);
};
