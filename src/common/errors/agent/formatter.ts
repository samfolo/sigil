/**
 * Error formatting for developer-readable output
 *
 * Formats AgentError arrays into structured text that is optimised for
 * debugging and error resolution.
 */

import {
  appendMetadata,
  formatErrorsBySeverity,
} from '@sigil/src/common/errors/structured';

import {AGENT_ERROR_CODES} from './codes';
import type {
  ApiErrorContext,
  EmptyDescriptionContext,
  EmptyModelNameContext,
  EmptyNameContext,
  InvalidMaxAttemptsContext,
  InvalidMaxTokensContext,
  InvalidResponseContext,
  InvalidTemperatureContext,
  LoggingFailedContext,
  MaxAttemptsExceededContext,
  MetricsCollectionFailedContext,
  MissingOutputSchemaContext,
  PromptGenerationFailedContext,
  RateLimitErrorContext,
  TokenLimitExceededContext,
  ValidationFailedContext,
} from './contexts';
import type {AgentError} from './types';

/**
 * Formats EMPTY_NAME error
 */
const formatEmptyName = (context: EmptyNameContext): string => {
  if (context.providedValue !== undefined) {
    return `Agent name must be a non-empty string; was given "${context.providedValue}"`;
  }
  return 'Agent name must be a non-empty string';
};

/**
 * Formats EMPTY_DESCRIPTION error
 */
const formatEmptyDescription = (context: EmptyDescriptionContext): string => {
  if (context.providedValue !== undefined) {
    return `Agent description must be a non-empty string; was given "${context.providedValue}"`;
  }
  return 'Agent description must be a non-empty string';
};

/**
 * Formats EMPTY_MODEL_NAME error
 */
const formatEmptyModelName = (context: EmptyModelNameContext): string => {
  if (context.providedValue !== undefined) {
    return `Model name must be a non-empty string; was given "${context.providedValue}"`;
  }
  return 'Model name must be a non-empty string';
};

/**
 * Formats MISSING_OUTPUT_SCHEMA error
 */
const formatMissingOutputSchema = (
  _context: MissingOutputSchemaContext
): string => 'Validation output schema must be provided';

/**
 * Formats INVALID_MAX_ATTEMPTS error
 */
const formatInvalidMaxAttempts = (
  context: InvalidMaxAttemptsContext
): string => {
  if (context.providedValue !== undefined) {
    return `Validation maxAttempts must be at least ${context.minimumValue}; was given ${context.providedValue}`;
  }
  return `Validation maxAttempts must be at least ${context.minimumValue}`;
};

/**
 * Formats INVALID_TEMPERATURE error
 */
const formatInvalidTemperature = (context: InvalidTemperatureContext): string => {
  if (context.providedValue !== undefined) {
    return `Temperature must be between ${context.minimumValue} and ${context.maximumValue}; was given ${context.providedValue}`;
  }
  return `Temperature must be between ${context.minimumValue} and ${context.maximumValue}`;
};

/**
 * Formats INVALID_MAX_TOKENS error
 */
const formatInvalidMaxTokens = (context: InvalidMaxTokensContext): string => {
  if (context.providedValue !== undefined) {
    return `Maximum tokens must be at least ${context.minimumValue}; was given ${context.providedValue}`;
  }
  return `Maximum tokens must be at least ${context.minimumValue}`;
};

/**
 * Formats PROMPT_GENERATION_FAILED error
 */
const formatPromptGenerationFailed = (
  context: PromptGenerationFailedContext
): string => {
  const parts: string[] = ['Prompt generation failed'];

  if (context.promptType) {
    parts.push(`for ${context.promptType} prompt`);
  }

  if (context.attempt !== undefined) {
    parts.push(`on attempt ${context.attempt}`);
  }

  if (context.reason) {
    parts.push(`; ${context.reason}`);
  }

  return parts.join(' ');
};

/**
 * Formats VALIDATION_FAILED error
 */
const formatValidationFailed = (context: ValidationFailedContext): string => {
  const parts: string[] = ['Validation failed'];

  if (context.layer) {
    parts.push(`in "${context.layer}"`);
  }

  if (context.attempt !== undefined) {
    parts.push(`on attempt ${context.attempt}`);
  }

  if (context.reason) {
    parts.push(`; ${context.reason}`);
  }

  return parts.join(' ');
};

/**
 * Formats MAX_ATTEMPTS_EXCEEDED error
 */
const formatMaxAttemptsExceeded = (
  context: MaxAttemptsExceededContext
): string => {
  let message = `Maximum attempts exceeded (${context.maxAttempts})`;

  if (context.lastError) {
    message += `; last error: ${context.lastError}`;
  }

  return message;
};

/**
 * Formats API_ERROR error
 */
const formatApiError = (context: ApiErrorContext): string => {
  const parts: string[] = ['API error'];

  if (context.provider) {
    parts.push(`from ${context.provider}`);
  }

  if (context.statusCode !== undefined) {
    parts.push(`(status ${context.statusCode})`);
  }

  if (context.message) {
    parts.push(`; ${context.message}`);
  }

  return parts.join(' ');
};

/**
 * Formats RATE_LIMIT_ERROR error
 */
