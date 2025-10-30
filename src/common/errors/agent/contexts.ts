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
 * Context for EMPTY_OUTPUT_TOOL_NAME error
 */
export interface EmptyOutputToolNameContext {
  providedValue?: string;
}

/**
 * Context for EMPTY_OUTPUT_TOOL_DESCRIPTION error
 */
export interface EmptyOutputToolDescriptionContext {
  providedValue?: string;
}

/**
 * Context for MISSING_OUTPUT_SCHEMA error
 */
export type MissingOutputSchemaContext = Record<string, never>;

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
  layer?: string;
  reason?: string;
  attempt?: number;
}

/**
 * Context for MAX_ATTEMPTS_EXCEEDED error
 */
export interface MaxAttemptsExceededContext {
  attempts: number;
  maxAttempts: number;
  lastError?: string;
}

/**
 * Context for MAX_ITERATIONS_EXCEEDED error
 */
export interface MaxIterationsExceededContext {
  attempt: number;
  iterationCount: number;
  maxIterations: number;
}

/**
 * Execution phase where cancellation occurred
 */
export type ExecutionPhase = 'prompt_generation' | 'validation' | 'api_call' | 'iteration';

/**
 * Context for EXECUTION_CANCELLED error
 */
export interface ExecutionCancelledContext {
  attempt: number;
  phase: ExecutionPhase;
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
 * Context for OUTPUT_TOOL_NOT_USED error
 */
export interface OutputToolNotUsedContext {
  attempt: number;
  iterationCount: number;
  expectedTool: string;
}

/**
 * Context for SUBMIT_BEFORE_OUTPUT error
 */
export interface SubmitBeforeOutputContext {
  attempt: number;
  iterationCount: number;
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
