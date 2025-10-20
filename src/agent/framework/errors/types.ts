import type {AGENT_ERROR_CODES} from './codes';

/**
 * Error type definitions for the agent framework error system
 *
 * This module defines the core error types used throughout the agent framework
 * for structured error reporting. These types are designed to be developer-friendly
 * and provide sufficient context for debugging and error resolution.
 */

/**
 * Type-safe error code extracted from AGENT_ERROR_CODES constant
 */
export type AgentErrorCode =
	(typeof AGENT_ERROR_CODES)[keyof typeof AGENT_ERROR_CODES];

/**
 * Error severity levels
 *
 * - error: Prevents agent execution or causes incorrect behaviour
 * - warning: Non-critical issue that may cause unexpected results
 */
export type Severity = 'error' | 'warning';

/**
 * Error categories for classification
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

/**
 * Prompt types for agent execution
 */
export type PromptType = 'system' | 'user' | 'error';

/**
 * Base properties shared by all agent error types
 */
interface BaseAgentError {
	severity: Severity;
	category: AgentErrorCategory;
	path?: string;
	suggestion?: string;
}

/**
 * Context for EMPTY_NAME error
 */
export interface EmptyNameContext {
	providedValue?: string;
}

/**
 * Context for EMPTY_DESCRIPTION error
 */
export interface EmptyDescriptionContext {
	providedValue?: string;
}

/**
 * Context for EMPTY_MODEL_NAME error
 */
export interface EmptyModelNameContext {
	providedValue?: string;
}

/**
 * Context for MISSING_OUTPUT_SCHEMA error
 */
export interface MissingOutputSchemaContext {
	// No additional context needed
}

/**
 * Context for INVALID_MAX_ATTEMPTS error
 */
export interface InvalidMaxAttemptsContext {
	providedValue?: number;
	minimumValue: number;
}

/**
 * Context for INVALID_TEMPERATURE error
 */
export interface InvalidTemperatureContext {
	providedValue?: number;
	minimumValue: number;
	maximumValue: number;
}

/**
 * Context for INVALID_MAX_TOKENS error
 */
export interface InvalidMaxTokensContext {
	providedValue?: number;
	minimumValue: number;
}

/**
 * Context for PROMPT_GENERATION_FAILED error
 */
export interface PromptGenerationFailedContext {
	promptType?: PromptType;
	reason?: string;
	attempt?: number;
}

/**
 * Context for VALIDATION_FAILED error
 */
export interface ValidationFailedContext {
	validatorName?: string;
	reason?: string;
	attempt?: number;
}

/**
 * Context for MAX_ATTEMPTS_EXCEEDED error
 */
export interface MaxAttemptsExceededContext {
	maxAttempts: number;
	lastError?: string;
}

/**
 * Context for API_ERROR error
 */
export interface ApiErrorContext {
	provider?: string;
	statusCode?: number;
	message?: string;
}

/**
 * Context for RATE_LIMIT_ERROR error
 */
export interface RateLimitErrorContext {
	provider?: string;
	retryAfter?: number;
	limit?: string;
}

/**
 * Context for TOKEN_LIMIT_EXCEEDED error
 */
export interface TokenLimitExceededContext {
	requestedTokens?: number;
	maximumTokens?: number;
	provider?: string;
}

/**
 * Context for INVALID_RESPONSE error
 */
export interface InvalidResponseContext {
	reason?: string;
	responseType?: string;
}

/**
 * Context for METRICS_COLLECTION_FAILED error
 */
export interface MetricsCollectionFailedContext {
	metricType?: string;
	reason?: string;
}

/**
 * Context for LOGGING_FAILED error
 */
export interface LoggingFailedContext {
	logLevel?: string;
	reason?: string;
}

/**
 * EMPTY_NAME error
 */
export interface EmptyNameError extends BaseAgentError {
	code: typeof AGENT_ERROR_CODES.EMPTY_NAME;
	category: 'validation';
	context: EmptyNameContext;
}

/**
 * EMPTY_DESCRIPTION error
 */
export interface EmptyDescriptionError extends BaseAgentError {
	code: typeof AGENT_ERROR_CODES.EMPTY_DESCRIPTION;
	category: 'validation';
	context: EmptyDescriptionContext;
}

/**
 * EMPTY_MODEL_NAME error
 */
