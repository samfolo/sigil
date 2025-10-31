import type {ObservabilityConfig} from '@sigil/src/agent/framework/defineAgent';
import type {AgentExecutionContext} from '@sigil/src/agent/framework/types';
import type {Result} from '@sigil/src/common/errors';
import {ok} from '@sigil/src/common/errors';

import type {ExecuteSuccess, ExecuteCallbacks} from '../types';
import {safeInvokeCallback} from '../util';

import {buildMetadata} from './buildMetadata';
import type {DurationMetrics, TokenMetrics} from './types';

/**
 * Parameters for handling validation success
 *
 * @template Output - The type of validated output the agent produces
 */
export interface HandleValidationSuccessParams<Output> {
	/**
	 * Validated output from the agent
	 */
	output: Output;

	/**
	 * Current execution context
	 */
	context: AgentExecutionContext;

	/**
	 * Observability configuration for metadata tracking
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
	 * Array to collect callback errors
	 */
	callbackErrors: Error[];

	/**
	 * Callback functions for observability
	 */
	callbacks?: ExecuteCallbacks<Output>;
}

/**
 * Handles successful validation by invoking callbacks and building success result
 *
 * Orchestrates the success flow:
 * 1. Invoke onAttemptComplete callback with success = true
 * 2. Invoke onSuccess callback with validated output
 * 3. Build execution metadata (latency, tokens, callback errors)
 * 4. Return ExecuteSuccess result
 *
 * @param params - Success handling parameters
 * @returns Result containing ExecuteSuccess with output, attempts, and metadata
 */
export const handleValidationSuccess = <Output>(
	params: HandleValidationSuccessParams<Output>
): Result<ExecuteSuccess<Output>, never> => {
	// Invoke onAttemptComplete callback with success
	safeInvokeCallback(
		params.callbacks?.onAttemptComplete,
		[{...params.context}, true],
		params.callbackErrors
	);

	// Invoke onSuccess callback
	safeInvokeCallback(
		params.callbacks?.onSuccess,
		[params.output],
		params.callbackErrors
	);

	// Build metadata based on observability configuration
	const metadata = buildMetadata({
		observability: params.observability,
		durationMetrics: params.durationMetrics,
		tokenMetrics: params.tokenMetrics,
		callbackErrors: params.callbackErrors
	});

	return ok({
		output: params.output,
		attempts: params.context.attempt,
		metadata,
	});
};
