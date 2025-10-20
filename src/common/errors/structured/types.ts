/**
 * Generic structured error types
 *
 * This module provides a generic, reusable foundation for structured error handling
 * across different domains (spec validation, agent framework, etc.).
 *
 * Domains specialise these types by providing:
 * - Domain-specific error codes
 * - Domain-specific error categories
 * - Domain-specific context types
 */

/**
 * Error severity levels
 *
 * - error: Prevents execution or causes incorrect behaviour
 * - warning: Non-critical issue that may cause unexpected results
 */
export type Severity = 'error' | 'warning';

/**
 * Base properties shared by all structured errors
 *
 * @template Code - Union type of error codes for this domain
 * @template Category - Union type of error categories for this domain
 * @template Context - Type of context object for this error
 */
export interface StructuredError<Code extends string, Category extends string, Context> {
	/**
	 * Error code identifying the specific error condition
	 */
	code: Code;

	/**
	 * Severity level of this error
	 */
	severity: Severity;

	/**
	 * Category for classifying errors by domain concerns
	 */
	category: Category;

	/**
	 * JSONPath or identifier locating where the error occurred
	 */
	path?: string;

	/**
	 * Domain-specific context providing details about this error
	 */
	context: Context;

	/**
	 * Optional suggestion for resolving the error
	 */
	suggestion?: string;
}

/**
 * Helper type to extract error code type from error code constant
 *
 * @example
 * ```typescript
 * const CODES = {FOO: 'FOO', BAR: 'BAR'} as const;
 * type Code = ErrorCode<typeof CODES>; // 'FOO' | 'BAR'
 * ```
 */
export type ErrorCode<Codes extends Record<string, string>> = Codes[keyof Codes];
