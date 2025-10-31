import type {ObservabilityConfig} from '@sigil/src/agent/framework/defineAgent';

import type {ExecuteMetadata} from '../types';

/**
 * Options for building execution metadata
 */
export interface BuildMetadataOptions {
	/**
	 * Observability configuration from agent definition
	 */
	observability: ObservabilityConfig;

	/**
	 * Execution start time from performance.now()
	 */
	startTime: number;

	/**
	 * Total input tokens consumed across all attempts
	 */
	totalInputTokens: number;

	/**
	 * Total output tokens generated across all attempts
	 */
	totalOutputTokens: number;

	/**
	 * Array of callback errors (empty if none occurred)
	 */
	callbackErrors: Error[];
}

/**
 * Builds execution metadata based on observability configuration
 *
 * Conditionally includes latency and token usage based on agent's observability settings.
 * Always includes callback errors if any occurred during execution.
 */
export const buildMetadata = (options: BuildMetadataOptions): ExecuteMetadata => {
	const endTime = performance.now();
	const metadata: ExecuteMetadata = {};

	// Include latency if tracking is enabled
	if (options.observability.trackLatency) {
		metadata.latency = endTime - options.startTime;
	}

	// Include token usage if tracking is enabled
	if (options.observability.trackTokens) {
		metadata.tokens = {
			input: options.totalInputTokens,
			output: options.totalOutputTokens,
		};
	}

	// Always include callback errors if any occurred
	if (options.callbackErrors.length > 0) {
		metadata.callbackErrors = options.callbackErrors;
	}

	return metadata;
};
