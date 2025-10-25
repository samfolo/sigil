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
 * Builds system prompt by calling agent's prompt function
 *
 * @returns Result with prompt string, or PROMPT_GENERATION_FAILED if function throws
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
 * Builds user prompt by calling agent's prompt function
 *
 * Called once before the retry loop to generate the immutable task description.
 * The user prompt does not receive execution state since it represents the original
 * task requirements and is preserved across all retry attempts.
 *
 * @returns Result with prompt string, or PROMPT_GENERATION_FAILED if function throws
 */
export const buildUserPrompt = async <Input, Output>(
	agent: AgentDefinition<Input, Output>,
	input: Input
): Promise<Result<string, AgentError[]>> => {
	try {
		const prompt = await agent.prompts.user(input);
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
				},
			},
		]);
	}
};

/**
 * Builds error prompt by calling agent's prompt function
 *
 * @returns Result with prompt string, or PROMPT_GENERATION_FAILED if function throws
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
 * Built prompts for first attempt (no error prompt)
 */
export interface FirstAttemptPrompts {
	isRetry: false;
	system: string;
	user: string;
}

/**
 * Built prompts for retry attempt (includes error prompt)
 */
export interface RetryAttemptPrompts {
	isRetry: true;
	system: string;
	user: string;
	error: string;
}

/**
 * Result of building all prompts (discriminated union)
 */
export type BuiltPrompts = FirstAttemptPrompts | RetryAttemptPrompts;

/**
 * Builds all required prompts for an agent execution attempt
 *
 * First attempt (state.attempt === 1): Builds system and user prompts only
 * Retry attempts (state.attempt > 1): Builds system, user, and error prompts if formattedError provided
 *
 * Fail-fast: Returns first error encountered during prompt building.
 *
 * @param formattedError - Formatted error string from previous attempt
 * @returns Result with BuiltPrompts (discriminated by isRetry), or PROMPT_GENERATION_FAILED
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

	// Build error prompt only on retry attempts when errors are provided (non-empty)
	const shouldBuildErrorPrompt = state.attempt > 1 && !!formattedError;

	if (shouldBuildErrorPrompt) {
		const errorResult = await buildErrorPrompt(agent, formattedError, state);
		if (isErr(errorResult)) {
			return errorResult;
		}

		return ok({
			isRetry: true,
			system: systemResult.data,
			user: userResult.data,
			error: errorResult.data,
		});
	}

	return ok({
		isRetry: false,
		system: systemResult.data,
		user: userResult.data,
	});
};
