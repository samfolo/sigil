/**
 * Generic exception class for structured errors
 *
 * IMPORTANT: Exceptions should ONLY be used at boundaries (React error boundaries,
 * API integration points) to convert Result<T, Error[]> into thrown exceptions.
 *
 * Internal code should use Result<T, Error[]> for error handling. Only throw
 * exceptions when crossing boundaries that require them.
 */

import type {StructuredError} from './types';

/**
 * Base exception class for structured errors
 *
 * Domains extend this class to create domain-specific exceptions with
 * custom formatting and error handling behaviour.
 *
 * @template Code - Union type of error codes for this domain
 * @template Category - Union type of error categories for this domain
 * @template Context - Union type of context types for this domain
 */
export class StructuredErrorException<
  Code extends string,
  Category extends string,
  Context
> extends Error {
  /**
   * Structured errors that caused the processing failure
   */
  public readonly errors: StructuredError<Code, Category, Context>[];

  /**
   * Creates a new structured error exception
   *
   * @param errors - Array of structured errors
   * @param message - Optional custom message (if not provided, subclasses should format errors)
   * @param name - Name of the exception (defaults to 'StructuredErrorException')
   */
  constructor(
    errors: StructuredError<Code, Category, Context>[],
    message?: string,
    name: string = 'StructuredErrorException'
  ) {
    super(message);
    this.name = name;
    this.errors = errors;
  }
}
