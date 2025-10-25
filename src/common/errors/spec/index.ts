/**
 * Spec error handling system
 *
 * Structured error handling for spec validation and execution errors.
 * Built on the generic structured error foundation.
 */

// Error codes
export {ERROR_CODES} from './codes';

// Error types
export type {
  SpecError,
  SpecErrorCode,
  SpecErrorCategory,
  MissingComponentError,
  MissingArrayPropertyError,
  UnknownLayoutTypeError,
  UnknownLayoutChildTypeError,
  InvalidAccessorError,
  ExpectedSingleValueError,
  FieldRequiredError,
  EmptyLayoutError,
  NotArrayError,
  QueryErrorError,
  TypeMismatchError,
} from './types';

// Context types
export type {
  MissingComponentContext,
  MissingArrayPropertyContext,
  UnknownLayoutTypeContext,
  UnknownLayoutChildTypeContext,
  InvalidAccessorContext,
  ExpectedSingleValueContext,
  FieldRequiredContext,
  EmptyLayoutContext,
  NotArrayContext,
  QueryErrorContext,
  TypeMismatchContext,
} from './contexts';

// Formatting utilities
export {formatSpecError, formatSpecErrorsForModel} from './formatter';

// Exception class
export {SpecProcessingError} from './exception';

// Type guards
export {isSpecErrorArray} from './predicates';

// Utility functions
export {generateFieldNameSimilaritySuggestion} from './utils';
