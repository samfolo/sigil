/**
 * Error type definitions for the rich error system
 *
 * This module defines the core error types used throughout Sigil for structured
 * error reporting. These types are designed to be LLM-friendly, providing
 * sufficient context for AI-assisted debugging and error resolution.
 */

/**
 * Standard error codes for common failure scenarios
 *
 * Add new error codes as they are discovered during development.
 * Each code should represent a distinct, actionable error condition.
 */
export const ErrorCode = {
	MISSING_COMPONENT: 'MISSING_COMPONENT',
	TYPE_MISMATCH: 'TYPE_MISMATCH',
	ACCESSOR_NOT_BOUND: 'ACCESSOR_NOT_BOUND',
	JSONPATH_QUERY_FAILED: 'JSONPATH_QUERY_FAILED',
	INVALID_JSONPATH: 'INVALID_JSONPATH',
} as const;

/**
 * Type-safe error code extracted from ErrorCode constant
 */
export type ErrorCode = (typeof ErrorCode)[keyof typeof ErrorCode];

/**
 * Error severity levels
 *
 * - error: Prevents rendering or causes incorrect behaviour
 * - warning: Non-critical issue that may cause unexpected results
 */
export type Severity = 'error' | 'warning';

/**
 * Error categories for classification
 *
 * - spec: Error in the specification structure or syntax
 * - data: Error in the data or data binding
 */
export type ErrorCategory = 'spec' | 'data';

/**
 * Structured error information for spec validation and execution
 *
 * Provides rich context for debugging, including JSONPath location,
 * structured data for LLM analysis, and optional fix suggestions.
 */
export interface SpecError {
	/**
	 * Unique error code identifying the type of error
	 */
	code: ErrorCode;

	/**
	 * Severity level of the error
	 */
	severity: Severity;

	/**
	 * Category of error for classification
	 */
	category: ErrorCategory;

	/**
	 * JSONPath to the location in the spec where the error occurred
	 */
	path: string;

	/**
	 * Structured contextual data for LLM analysis
	 *
	 * Contains relevant information about the error such as:
	 * - Expected vs actual values
	 * - Component or field names
	 * - Related data that caused the error
	 */
	context: Record<string, unknown>;

	/**
	 * Optional human-readable suggestion for fixing the error
	 */
	suggestion?: string;
}
