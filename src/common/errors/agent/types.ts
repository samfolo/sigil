/**
 * Agent error type definitions
 *
 * Specialises the generic StructuredError for agent framework validation and execution errors.
 * These types are designed to be developer-friendly and provide sufficient context for
 * debugging and error resolution.
 */

import type {ErrorCode, StructuredError} from '@sigil/src/common/errors/structured';

import type {AGENT_ERROR_CODES} from './codes';
import type {
	ApiErrorContext,
	EmptyDescriptionContext,
	EmptyModelNameContext,
	EmptyNameContext,
	EmptyOutputToolDescriptionContext,
	EmptyOutputToolNameContext,
	ExecutionCancelledContext,
	InvalidMaxAttemptsContext,
	InvalidMaxTokensContext,
	InvalidResponseContext,
	InvalidTemperatureContext,
	LoggingFailedContext,
	MaxAttemptsExceededContext,
	MaxIterationsExceededContext,
	MetricsCollectionFailedContext,
	MissingOutputSchemaContext,
	PromptGenerationFailedContext,
	RateLimitErrorContext,
	SubmitBeforeOutputContext,
	TokenLimitExceededContext,
	ValidationFailedContext,
} from './contexts';

/**
 * Type-safe error code extracted from AGENT_ERROR_CODES constant
 */
export type AgentErrorCode = ErrorCode<typeof AGENT_ERROR_CODES>;

/**
 * Error categories for agent framework
 *
 * - validation: Error in agent definition validation (build-time)
 * - execution: Error during agent execution (runtime)
 * - model: Error from language model interaction
 * - observability: Error in metrics/logging collection
 */
export type AgentErrorCategory =
  | 'validation'
  | 'execution'
  | 'model'
  | 'observability';

// Validation errors
export interface EmptyNameError
  extends StructuredError<
    typeof AGENT_ERROR_CODES.EMPTY_NAME,
    AgentErrorCategory,
    EmptyNameContext
  > {
  category: 'validation';
}

export interface EmptyDescriptionError
  extends StructuredError<
    typeof AGENT_ERROR_CODES.EMPTY_DESCRIPTION,
    AgentErrorCategory,
    EmptyDescriptionContext
  > {
  category: 'validation';
}

export interface EmptyModelNameError
  extends StructuredError<
    typeof AGENT_ERROR_CODES.EMPTY_MODEL_NAME,
    AgentErrorCategory,
    EmptyModelNameContext
  > {
  category: 'validation';
}

export interface EmptyOutputToolNameError
  extends StructuredError<
    typeof AGENT_ERROR_CODES.EMPTY_OUTPUT_TOOL_NAME,
    AgentErrorCategory,
    EmptyOutputToolNameContext
  > {
  category: 'validation';
}

export interface EmptyOutputToolDescriptionError
  extends StructuredError<
    typeof AGENT_ERROR_CODES.EMPTY_OUTPUT_TOOL_DESCRIPTION,
    AgentErrorCategory,
    EmptyOutputToolDescriptionContext
  > {
  category: 'validation';
}

export interface MissingOutputSchemaError
  extends StructuredError<
    typeof AGENT_ERROR_CODES.MISSING_OUTPUT_SCHEMA,
    AgentErrorCategory,
    MissingOutputSchemaContext
  > {
  category: 'validation';
}

export interface InvalidMaxAttemptsError
  extends StructuredError<
    typeof AGENT_ERROR_CODES.INVALID_MAX_ATTEMPTS,
    AgentErrorCategory,
    InvalidMaxAttemptsContext
  > {
  category: 'validation';
}

export interface InvalidTemperatureError
  extends StructuredError<
    typeof AGENT_ERROR_CODES.INVALID_TEMPERATURE,
    AgentErrorCategory,
    InvalidTemperatureContext
  > {
  category: 'validation';
}

export interface InvalidMaxTokensError
  extends StructuredError<
    typeof AGENT_ERROR_CODES.INVALID_MAX_TOKENS,
    AgentErrorCategory,
    InvalidMaxTokensContext
  > {
  category: 'validation';
}

