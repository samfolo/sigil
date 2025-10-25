/**
 * Exception class for agent processing errors
 *
 * IMPORTANT: This exception should ONLY be used at React error boundaries and
 * system integration points to convert Result<T, AgentError[]> errors into
 * thrown exceptions.
 *
 * Internal code should use Result<T, AgentError[]> for error handling. Only throw
 * this exception when crossing boundaries that require exceptions (React error
 * boundaries, external APIs, etc.).
 *
 * @example
 * ```typescript
 * // Internal code uses Result
 * const result = defineAgent(config);
 * if (isErr(result)) {
 *   return result; // Return error, don't throw
 * }
 *
 * // Only throw at boundaries
 * const result = defineAgent(config);
 * if (isErr(result)) {
 *   throw new AgentProcessingError(result.error); // Convert to exception at boundary
 * }
 * ```
 */

import {StructuredErrorException} from '@sigil/src/common/errors/structured';

import {formatAgentError, formatAgentErrorsForDeveloper} from './formatter';
import type {AgentError, AgentErrorCategory, AgentErrorCode} from './types';

/**
 * Exception thrown when agent processing fails
 *
 * Contains structured error information for debugging and error reporting.
 * Use only at React/system boundaries, not for internal error handling.
 */
export class AgentProcessingError extends StructuredErrorException<
  AgentErrorCode,
  AgentErrorCategory,
  AgentError['context']
> {
	constructor(errors: AgentError[], message?: string) {
		// Auto-format errors if no custom message provided
		const defaultMessage =
      errors.length === 1
      	? formatAgentError(errors.at(0)!)
      	: `Agent processing failed:\n\n${formatAgentErrorsForDeveloper(errors)}`;

		super(errors, message ?? defaultMessage, 'AgentProcessingError');
	}
}