export interface EmptyModelNameError extends BaseAgentError {
	code: typeof AGENT_ERROR_CODES.EMPTY_MODEL_NAME;
	category: 'validation';
	context: EmptyModelNameContext;
}

/**
 * MISSING_OUTPUT_SCHEMA error
 */
export interface MissingOutputSchemaError extends BaseAgentError {
	code: typeof AGENT_ERROR_CODES.MISSING_OUTPUT_SCHEMA;
	category: 'validation';
	context: MissingOutputSchemaContext;
}

/**
 * INVALID_MAX_ATTEMPTS error
 */
export interface InvalidMaxAttemptsError extends BaseAgentError {
	code: typeof AGENT_ERROR_CODES.INVALID_MAX_ATTEMPTS;
	category: 'validation';
	context: InvalidMaxAttemptsContext;
}

/**
 * INVALID_TEMPERATURE error
 */
export interface InvalidTemperatureError extends BaseAgentError {
	code: typeof AGENT_ERROR_CODES.INVALID_TEMPERATURE;
	category: 'validation';
	context: InvalidTemperatureContext;
}

/**
 * INVALID_MAX_TOKENS error
 */
export interface InvalidMaxTokensError extends BaseAgentError {
	code: typeof AGENT_ERROR_CODES.INVALID_MAX_TOKENS;
	category: 'validation';
	context: InvalidMaxTokensContext;
}

/**
 * PROMPT_GENERATION_FAILED error
 */
export interface PromptGenerationFailedError extends BaseAgentError {
	code: typeof AGENT_ERROR_CODES.PROMPT_GENERATION_FAILED;
	category: 'execution';
	context: PromptGenerationFailedContext;
}

/**
 * VALIDATION_FAILED error
 */
export interface ValidationFailedError extends BaseAgentError {
	code: typeof AGENT_ERROR_CODES.VALIDATION_FAILED;
	category: 'execution';
	context: ValidationFailedContext;
}

/**
 * MAX_ATTEMPTS_EXCEEDED error
 */
export interface MaxAttemptsExceededError extends BaseAgentError {
	code: typeof AGENT_ERROR_CODES.MAX_ATTEMPTS_EXCEEDED;
	category: 'execution';
	context: MaxAttemptsExceededContext;
}

/**
 * API_ERROR error
 */
export interface ApiErrorError extends BaseAgentError {
	code: typeof AGENT_ERROR_CODES.API_ERROR;
	category: 'model';
	context: ApiErrorContext;
}

/**
 * RATE_LIMIT_ERROR error
 */
export interface RateLimitErrorError extends BaseAgentError {
	code: typeof AGENT_ERROR_CODES.RATE_LIMIT_ERROR;
	category: 'model';
	context: RateLimitErrorContext;
}

/**
 * TOKEN_LIMIT_EXCEEDED error
 */
export interface TokenLimitExceededError extends BaseAgentError {
	code: typeof AGENT_ERROR_CODES.TOKEN_LIMIT_EXCEEDED;
	category: 'model';
	context: TokenLimitExceededContext;
}

/**
 * INVALID_RESPONSE error
 */
export interface InvalidResponseError extends BaseAgentError {
	code: typeof AGENT_ERROR_CODES.INVALID_RESPONSE;
	category: 'model';
	context: InvalidResponseContext;
}

/**
 * METRICS_COLLECTION_FAILED error
 */
export interface MetricsCollectionFailedError extends BaseAgentError {
	code: typeof AGENT_ERROR_CODES.METRICS_COLLECTION_FAILED;
	category: 'observability';
	context: MetricsCollectionFailedContext;
}

/**
 * LOGGING_FAILED error
 */
export interface LoggingFailedError extends BaseAgentError {
	code: typeof AGENT_ERROR_CODES.LOGGING_FAILED;
	category: 'observability';
	context: LoggingFailedContext;
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
	| MissingOutputSchemaError
	| InvalidMaxAttemptsError
	| InvalidTemperatureError
	| InvalidMaxTokensError
	| PromptGenerationFailedError
	| ValidationFailedError
	| MaxAttemptsExceededError
	| ApiErrorError
	| RateLimitErrorError
	| TokenLimitExceededError
	| InvalidResponseError
	| MetricsCollectionFailedError
	| LoggingFailedError;
