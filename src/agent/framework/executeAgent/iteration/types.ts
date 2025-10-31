/**
 * Duration metrics for execution tracking
 */
export interface DurationMetrics {
	/**
	 * Execution start time from performance.now()
	 */
	startTime: number;
}

/**
 * Token count tracking
 */
export interface TokenMetrics {
	/**
	 * Total input tokens consumed
	 */
	input: number;

	/**
	 * Total output tokens generated
	 */
	output: number;
}
