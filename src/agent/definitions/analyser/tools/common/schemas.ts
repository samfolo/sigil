/**
 * Zod schemas and types for common analyser tool structures
 *
 * Single source of truth for shared data structures used across analyser tools.
 * Types are exported using z.infer to guarantee runtime/compile-time consistency.
 */

import {z} from 'zod';

/**
 * Metrics describing the size of raw data in various units
 *
 * Used by parser tools to report data size to the analyser agent,
 * helping determine if sampling or truncation is needed.
 */
export const SizeMetricsSchema = z.object({
	/**
	 * Size in bytes (UTF-8 encoded)
	 */
	bytes: z.number().int().nonnegative().describe('Size in bytes (UTF-8 encoded)'),

	/**
	 * Number of characters (string length)
	 */
	characters: z.number().int().nonnegative().describe('Number of characters (string length)'),

	/**
	 * Number of lines (separated by \n or \r\n)
	 */
	lines: z.number().int().nonnegative().describe('Number of lines (separated by \\n or \\r\\n)'),
});

export type SizeMetrics = z.infer<typeof SizeMetricsSchema>;

/**
 * A value that may not be complete or precise due to constraints
 *
 * Generic type for values that may be capped, truncated, or otherwise limited.
 * - For strings: truncated to fit length limits (e.g., "long text..." with exact: false)
 * - For numbers: capped to maximum depth/size (e.g., depth capped at 20 with exact: false)
 *
 * @template T - The type of the value (string, number, etc.)
 */
export interface PrecisionValue<T> {
	/**
	 * The value (possibly incomplete)
	 */
	value: T;

	/**
	 * Whether the value is exact/complete
	 *
	 * - true: value is complete and precise
	 * - false: value was capped, truncated, or limited in some way
	 */
	exact: boolean;
}

/**
 * Creates a schema for a precision value that may be incomplete or truncated
 *
 * @param valueSchema - Zod schema for the value type
 */
export const precisionValueSchema = <ValueType extends z.ZodTypeAny>(valueSchema: ValueType) =>
	z.object({
		value: valueSchema.describe('The value (possibly incomplete)'),
		exact: z.boolean().describe('Whether the value is exact/complete'),
	});
