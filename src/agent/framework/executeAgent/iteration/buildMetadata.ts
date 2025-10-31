import type {ObservabilityConfig} from '@sigil/src/agent/framework/defineAgent';

import type {DurationMetrics, ExecuteMetadata, TokenMetrics} from '../types';

/**
 * Options for building execution metadata
 */
export interface BuildMetadataOptions {
	/**
	 * Observability configuration from agent definition
	 */
	observability: ObservabilityConfig;

	/**
	 * Duration metrics
	 */
	durationMetrics: DurationMetrics;

	/**
	 * Token metrics
	 */
	tokenMetrics: TokenMetrics;

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
		metadata.latency = endTime - options.durationMetrics.startTime;
	}

	// Include token usage if tracking is enabled
	if (options.observability.trackTokens) {
		metadata.tokens = {
			input: options.tokenMetrics.input,
			output: options.tokenMetrics.output,
		};
	}

	// Always include callback errors if any occurred
	if (options.callbackErrors.length > 0) {
		metadata.callbackErrors = options.callbackErrors;
	}

	return metadata;
};
