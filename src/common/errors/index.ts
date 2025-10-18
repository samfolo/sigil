/**
 * Error handling utilities
 *
 * This module provides type-safe error handling using the Result pattern.
 * See ERRORS.md for usage guidelines and examples.
 */

export type {Result, Ok, Err} from './result';
export {
	ok,
	err,
	mapResult,
	mapError,
	chain,
	unwrapOr,
	unwrapOrElse,
	all,
	isOk,
	isErr,
} from './result';

// SpecError system
export {ERROR_CODES} from './codes';
export type {ErrorCode, ErrorCategory, Severity, SpecError} from './types';
export {formatError, formatErrorsForModel} from './format';
export {SpecProcessingError} from './exception';
export {isSpecErrorArray} from './predicates';
