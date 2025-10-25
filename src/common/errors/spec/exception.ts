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

import {StructuredErrorException} from '@sigil/src/common/errors/structured';

import {formatSpecError, formatSpecErrorsForModel} from './formatter';
import type {SpecError, SpecErrorCategory, SpecErrorCode} from './types';

/**
 * Exception thrown when spec processing fails
 *
 * Contains structured error information for debugging and error reporting.
 * Use only at React/tool boundaries, not for internal error handling.
 */
export class SpecProcessingError extends StructuredErrorException<
  SpecErrorCode,
  SpecErrorCategory,
  SpecError['context']
> {
  constructor(errors: SpecError[], message?: string) {
    // Auto-format errors if no custom message provided
    const defaultMessage =
      errors.length === 1
        ? formatSpecError(errors.at(0)!)
        : `Failed to build render tree:\n\n${formatSpecErrorsForModel(errors)}`;

    super(errors, message ?? defaultMessage, 'SpecProcessingError');
  }
}
