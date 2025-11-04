/**
 * Prompt building utilities for agent execution
 *
 * These functions wrap the agent's prompt functions and handle any errors that occur
 * during prompt generation, converting them into structured AgentError format.
 */

import type Anthropic from '@anthropic-ai/sdk';

import type {AgentDefinition} from '@sigil/src/agent/framework/defineAgent/defineAgent';
import type {AgentExecutionContext} from '@sigil/src/agent/framework/types';
import type {Result, AgentError} from '@sigil/src/common/errors';
import {ok, err, AGENT_ERROR_CODES} from '@sigil/src/common/errors';
import type {EmptyObject} from '@sigil/src/common/types';

/**
 * Builds system prompt by calling agent's prompt function
 *
 * Called once before the retry loop to generate the static system prompt array.
 * The system prompt is preserved across all retry attempts. Each text block can
 * have cache_control for prompt caching efficiency.
 *
 * @param signal - Optional AbortSignal to cancel prompt generation
 * @returns Result with prompt text block array, or PROMPT_GENERATION_FAILED if function throws
 */
export const buildSystemPrompt = async <Input, Output, Run extends object = EmptyObject, Attempt extends object = EmptyObject>(
	agent: AgentDefinition<Input, Output, Run, Attempt>,
	input: Input,
	signal?: AbortSignal
): Promise<Result<Anthropic.Messages.TextBlockParam[], AgentError[]>> => {
	try {
		const prompt = await agent.prompts.system(input, signal);
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
 * @param signal - Optional AbortSignal to cancel prompt generation
 * @returns Result with prompt string, or PROMPT_GENERATION_FAILED if function throws
 */
export const buildUserPrompt = async <Input, Output, Run extends object = EmptyObject, Attempt extends object = EmptyObject>(
	agent: AgentDefinition<Input, Output, Run, Attempt>,
	input: Input,
	signal?: AbortSignal
): Promise<Result<string, AgentError[]>> => {
	try {
		const prompt = await agent.prompts.user(input, signal);
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
 * @param signal - Optional AbortSignal to cancel prompt generation
 * @returns Result with prompt string, or PROMPT_GENERATION_FAILED if function throws
 */
export const buildErrorPrompt = async <Input, Output, Run extends object = EmptyObject, Attempt extends object = EmptyObject>(
	agent: AgentDefinition<Input, Output, Run, Attempt>,
	formattedError: string,
	context: AgentExecutionContext,
	signal?: AbortSignal
): Promise<Result<string, AgentError[]>> => {
	try {
		const prompt = await agent.prompts.error(formattedError, context, signal);
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
					attempt: context.attempt,
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
  system: Anthropic.Messages.TextBlockParam[];
  user: string;
}

/**
 * Built prompts for retry attempt (includes error prompt)
 */
export interface RetryAttemptPrompts {
  isRetry: true;
  system: Anthropic.Messages.TextBlockParam[];
  user: string;
  error: string;
}

/**
 * Result of building all prompts (discriminated union)
 */
export type BuiltPrompts = FirstAttemptPrompts | RetryAttemptPrompts;
