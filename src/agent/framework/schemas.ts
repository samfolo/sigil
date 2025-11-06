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
