/**
 * Prompt building utilities for agent execution
 *
 * These functions wrap the agent's prompt functions and handle any errors that occur
 * during prompt generation, converting them into structured AgentError format.
 */

import type {AgentDefinition} from '@sigil/src/agent/framework/defineAgent/defineAgent';
import type {AgentExecutionState} from '@sigil/src/agent/framework/types';
import type {Result, AgentError} from '@sigil/src/common/errors';
import {ok, err, AGENT_ERROR_CODES} from '@sigil/src/common/errors';

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
