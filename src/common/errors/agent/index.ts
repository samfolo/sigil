/**
 * Agent error handling system
 *
 * Structured error handling for agent framework validation and execution errors.
 * Built on the generic structured error foundation.
 */

// Error codes
export {AGENT_ERROR_CODES} from './codes';

// Constants
export {AGENT_VALIDATION_CONSTRAINTS} from './constants';

// Error types
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
} from './types';

// Context types
export type {
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
} from './contexts';

// Formatting utilities
export {formatAgentError, formatAgentErrorsForDeveloper} from './formatter';

// Exception class
export {AgentProcessingError} from './exception';

// Type guards
export {isAgentErrorArray} from './predicates';
