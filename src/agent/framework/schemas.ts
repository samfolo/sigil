/**
 * Zod schemas for core agent framework types
 *
 * Single source of truth for framework types used across agent execution,
 * callbacks, and observability. Types are derived from these schemas to
 * ensure runtime validation matches compile-time types.
 */

import {z} from 'zod';

/**
 * Execution context tracking attempt and iteration progress
 *
 * Passed to all execution callbacks to provide context about where
 * the agent is in its execution flow (which attempt, which iteration).
 */
export const AgentExecutionContextSchema = z.object({
	/**
	 * Current attempt number (1-indexed)
	 */
	attempt: z.number().int().positive().describe('Current attempt number (1-indexed)'),

	/**
	 * Maximum attempts allowed
	 */
	maxAttempts: z.number().int().positive().describe('Maximum attempts allowed'),

	/**
	 * Current iteration within attempt (1-indexed)
	 */
	iteration: z.number().int().nonnegative().describe('Current iteration within attempt (1-indexed)'),

	/**
	 * Maximum iterations per attempt
	 */
	maxIterations: z.number().int().positive().describe('Maximum iterations per attempt'),
});

export type AgentExecutionContext = z.infer<typeof AgentExecutionContextSchema>;

/**
 * Token usage metrics for Claude API requests
 *
 * Tracks input/output tokens and prompt caching metrics across
 * all API calls during agent execution.
 */
export const TokenMetricsSchema = z.object({
	/**
	 * Total input tokens consumed
	 */
	input: z.number().int().nonnegative().describe('Total input tokens consumed'),

	/**
	 * Total output tokens generated
	 */
	output: z.number().int().nonnegative().describe('Total output tokens generated'),

	/**
	 * Total tokens used to create cache entries
	 */
	cacheCreationInput: z.number().int().nonnegative().optional().describe('Total tokens used to create cache entries'),

	/**
	 * Total tokens read from cache
	 */
	cacheReadInput: z.number().int().nonnegative().optional().describe('Total tokens read from cache'),
});

export type TokenMetrics = z.infer<typeof TokenMetricsSchema>;
