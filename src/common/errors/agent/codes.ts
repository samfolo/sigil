/**
 * Error codes for agent framework failures
 *
 * These error codes identify specific failure scenarios during agent definition
 * validation and execution. They are designed to be internationalisable and
 * provide sufficient context for debugging and error resolution.
 *
 * Codes are organised by category based on where they occur in the agent lifecycle.
 */

/**
 * Standard error codes for agent framework failures
 *
 * Each code represents a distinct, actionable error condition that may occur
 * during agent definition validation or execution.
 */
export const AGENT_ERROR_CODES = {
	// Validation Category: Configuration errors (build-time, defineAgent)
	// Occur when agent definition is invalid
	EMPTY_NAME: 'EMPTY_NAME',
	EMPTY_DESCRIPTION: 'EMPTY_DESCRIPTION',
	EMPTY_MODEL_NAME: 'EMPTY_MODEL_NAME',
	MISSING_OUTPUT_SCHEMA: 'MISSING_OUTPUT_SCHEMA',
	INVALID_MAX_ATTEMPTS: 'INVALID_MAX_ATTEMPTS',
	INVALID_TEMPERATURE: 'INVALID_TEMPERATURE',
	INVALID_MAX_TOKENS: 'INVALID_MAX_TOKENS',

	// Execution Category: Runtime errors
	// Occur during agent execution
	PROMPT_GENERATION_FAILED: 'PROMPT_GENERATION_FAILED',
	VALIDATION_FAILED: 'VALIDATION_FAILED',
	MAX_ATTEMPTS_EXCEEDED: 'MAX_ATTEMPTS_EXCEEDED',
	EXECUTION_CANCELLED: 'EXECUTION_CANCELLED',

	// Model Category: LLM-specific errors
	// Occur when interacting with language models
	API_ERROR: 'API_ERROR',
	RATE_LIMIT_ERROR: 'RATE_LIMIT_ERROR',
	TOKEN_LIMIT_EXCEEDED: 'TOKEN_LIMIT_EXCEEDED',
	INVALID_RESPONSE: 'INVALID_RESPONSE',

	// Observability Category: Metrics and logging errors
	// Occur when tracking execution metrics
	METRICS_COLLECTION_FAILED: 'METRICS_COLLECTION_FAILED',
	LOGGING_FAILED: 'LOGGING_FAILED',
} as const;
