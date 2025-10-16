/**
 * Exception class for spec processing errors
 *
 * IMPORTANT: This exception should ONLY be used at React error boundaries and
 * tool result conversion points to convert Result<T, SpecError[]> errors into
 * thrown exceptions.
 *
 * Internal code should use Result<T, SpecError[]> for error handling. Only throw
 * this exception when crossing boundaries that require exceptions (React error
 * boundaries, external tool APIs, etc.).
 *
 * @example
 * ```typescript
 * // Internal code uses Result
 * const result = processSpec(spec);
 * if (isErr(result)) {
 *   return result; // Return error, don't throw
 * }
 *
 * // Only throw at boundaries
 * const result = processSpec(spec);
 * if (isErr(result)) {
 *   throw new SpecProcessingError(result.error); // Convert to exception at boundary
 * }
 * ```
 */

import type {SpecError} from './types';

/**
 * Exception thrown when spec processing fails
 *
 * Contains structured error information for debugging and error reporting.
 * Use only at React/tool boundaries, not for internal error handling.
 */
export class SpecProcessingError extends Error {
	/**
	 * Structured errors that caused the processing failure
	 */
	public readonly errors: SpecError[];

	constructor(errors: SpecError[], message?: string) {
		super(message ?? `Spec processing failed with ${errors.length} error(s)`);
		this.name = 'SpecProcessingError';
		this.errors = errors;
	}
}
