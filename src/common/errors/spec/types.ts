/**
 * Spec error type definitions
 *
 * Specialises the generic StructuredError for spec validation and execution errors.
 * These types are designed to be LLM-friendly, providing sufficient context for
 * AI-assisted debugging and error resolution.
 */

import type {ErrorCode, StructuredError} from '@sigil/src/common/errors/structured';

import type {ERROR_CODES} from './codes';
import type {
  EmptyLayoutContext,
  ExpectedSingleValueContext,
  FieldRequiredContext,
  InvalidAccessorContext,
  MissingArrayPropertyContext,
  MissingComponentContext,
  NotArrayContext,
  QueryErrorContext,
  TypeMismatchContext,
  UnknownLayoutChildTypeContext,
  UnknownLayoutTypeContext,
} from './contexts';

/**
 * Type-safe error code extracted from ERROR_CODES constant
 */
export type SpecErrorCode = ErrorCode<typeof ERROR_CODES>;

/**
 * Error categories for spec validation
 *
 * - spec: Error in the specification structure or syntax
 * - data: Error in the data or data binding
 */
export type SpecErrorCategory = 'spec' | 'data';

/**
 * MISSING_COMPONENT error
 */
export interface MissingComponentError
  extends StructuredError<
    typeof ERROR_CODES.MISSING_COMPONENT,
    SpecErrorCategory,
    MissingComponentContext
  > {
  code: typeof ERROR_CODES.MISSING_COMPONENT;
  context: MissingComponentContext;
}

/**
 * MISSING_ARRAY_PROPERTY error
 */
export interface MissingArrayPropertyError
  extends StructuredError<
    typeof ERROR_CODES.MISSING_ARRAY_PROPERTY,
    SpecErrorCategory,
    MissingArrayPropertyContext
  > {
  code: typeof ERROR_CODES.MISSING_ARRAY_PROPERTY;
  context: MissingArrayPropertyContext;
}

/**
 * UNKNOWN_LAYOUT_TYPE error
 */
export interface UnknownLayoutTypeError
  extends StructuredError<
    typeof ERROR_CODES.UNKNOWN_LAYOUT_TYPE,
    SpecErrorCategory,
    UnknownLayoutTypeContext
  > {
  code: typeof ERROR_CODES.UNKNOWN_LAYOUT_TYPE;
  context: UnknownLayoutTypeContext;
}

/**
 * UNKNOWN_LAYOUT_CHILD_TYPE error
 */
export interface UnknownLayoutChildTypeError
  extends StructuredError<
    typeof ERROR_CODES.UNKNOWN_LAYOUT_CHILD_TYPE,
    SpecErrorCategory,
    UnknownLayoutChildTypeContext
  > {
  code: typeof ERROR_CODES.UNKNOWN_LAYOUT_CHILD_TYPE;
  context: UnknownLayoutChildTypeContext;
}

/**
 * INVALID_ACCESSOR error
 */
export interface InvalidAccessorError
  extends StructuredError<
    typeof ERROR_CODES.INVALID_ACCESSOR,
    SpecErrorCategory,
    InvalidAccessorContext
  > {
  code: typeof ERROR_CODES.INVALID_ACCESSOR;
  context: InvalidAccessorContext;
}

/**
 * EXPECTED_SINGLE_VALUE error
 */
export interface ExpectedSingleValueError
  extends StructuredError<
    typeof ERROR_CODES.EXPECTED_SINGLE_VALUE,
    SpecErrorCategory,
    ExpectedSingleValueContext
  > {
  code: typeof ERROR_CODES.EXPECTED_SINGLE_VALUE;
  context: ExpectedSingleValueContext;
}

/**
 * FIELD_REQUIRED error
 */
export interface FieldRequiredError
  extends StructuredError<
    typeof ERROR_CODES.FIELD_REQUIRED,
    SpecErrorCategory,
    FieldRequiredContext
  > {
  code: typeof ERROR_CODES.FIELD_REQUIRED;
  context: FieldRequiredContext;
}

/**
 * EMPTY_LAYOUT error
 */
export interface EmptyLayoutError
  extends StructuredError<
    typeof ERROR_CODES.EMPTY_LAYOUT,
    SpecErrorCategory,
    EmptyLayoutContext
  > {
  code: typeof ERROR_CODES.EMPTY_LAYOUT;
  context: EmptyLayoutContext;
}

/**
 * NOT_ARRAY error
 */
export interface NotArrayError
  extends StructuredError<
    typeof ERROR_CODES.NOT_ARRAY,
    SpecErrorCategory,
    NotArrayContext
  > {
  code: typeof ERROR_CODES.NOT_ARRAY;
  context: NotArrayContext;
}

/**
 * QUERY_ERROR error
 */
export interface QueryErrorError
  extends StructuredError<
    typeof ERROR_CODES.QUERY_ERROR,
    SpecErrorCategory,
    QueryErrorContext
  > {
  code: typeof ERROR_CODES.QUERY_ERROR;
  context: QueryErrorContext;
}

/**
 * TYPE_MISMATCH error
 */
export interface TypeMismatchError
  extends StructuredError<
    typeof ERROR_CODES.TYPE_MISMATCH,
    SpecErrorCategory,
    TypeMismatchContext
  > {
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
