/**
 * Agent framework error handling utilities
 *
 * This module provides type-safe error handling for the agent framework using
 * structured AgentError types. See ERROR_HANDLING.md for usage guidelines.
 */

// Error codes
export {AGENT_ERROR_CODES} from './codes';

// Error types
export type {
	AgentError,
	AgentErrorCategory,
	AgentErrorCode,
	Severity,
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
} from './types';

// Formatting utilities
export {formatAgentError, formatAgentErrorsForDeveloper} from './format';

// Exception class
export {AgentProcessingError} from './exception';

// Predicates
export {isAgentErrorArray} from './predicates';

// Constants
export {AGENT_VALIDATION_CONSTRAINTS} from './constants';
