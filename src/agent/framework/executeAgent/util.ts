import type {Result} from '@sigil/src/common/errors';
import {isErr} from '@sigil/src/common/errors';

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
