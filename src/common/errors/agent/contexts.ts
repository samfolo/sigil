/**
 * Context type definitions for agent errors
 *
 * Each error code has a corresponding context type that provides
 * structured information about the specific error condition.
 */

/**
 * Prompt types for agent execution
 */
export type PromptType = 'system' | 'user' | 'error';

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