// Execution errors
export interface PromptGenerationFailedError
  extends StructuredError<
    typeof AGENT_ERROR_CODES.PROMPT_GENERATION_FAILED,
    AgentErrorCategory,
    PromptGenerationFailedContext
  > {
  category: 'execution';
}

export interface ValidationFailedError
  extends StructuredError<
    typeof AGENT_ERROR_CODES.VALIDATION_FAILED,
    AgentErrorCategory,
    ValidationFailedContext
  > {
  category: 'execution';
}

export interface MaxAttemptsExceededError
  extends StructuredError<
    typeof AGENT_ERROR_CODES.MAX_ATTEMPTS_EXCEEDED,
    AgentErrorCategory,
    MaxAttemptsExceededContext
  > {
  category: 'execution';
}

export interface MaxIterationsExceededError
  extends StructuredError<
    typeof AGENT_ERROR_CODES.MAX_ITERATIONS_EXCEEDED,
    AgentErrorCategory,
    MaxIterationsExceededContext
  > {
  category: 'execution';
}

export interface ExecutionCancelledError
  extends StructuredError<
    typeof AGENT_ERROR_CODES.EXECUTION_CANCELLED,
    AgentErrorCategory,
    ExecutionCancelledContext
  > {
  category: 'execution';
}

// Model errors
export interface ApiErrorError
  extends StructuredError<
    typeof AGENT_ERROR_CODES.API_ERROR,
    AgentErrorCategory,
    ApiErrorContext
  > {
  category: 'model';
}

export interface RateLimitErrorError
  extends StructuredError<
    typeof AGENT_ERROR_CODES.RATE_LIMIT_ERROR,
    AgentErrorCategory,
    RateLimitErrorContext
  > {
  category: 'model';
}

export interface TokenLimitExceededError
  extends StructuredError<
    typeof AGENT_ERROR_CODES.TOKEN_LIMIT_EXCEEDED,
    AgentErrorCategory,
    TokenLimitExceededContext
  > {
  category: 'model';
}

export interface InvalidResponseError
  extends StructuredError<
    typeof AGENT_ERROR_CODES.INVALID_RESPONSE,
    AgentErrorCategory,
    InvalidResponseContext
  > {
  category: 'model';
}

export interface SubmitBeforeOutputError
  extends StructuredError<
    typeof AGENT_ERROR_CODES.SUBMIT_BEFORE_OUTPUT,
    AgentErrorCategory,
    SubmitBeforeOutputContext
  > {
  category: 'model';
}

// Observability errors
export interface MetricsCollectionFailedError
  extends StructuredError<
    typeof AGENT_ERROR_CODES.METRICS_COLLECTION_FAILED,
    AgentErrorCategory,
    MetricsCollectionFailedContext
  > {
  category: 'observability';
}

export interface LoggingFailedError
  extends StructuredError<
    typeof AGENT_ERROR_CODES.LOGGING_FAILED,
    AgentErrorCategory,
    LoggingFailedContext
  > {
  category: 'observability';
}

/**
 * Structured error information for agent framework validation and execution
 *
 * Discriminated union type that provides type-safe access to error-specific
 * context based on the error code.
 */
export type AgentError =
  | EmptyNameError
  | EmptyDescriptionError
  | EmptyModelNameError
  | EmptyOutputToolNameError
  | EmptyOutputToolDescriptionError
  | MissingOutputSchemaError
  | InvalidMaxAttemptsError
  | InvalidTemperatureError
  | InvalidMaxTokensError
  | PromptGenerationFailedError
  | ValidationFailedError
  | MaxAttemptsExceededError
  | MaxIterationsExceededError
  | ExecutionCancelledError
  | ApiErrorError
  | RateLimitErrorError
  | TokenLimitExceededError
  | InvalidResponseError
  | SubmitBeforeOutputError
  | MetricsCollectionFailedError
  | LoggingFailedError;
