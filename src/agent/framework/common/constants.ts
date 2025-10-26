/**
 * Default maximum number of iterations per attempt
 *
 * Prevents runaway tool-calling loops that consume excessive tokens.
 * Can be overridden via ValidationConfig.maxIterationsPerAttempt.
 */
export const DEFAULT_MAX_ITERATIONS = 15;