const formatRateLimitError = (context: RateLimitErrorContext): string => {
  const parts: string[] = ['Rate limit exceeded'];

  if (context.provider) {
    parts.push(`for ${context.provider}`);
  }

  if (context.retryAfter !== undefined) {
    parts.push(`; retry after ${context.retryAfter}s`);
  }

  if (context.limit) {
    parts.push(`(limit: ${context.limit})`);
  }

  return parts.join(' ');
};

/**
 * Formats TOKEN_LIMIT_EXCEEDED error
 */
const formatTokenLimitExceeded = (
  context: TokenLimitExceededContext
): string => {
  const parts: string[] = ['Token limit exceeded'];

  if (
    context.requestedTokens !== undefined &&
    context.maximumTokens !== undefined
  ) {
    parts.push(`; requested ${context.requestedTokens}, maximum is ${context.maximumTokens}`);
  }

  if (context.provider) {
    parts.push(`(${context.provider})`);
  }

  return parts.join(' ');
};

/**
 * Formats INVALID_RESPONSE error
 */
const formatInvalidResponse = (context: InvalidResponseContext): string => {
  const parts: string[] = ['Invalid response from model'];

  if (context.responseType) {
    parts.push(`; got ${context.responseType}`);
  }

  if (context.reason) {
    parts.push(`(${context.reason})`);
  }

  return parts.join(' ');
};

/**
 * Formats METRICS_COLLECTION_FAILED error
 */
const formatMetricsCollectionFailed = (
  context: MetricsCollectionFailedContext
): string => {
  const parts: string[] = ['Metrics collection failed'];

  if (context.metricType) {
    parts.push(`for ${context.metricType}`);
  }

  if (context.reason) {
    parts.push(`; ${context.reason}`);
  }

  return parts.join(' ');
};

/**
 * Formats LOGGING_FAILED error
 */
const formatLoggingFailed = (context: LoggingFailedContext): string => {
  const parts: string[] = ['Logging failed'];

  if (context.logLevel) {
    parts.push(`at ${context.logLevel} level`);
  }

  if (context.reason) {
    parts.push(`; ${context.reason}`);
  }

  return parts.join(' ');
};

/**
 * Formats a single agent error into a human-readable message
 *
 * Uses templated messages for each error code with contextual information.
 * Handles null/undefined context values gracefully.
 *
 * @param error - The error to format
 * @returns Formatted error message
 */
export const formatAgentError = (error: AgentError): string => {
  let baseMessage: string;

  switch (error.code) {
    case AGENT_ERROR_CODES.EMPTY_NAME:
      baseMessage = formatEmptyName(error.context);
      break;

    case AGENT_ERROR_CODES.EMPTY_DESCRIPTION:
      baseMessage = formatEmptyDescription(error.context);
      break;

    case AGENT_ERROR_CODES.EMPTY_MODEL_NAME:
      baseMessage = formatEmptyModelName(error.context);
      break;

    case AGENT_ERROR_CODES.MISSING_OUTPUT_SCHEMA:
      baseMessage = formatMissingOutputSchema(error.context);
      break;

    case AGENT_ERROR_CODES.INVALID_MAX_ATTEMPTS:
      baseMessage = formatInvalidMaxAttempts(error.context);
      break;

    case AGENT_ERROR_CODES.INVALID_TEMPERATURE:
      baseMessage = formatInvalidTemperature(error.context);
      break;

    case AGENT_ERROR_CODES.INVALID_MAX_TOKENS:
      baseMessage = formatInvalidMaxTokens(error.context);
      break;

    case AGENT_ERROR_CODES.PROMPT_GENERATION_FAILED:
      baseMessage = formatPromptGenerationFailed(error.context);
      break;

    case AGENT_ERROR_CODES.VALIDATION_FAILED:
      baseMessage = formatValidationFailed(error.context);
      break;

    case AGENT_ERROR_CODES.MAX_ATTEMPTS_EXCEEDED:
      baseMessage = formatMaxAttemptsExceeded(error.context);
      break;

    case AGENT_ERROR_CODES.API_ERROR:
      baseMessage = formatApiError(error.context);
      break;

    case AGENT_ERROR_CODES.RATE_LIMIT_ERROR:
      baseMessage = formatRateLimitError(error.context);
      break;

    case AGENT_ERROR_CODES.TOKEN_LIMIT_EXCEEDED:
      baseMessage = formatTokenLimitExceeded(error.context);
      break;

    case AGENT_ERROR_CODES.INVALID_RESPONSE:
      baseMessage = formatInvalidResponse(error.context);
      break;

    case AGENT_ERROR_CODES.METRICS_COLLECTION_FAILED:
      baseMessage = formatMetricsCollectionFailed(error.context);
      break;

    case AGENT_ERROR_CODES.LOGGING_FAILED:
      baseMessage = formatLoggingFailed(error.context);
      break;
  }

  return appendMetadata(baseMessage, error.path, error.suggestion);
};

/**
 * Formats multiple agent errors into developer-readable text
 *
 * Groups errors by severity (errors first, then warnings) and formats each
 * with a bulleted list under severity headers.
 *
 * @param errors - Array of errors to format
 * @returns Formatted error summary, or empty string if no errors
 */
export const formatAgentErrorsForDeveloper = (errors: AgentError[]): string =>
  formatErrorsBySeverity(errors, formatAgentError, 'markdown');
