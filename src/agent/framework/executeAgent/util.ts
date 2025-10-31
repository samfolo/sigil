import type {ObservabilityConfig} from '@sigil/src/agent/framework/defineAgent';
import type {AgentError, ExecutionPhase, Result} from '@sigil/src/common/errors';
import {AGENT_ERROR_CODES, isErr} from '@sigil/src/common/errors';

import type {DurationMetrics, ExecuteFailure, TokenMetrics} from './types';

/**
 * Formatted tool result for Anthropic API
 */
interface FormattedToolResult {
	content: string;
	is_error?: boolean;
}

/**
 * Formats a reflection handler result for Anthropic API
 *
 * @param result - Result from reflection handler (ok = continue, err = show error to model)
 * @returns Formatted tool result with content and optional error flag
 */
export const formatReflectionHandlerResult = (result: Result<string, string>): FormattedToolResult => {
	if (isErr(result)) {
		return {
			content: result.error,
			is_error: true,
		};
	}
	return {
		content: result.data,
	};
};

/**
 * Helper function to safely invoke callbacks and collect errors
 *
 * Wraps callback invocations in try-catch to prevent callback failures from
 * breaking agent execution. Collects any callback errors for inclusion in metadata.
 *
 * @param callback - The callback function to invoke (may be undefined)
 * @param args - Arguments to pass to the callback
 * @param callbackErrors - Array to collect any errors that occur
 */
export const safeInvokeCallback = <Args extends unknown[]>(
	callback: ((...args: Args) => void) | undefined,
	args: Args,
	callbackErrors: Error[]
): void => {
	if (!callback) {
		return;
	}

	try {
		callback(...args);
	} catch (error) {
		callbackErrors.push(
			error instanceof Error ? error : new Error(String(error))
		);
	}
};

/**
 * Options for creating a cancellation error
 */
interface CreateCancellationErrorOptions {
	/**
	 * Current attempt number when cancellation occurred
	 */
	attempt: number;

	/**
	 * Execution phase where cancellation was detected
	 */
	phase: ExecutionPhase;

	/**
	 * Observability configuration for metadata tracking
	 */
	observability: ObservabilityConfig;

	/**
	 * Duration metrics for latency tracking
	 */
	durationMetrics: DurationMetrics;

	/**
	 * Token metrics for usage tracking
	 */
	tokenMetrics: TokenMetrics;

	/**
	 * Array of callback errors collected during execution
	 */
	callbackErrors: Error[];

	/**
	 * Function to build execution metadata
	 */
	buildMetadata: (options: {
		observability: ObservabilityConfig;
		durationMetrics: DurationMetrics;
		tokenMetrics: TokenMetrics;
		callbackErrors: Error[];
	}) => ExecuteFailure['metadata'];
}

/**
 * Creates an EXECUTION_CANCELLED error with proper context
 *
 * Shared utility for creating cancellation errors with consistent structure
 * across the execution pipeline. Handles metadata building based on observability
 * configuration.
 *
 * @param options - Cancellation error options
 * @returns ExecuteFailure with EXECUTION_CANCELLED error
 */
export const createCancellationError = (options: CreateCancellationErrorOptions): ExecuteFailure => {
	const error: AgentError = {
		code: AGENT_ERROR_CODES.EXECUTION_CANCELLED,
		severity: 'error',
		category: 'execution',
		context: {
			attempt: options.attempt,
			phase: options.phase,
		},
	};

	const metadata = options.buildMetadata({
		observability: options.observability,
		durationMetrics: options.durationMetrics,
		tokenMetrics: options.tokenMetrics,
		callbackErrors: options.callbackErrors,
	});

	return {
		errors: [error],
		metadata,
	};
};
