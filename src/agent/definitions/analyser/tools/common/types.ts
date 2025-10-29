/**
 * Metrics describing the size of raw data in various units
 *
 * Used by parser tools to report data size to the analyser agent,
 * helping determine if sampling or truncation is needed.
 */
export interface SizeMetrics {
	/**
	 * Size in bytes (UTF-8 encoded)
	 */
	bytes: number;

	/**
	 * Number of characters (string length)
	 */
	characters: number;

	/**
	 * Number of lines (separated by \n or \r\n)
	 */
	lines: number;
}

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
