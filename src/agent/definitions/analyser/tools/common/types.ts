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
 * A string value that may have been truncated to fit length constraints
 *
 * Used when displaying data samples to indicate whether the full value
 * is shown or if it has been shortened with an ellipsis.
 */
export interface TruncatedValue {
	/**
	 * The string value (possibly truncated with "..." suffix)
	 */
	value: string;

	/**
	 * Whether the value was truncated
	 */
	truncated: boolean;
}
