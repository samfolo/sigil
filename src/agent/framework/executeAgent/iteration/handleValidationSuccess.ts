import type {AgentExecutionContext} from '@sigil/src/agent/framework';
import type {AgentState, ObservabilityConfig} from '@sigil/src/agent/framework/defineAgent';
import type {Result} from '@sigil/src/common/errors';
import {ok, err, AGENT_ERROR_CODES} from '@sigil/src/common/errors';

import type {DurationMetrics, ExecuteCallbacks, ExecuteSuccess, ExecuteFailure, TokenMetrics} from '../schemas';
import {safeInvokeCallback} from '../util';

import {buildMetadata} from './buildMetadata';

/**
 * Parameters for handling validation success
 *
 * @template Output - The type of validated output the agent produces
 * @template Run - User run state type
 * @template Attempt - User attempt state type
 * @template ProjectedState - Type of state projection
 */
export interface HandleValidationSuccessParams<
  Output,
  Run extends object,
  Attempt extends object,
  ProjectedState
> {
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
	 * Final attempt state for projection
	 */
	attemptState: Attempt;

	/**
	 * Optional projection function from agent definition
	 */
	projectFinalState?: (state: Readonly<AgentState<Run, Attempt>>) => ProjectedState;
}

/**
 * Handles successful validation by invoking callbacks and building success result
 *
 * Orchestrates the success flow:
 * 1. Invoke onAttemptComplete callback with success = true
 * 2. Call projectFinalState if defined to extract state projection (fails execution if throws)
 * 3. Build execution metadata (latency, tokens, callback errors)
 * 4. Invoke onSuccess callback with output and metadata
 * 5. Return ExecuteSuccess result with optional stateProjection
 *
 * @param params - Success handling parameters
 * @returns Result containing ExecuteSuccess with output, attempts, metadata, and optional stateProjection
 */
export const handleValidationSuccess = <
  Output,
  Run extends object,
  Attempt extends object,
  ProjectedState
>(
		params: HandleValidationSuccessParams<Output, Run, Attempt, ProjectedState>
	): Result<ExecuteSuccess<Output, ProjectedState>, ExecuteFailure> => {
	// Invoke onAttemptComplete callback with success
	safeInvokeCallback(
		params.callbacks?.onAttemptComplete,
		[{...params.context}, true],
		params.callbackErrors
	);

	// Call projectFinalState if defined to extract state projection
	let stateProjection: ProjectedState | undefined;
	let projectionError: Error | undefined;

	if (params.projectFinalState) {
		try {
			const fullState: AgentState<Run, Attempt> = {
				context: params.context,
				run: params.runState,
				attempt: params.attemptState,
			};
			stateProjection = params.projectFinalState(fullState);
		} catch (error) {
			projectionError = error instanceof Error ? error : new Error(String(error));
		}
	}

	// Build metadata based on observability configuration
	const metadata = buildMetadata({
		observability: params.observability,
		durationMetrics: params.durationMetrics,
		tokenMetrics: params.tokenMetrics,
		callbackErrors: params.callbackErrors
	});

	// If projection failed, return error
	if (projectionError) {
		return err({
			errors: [{
				code: AGENT_ERROR_CODES.STATE_PROJECTION_FAILED,
				severity: 'error',
				category: 'execution',
				context: {
					error: projectionError.message,
				},
			}],
			metadata,
		});
	}

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
		stateProjection,
	});
};
