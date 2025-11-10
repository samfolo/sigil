import type {AgentExecutionContext} from '@sigil/src/agent/framework';
import type {ObservabilityConfig} from '@sigil/src/agent/framework/defineAgent';
import type {Result} from '@sigil/src/common/errors';
import {ok} from '@sigil/src/common/errors';

import type {DurationMetrics, ExecuteCallbacks, ExecuteSuccess, TokenMetrics} from '../schemas';
import {safeInvokeCallback} from '../util';

import {buildMetadata} from './buildMetadata';

/**
 * Parameters for handling validation success
 *
 * @template Output - The type of validated output the agent produces
 * @template Run - User run state type
 */
export interface HandleValidationSuccessParams<Output, Run extends object> {
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

	/**
	 * Final run state for projection
	 */
	runState: Run;

	/**
	 * Optional projection function from agent definition
	 */
	projectFinalState?: (runState: Readonly<Run>) => unknown;
}

/**
 * Handles successful validation by invoking callbacks and building success result
 *
 * Orchestrates the success flow:
 * 1. Invoke onAttemptComplete callback with success = true
 * 2. Build execution metadata (latency, tokens, callback errors)
 * 3. Invoke onSuccess callback with validated output and metadata
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

	// Build metadata based on observability configuration
	const metadata = buildMetadata({
		observability: params.observability,
		durationMetrics: params.durationMetrics,
		tokenMetrics: params.tokenMetrics,
		callbackErrors: params.callbackErrors
	});

	// Invoke onSuccess callback with output and metadata
	safeInvokeCallback(
		params.callbacks?.onSuccess,
		[params.output, metadata],
		params.callbackErrors
	);

	return ok({
		output: params.output,
		attempts: params.context.attempt,
		metadata,
	});
};
