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
