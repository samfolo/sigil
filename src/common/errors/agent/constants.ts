/**
 * Constants for agent validation and error handling
 *
 * Centralised validation constraints and error message templates to avoid
 * magic strings and ensure consistency across the codebase.
 */

/**
 * Validation constraints for agent configuration
 */
export const AGENT_VALIDATION_CONSTRAINTS = {
  /**
   * Minimum value for validation maxAttempts
   */
  MIN_MAX_ATTEMPTS: 1,

  /**
   * Minimum value for model temperature
   */
  MIN_TEMPERATURE: 0,

  /**
   * Maximum value for model temperature
   */
  MAX_TEMPERATURE: 1,

  /**
   * Minimum value for model maxTokens
   */
  MIN_MAX_TOKENS: 1,
} as const;
