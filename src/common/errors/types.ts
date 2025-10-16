import {ERROR_CODES} from './codes';

/**
 * Error type definitions for the rich error system
 *
 * This module defines the core error types used throughout Sigil for structured
 * error reporting. These types are designed to be LLM-friendly, providing
 * sufficient context for AI-assisted debugging and error resolution.
 */

/**
 * Type-safe error code extracted from ERROR_CODES constant
 */
export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];

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
 * Base properties shared by all error types
 */
interface BaseSpecError {
	severity: Severity;
	category: ErrorCategory;
	path: string;
	suggestion?: string;
}

/**
 * Context for MISSING_COMPONENT error
 */
export interface MissingComponentContext {
	componentId?: string;
	availableComponents?: string[];
}

/**
 * Context for MISSING_ARRAY_PROPERTY error
 */
export interface MissingArrayPropertyContext {
	attemptedProperties?: string[];
	objectKeys?: string[];
}

/**
 * Context for UNKNOWN_LAYOUT_TYPE error
 */
export interface UnknownLayoutTypeContext {
	layoutType?: string;
	validTypes?: string[];
}

/**
 * Context for UNKNOWN_LAYOUT_CHILD_TYPE error
 */
export interface UnknownLayoutChildTypeContext {
	childType?: string;
	validTypes?: string[];
}

/**
 * Context for INVALID_ACCESSOR error
 */
export interface InvalidAccessorContext {
	accessor?: string;
	reason?: string;
}

/**
 * Context for EXPECTED_SINGLE_VALUE error
 */
export interface ExpectedSingleValueContext {
	accessor?: string;
	resultCount?: number;
}

/**
 * Context for FIELD_REQUIRED error
 */
export interface FieldRequiredContext {
	operation?: string;
	availableFields?: string[];
}

/**
 * Context for EMPTY_LAYOUT error
 */
export interface EmptyLayoutContext {
	layoutType?: string;
}

/**
 * Context for NOT_ARRAY error
 */
export interface NotArrayContext {
	actualType?: string;
	value?: unknown;
}

/**
 * Context for QUERY_ERROR error
 */
export interface QueryErrorContext {
	jsonPath?: string;
	reason?: string;
	dataType?: string;
}

/**
 * Context for TYPE_MISMATCH error
 */
export interface TypeMismatchContext {
	expected?: string;
	actual?: string;
	nodeId?: string;
}

/**
 * MISSING_COMPONENT error
 */
export interface MissingComponentError extends BaseSpecError {
	code: typeof ERROR_CODES.MISSING_COMPONENT;
	context: MissingComponentContext;
}

/**
 * MISSING_ARRAY_PROPERTY error
 */
export interface MissingArrayPropertyError extends BaseSpecError {
	code: typeof ERROR_CODES.MISSING_ARRAY_PROPERTY;
	context: MissingArrayPropertyContext;
}

/**
 * UNKNOWN_LAYOUT_TYPE error
 */
export interface UnknownLayoutTypeError extends BaseSpecError {
	code: typeof ERROR_CODES.UNKNOWN_LAYOUT_TYPE;
	context: UnknownLayoutTypeContext;
}

/**
 * UNKNOWN_LAYOUT_CHILD_TYPE error
 */
export interface UnknownLayoutChildTypeError extends BaseSpecError {
	code: typeof ERROR_CODES.UNKNOWN_LAYOUT_CHILD_TYPE;
	context: UnknownLayoutChildTypeContext;
}

/**
 * INVALID_ACCESSOR error
 */
export interface InvalidAccessorError extends BaseSpecError {
	code: typeof ERROR_CODES.INVALID_ACCESSOR;
	context: InvalidAccessorContext;
}

/**
 * EXPECTED_SINGLE_VALUE error
 */
export interface ExpectedSingleValueError extends BaseSpecError {
	code: typeof ERROR_CODES.EXPECTED_SINGLE_VALUE;
	context: ExpectedSingleValueContext;
}

/**
 * FIELD_REQUIRED error
 */
export interface FieldRequiredError extends BaseSpecError {
	code: typeof ERROR_CODES.FIELD_REQUIRED;
	context: FieldRequiredContext;
}

/**
 * EMPTY_LAYOUT error
 */
export interface EmptyLayoutError extends BaseSpecError {
	code: typeof ERROR_CODES.EMPTY_LAYOUT;
	context: EmptyLayoutContext;
}

/**
 * NOT_ARRAY error
 */
export interface NotArrayError extends BaseSpecError {
	code: typeof ERROR_CODES.NOT_ARRAY;
	context: NotArrayContext;
}

/**
 * QUERY_ERROR error
 */
export interface QueryErrorError extends BaseSpecError {
	code: typeof ERROR_CODES.QUERY_ERROR;
	context: QueryErrorContext;
}

/**
 * TYPE_MISMATCH error
 */
export interface TypeMismatchError extends BaseSpecError {
	code: typeof ERROR_CODES.TYPE_MISMATCH;
	context: TypeMismatchContext;
}

/**
 * Structured error information for spec validation and execution
 *
 * Discriminated union type that provides type-safe access to error-specific
 * context based on the error code.
 */
export type SpecError =
	| MissingComponentError
	| MissingArrayPropertyError
	| UnknownLayoutTypeError
	| UnknownLayoutChildTypeError
	| InvalidAccessorError
	| ExpectedSingleValueError
	| FieldRequiredError
	| EmptyLayoutError
	| NotArrayError
	| QueryErrorError
	| TypeMismatchError;
