import type Anthropic from '@anthropic-ai/sdk';

import type {AgentDefinition} from '@sigil/src/agent/framework/defineAgent';
import {buildErrorPrompt} from '@sigil/src/agent/framework/prompts/build';
import type {AgentExecutionContext} from '@sigil/src/agent/framework/types';
import type {ValidationLayerIdentity} from '@sigil/src/agent/framework/validation';
import {formatValidationErrorForPrompt} from '@sigil/src/agent/framework/validation/format';
import type {Result} from '@sigil/src/common/errors';
import {err, isErr, ok} from '@sigil/src/common/errors';

import type {DurationMetrics, ExecuteCallbacks, ExecuteFailure, TokenMetrics} from '../types';
import {safeInvokeCallback} from '../util';

import {buildMetadata} from './buildMetadata';

/**
 * Parameters for handling validation failure
 *
 * @template Input - The type of input data the agent accepts
 * @template Output - The type of validated output the agent produces
 * @template Run - The type of run state (persists across attempts)
 * @template Attempt - The type of attempt state (resets each attempt)
 */
export interface HandleValidationFailureParams<Input, Output, Run extends object, Attempt extends object> {
	/**
	 * Validation error from failed validation
	 */
	validationError: unknown;

	/**
	 * Current execution context
	 */
	context: AgentExecutionContext;

	/**
	 * Agent definition containing prompt builders
	 */
	agent: AgentDefinition<Input, Output, Run, Attempt>;

	/**
	 * Last failed validation layer metadata for error formatting
	 */
	lastFailedLayer: ValidationLayerIdentity;

	/**
	 * Last response from the model (contains content to append)
	 */
	lastResponse: Anthropic.Message;

	/**
	 * Conversation history to append to (mutated in place)
	 */
	conversationHistory: Anthropic.MessageParam[];

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
 * Handles validation failure by formatting errors and updating conversation history
 *
 * Orchestrates the failure flow:
 * 1. Invoke onAttemptComplete callback with success = false
 * 2. Invoke onValidationFailure callback with validation error
 * 3. Append assistant response to conversation history
 * 4. Format validation errors for prompt using layer-specific context
 * 5. Build error prompt with formatted errors
 * 6. Append error prompt to conversation history
 *
 * @param params - Failure handling parameters
 * @returns Result containing void on success, or ExecuteFailure if prompt building failed
 */
export const handleValidationFailure = async <Input, Output, Run extends object, Attempt extends object>(
	params: HandleValidationFailureParams<Input, Output, Run, Attempt>
): Promise<Result<void, ExecuteFailure>> => {
	// Invoke onAttemptComplete callback with failure
	safeInvokeCallback(
		params.callbacks?.onAttemptComplete,
		[{...params.context}, false],
		params.callbackErrors
	);

	// Invoke onValidationFailure callback
	safeInvokeCallback(
		params.callbacks?.onValidationFailure,
		[{...params.context}, params.validationError],
		params.callbackErrors
	);

	// Append assistant response to conversation history
	// lastResponse is guaranteed to be defined here because output was extracted from it
	params.conversationHistory.push({
		role: 'assistant',
		content: params.lastResponse.content,
	});

	// Format validation errors for prompt using layer-specific context
	// Falls back to generic context if layer metadata is missing or empty
	const layerName = params.lastFailedLayer.name || 'validation';
	const layerDescription = params.lastFailedLayer.description || 'No description provided for validation layer';
	const formattedError = formatValidationErrorForPrompt(
		params.validationError,
		layerName,
		layerDescription
	);

	// Find output tool's tool_use_id from last response
	// Required to add tool_result for API protocol compliance
	const outputToolName = params.agent.tools.output.name;
	const outputToolUse = params.lastResponse.content.find(
		(block): block is Anthropic.ToolUseBlock =>
			block.type === 'tool_use' && block.name === outputToolName
	);

	if (outputToolUse) {
		// Add tool_result with is_error for validation failure
		// This satisfies Anthropic API requirement: every tool_use needs a corresponding tool_result
		const toolResultContent = `Validation failed:\n${formattedError}`;

		params.conversationHistory.push({
			role: 'user',
			content: [
				{
					type: 'tool_result',
					tool_use_id: outputToolUse.id,
					content: toolResultContent,
					is_error: true,
				},
			],
		});

		// Invoke onToolResult callback for observability
		safeInvokeCallback(
			params.callbacks?.onToolResult,
			[{...params.context}, outputToolName, toolResultContent],
			params.callbackErrors
		);
	}

	// Build error prompt
	const errorPromptResult = await buildErrorPrompt(
		params.agent,
		formattedError,
		params.context,
	);

	if (isErr(errorPromptResult)) {
		return err({
			errors: errorPromptResult.error,
			metadata: buildMetadata({
				observability: params.agent.observability,
				durationMetrics: params.durationMetrics,
				tokenMetrics: params.tokenMetrics,
				callbackErrors: params.callbackErrors
			}),
		});
	}

	// Append error prompt to conversation history
	params.conversationHistory.push({
		role: 'user',
		content: errorPromptResult.data,
	});

	return ok(undefined);
};
