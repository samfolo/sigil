/**
 * Error handling utilities
 *
 * This module provides type-safe error handling using the Result pattern.
 * See ERRORS.md for usage guidelines and examples.
 */

// Result system
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

// Generic structured error system
export type {StructuredError, Severity, ErrorCode} from './structured';
export {
  formatList,
  safeStringify,
  formatUnknownError,
  appendMetadata,
  formatErrorsBySeverity,
  StructuredErrorException,
  isStructuredErrorArray,
} from './structured';

// Spec error system
export {ERROR_CODES} from './spec';
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
} from './spec';
export {formatSpecError, formatSpecErrorsForModel, SpecProcessingError, isSpecErrorArray, generateFieldNameSimilaritySuggestion} from './spec';

// Zod error system
export {formatZodErrorsForModel} from './zod';

// Agent error system
export {AGENT_ERROR_CODES, AGENT_VALIDATION_CONSTRAINTS} from './agent';
export type {
  AgentError,
  AgentErrorCode,
  AgentErrorCategory,
  EmptyNameError,
  EmptyDescriptionError,
  EmptyModelNameError,
  MissingOutputSchemaError,
  InvalidMaxAttemptsError,
  InvalidTemperatureError,
  InvalidMaxTokensError,
  PromptGenerationFailedError,
  ValidationFailedError,
  MaxAttemptsExceededError,
  ApiErrorError,
  RateLimitErrorError,
  TokenLimitExceededError,
  InvalidResponseError,
  MetricsCollectionFailedError,
  LoggingFailedError,
  PromptType,
  EmptyNameContext,
  EmptyDescriptionContext,
  EmptyModelNameContext,
  MissingOutputSchemaContext,
  InvalidMaxAttemptsContext,
  InvalidTemperatureContext,
  InvalidMaxTokensContext,
  PromptGenerationFailedContext,
  ValidationFailedContext,
  MaxAttemptsExceededContext,
  ApiErrorContext,
  RateLimitErrorContext,
  TokenLimitExceededContext,
  InvalidResponseContext,
  MetricsCollectionFailedContext,
  LoggingFailedContext,
} from './agent';
export {formatAgentError, formatAgentErrorsForDeveloper, AgentProcessingError, isAgentErrorArray} from './agent';
