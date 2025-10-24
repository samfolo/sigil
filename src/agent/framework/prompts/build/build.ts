/**
 * Prompt building utilities for agent execution
 *
 * These functions wrap the agent's prompt functions and handle any errors that occur
 * during prompt generation, converting them into structured AgentError format.
 */

import type {AgentDefinition} from '@sigil/src/agent/framework/defineAgent/defineAgent';
import type {AgentExecutionState} from '@sigil/src/agent/framework/types';
import type {Result, AgentError} from '@sigil/src/common/errors';
import {ok, err, isErr, AGENT_ERROR_CODES} from '@sigil/src/common/errors';

/**
 * Builds system prompt by calling the agent's system prompt function
 *
 * Handles both synchronous throws and asynchronous rejections, wrapping any errors
 * as PROMPT_GENERATION_FAILED with appropriate context.
 *
 * @template Input - The type of input the agent accepts
 * @template Output - The type of output the agent produces
 * @param agent - Agent definition containing the system prompt function
 * @param input - Input data to pass to the prompt function
 * @param state - Execution state containing attempt number and max attempts
 * @returns Result containing generated prompt string or array of agent errors
 *
 * @example
 * ```typescript
 * const result = await buildSystemPrompt(agent, {query: 'Analyse data'}, {attempt: 1, maxAttempts: 3});
 * if (isOk(result)) {
 *   console.log(result.data); // Generated system prompt
 * } else {
 *   console.error(result.error); // PROMPT_GENERATION_FAILED error
 * }
 * ```
 */
export const buildSystemPrompt = async <Input, Output>(
	agent: AgentDefinition<Input, Output>,
	input: Input,
	state: AgentExecutionState
): Promise<Result<string, AgentError[]>> => {
	try {
		const prompt = await agent.prompts.system(input, state);
		return ok(prompt);
	} catch (error) {
		return err([
			{
				code: AGENT_ERROR_CODES.PROMPT_GENERATION_FAILED,
				severity: 'error',
				category: 'execution',
				context: {
					promptType: 'system',
					reason: error instanceof Error ? error.message : String(error),
					attempt: state.attempt,
				},
			},
		]);
	}
};

/**
 * Builds user prompt by calling the agent's user prompt function
 *
 * Handles both synchronous throws and asynchronous rejections, wrapping any errors
 * as PROMPT_GENERATION_FAILED with appropriate context.
 *
 * @template Input - The type of input the agent accepts
 * @template Output - The type of output the agent produces
 * @param agent - Agent definition containing the user prompt function
 * @param input - Input data to pass to the prompt function
 * @param state - Execution state containing attempt number and max attempts
 * @returns Result containing generated prompt string or array of agent errors
 *
 * @example
 * ```typescript
 * const result = await buildUserPrompt(agent, {query: 'Analyse data'}, {attempt: 1, maxAttempts: 3});
 * if (isOk(result)) {
 *   console.log(result.data); // Generated user prompt
 * } else {
 *   console.error(result.error); // PROMPT_GENERATION_FAILED error
 * }
 * ```
 */
export const buildUserPrompt = async <Input, Output>(
	agent: AgentDefinition<Input, Output>,
	input: Input,
	state: AgentExecutionState
): Promise<Result<string, AgentError[]>> => {
	try {
		const prompt = await agent.prompts.user(input, state);
		return ok(prompt);
	} catch (error) {
		return err([
			{
				code: AGENT_ERROR_CODES.PROMPT_GENERATION_FAILED,
				severity: 'error',
				category: 'execution',
				context: {
					promptType: 'user',
					reason: error instanceof Error ? error.message : String(error),
					attempt: state.attempt,
				},
			},
		]);
	}
};

/**
 * Builds error prompt by calling the agent's error prompt function
 *
 * Handles both synchronous throws and asynchronous rejections, wrapping any errors
 * as PROMPT_GENERATION_FAILED with appropriate context.
 *
 * @template Input - The type of input the agent accepts
 * @template Output - The type of output the agent produces
 * @param agent - Agent definition containing the error prompt function
 * @param formattedError - Formatted error string to pass to the prompt function
 * @param state - Execution state containing attempt number and max attempts
 * @returns Result containing generated prompt string or array of agent errors
 *
 * @example
 * ```typescript
 * const result = await buildErrorPrompt(agent, 'Validation failed', {attempt: 2, maxAttempts: 3});
 * if (isOk(result)) {
 *   console.log(result.data); // Generated error prompt
 * } else {
 *   console.error(result.error); // PROMPT_GENERATION_FAILED error
 * }
 * ```
 */
export const buildErrorPrompt = async <Input, Output>(
	agent: AgentDefinition<Input, Output>,
	formattedError: string,
	state: AgentExecutionState
): Promise<Result<string, AgentError[]>> => {
	try {
		const prompt = await agent.prompts.error(formattedError, state);
		return ok(prompt);
	} catch (error) {
		return err([
			{
				code: AGENT_ERROR_CODES.PROMPT_GENERATION_FAILED,
				severity: 'error',
				category: 'execution',
				context: {
					promptType: 'error',
					reason: error instanceof Error ? error.message : String(error),
					attempt: state.attempt,
				},
			},
		]);
	}
};

/**
 * Result of building all prompts
 */
export interface BuiltPrompts {
	/**
	 * System prompt string
	 */
	system: string;

	/**
	 * User prompt string
	 */
	user: string;

	/**
	 * Error prompt string (only present on retry attempts with validation errors)
	 */
	error?: string;
}

/**
 * Builds all required prompts for an agent execution attempt
 *
 * Convenience wrapper that builds system, user, and (conditionally) error prompts in one call.
 * Provides fail-fast behaviour: if any prompt generation fails, returns that error immediately.
 *
 * On first attempt (state.attempt === 1): Builds only system and user prompts
 * On retry attempts (state.attempt > 1): Builds system, user, and error prompts if errors provided
 *
 * @template Input - The type of input the agent accepts
 * @template Output - The type of output the agent produces
 * @param agent - Agent definition containing prompt functions
 * @param input - Input data to pass to prompt functions
 * @param state - Execution state containing attempt number and max attempts
 * @param formattedError - Optional formatted error string from previous attempt
 * @returns Result containing all built prompts or array of agent errors
 *
 * @example
 * ```typescript
 * // First attempt - no error prompt
 * const result = await buildAllPrompts(agent, {query: 'Analyse data'}, {attempt: 1, maxAttempts: 3});
 * if (isOk(result)) {
 *   console.log(result.data.system); // System prompt
 *   console.log(result.data.user);   // User prompt
 *   console.log(result.data.error);  // undefined
 * }
 *
 * // Retry attempt - includes error prompt
 * const retryResult = await buildAllPrompts(
 *   agent,
 *   {query: 'Analyse data'},
 *   {attempt: 2, maxAttempts: 3},
 *   'Validation failed: missing field'
 * );
 * if (isOk(retryResult)) {
 *   console.log(retryResult.data.system); // System prompt
 *   console.log(retryResult.data.user);   // User prompt
 *   console.log(retryResult.data.error);  // Error prompt with validation feedback
 * }
 * ```
 */
export const buildAllPrompts = async <Input, Output>(
	agent: AgentDefinition<Input, Output>,
	input: Input,
	state: AgentExecutionState,
	formattedError?: string
): Promise<Result<BuiltPrompts, AgentError[]>> => {
	// Build system prompt (fail-fast)
	const systemResult = await buildSystemPrompt(agent, input, state);
	if (isErr(systemResult)) {
		return systemResult;
	}

	// Build user prompt (fail-fast)
	const userResult = await buildUserPrompt(agent, input, state);
	if (isErr(userResult)) {
		return userResult;
	}

	// Build error prompt only on retry attempts when errors are provided
	const shouldBuildErrorPrompt = state.attempt > 1 && formattedError !== undefined;

	if (shouldBuildErrorPrompt) {
		const errorResult = await buildErrorPrompt(agent, formattedError, state);
		if (isErr(errorResult)) {
			return errorResult;
		}

		return ok({
			system: systemResult.data,
			user: userResult.data,
			error: errorResult.data,
		});
	}

	return ok({
		system: systemResult.data,
		user: userResult.data,
	});
};
