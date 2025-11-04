/**
 * Prompt builder functions for GenerateSigilIR Agent
 *
 * Builds prompts with two-segment prompt caching:
 * 1. System prompt template (agent instructions)
 * 2. Full ComponentSpec schema (raw JSON for token efficiency)
 *
 * Both segments use ephemeral cache control for 90% cost reduction on cache hits.
 */

import {resolve} from 'node:path';

import type Anthropic from '@anthropic-ai/sdk';

import type {
	SystemPromptFunction,
	UserPromptFunction,
	ErrorPromptFunction,
} from '@sigil/src/agent/framework/defineAgent';
import {
	loadTemplate,
	asUserPromptFunction,
	asErrorPromptFunction,
} from '@sigil/src/agent/framework/prompts/templateLoader';
import {isErr} from '@sigil/src/common/errors/result';

// Import the full ComponentSpec schema as raw JSON
import componentSpecSchema from '@sigil/spec/schema/specification.schema.json' assert {type: 'json'};

import type {GenerateSigilIRInput} from '../types';

/**
 * Builds system prompt function for GenerateSigilIR Agent
 *
 * Returns two-block cached prompt:
 * 1. Agent instructions from template
 * 2. Full ComponentSpec schema as JSON string
 *
 * Both blocks have ephemeral cache control for prompt caching efficiency.
 */
export const buildSystemPrompt = async (): Promise<SystemPromptFunction<GenerateSigilIRInput>> => {
	const templatePath = resolve(process.cwd(), 'src/agent/definitions/generateSigilIR/prompts/templates/system.liquid');
	const result = await loadTemplate<GenerateSigilIRInput>(templatePath);

	if (isErr(result)) {
		throw new Error(
			`Failed to load system template from ${templatePath}: ${result.error.message}`
		);
	}

	const templateFunction = result.data;

	// Return function that builds two-block cached prompt
	return async (input: GenerateSigilIRInput, signal?: AbortSignal): Promise<Anthropic.Messages.TextBlockParam[]> => {
		const instructionsText = await templateFunction(input, {attempt: 1, maxAttempts: 1, iteration: 1, maxIterations: 1});

		return [
			{
				type: 'text',
				text: instructionsText,
				cache_control: {type: 'ephemeral'},
			},
			{
				type: 'text',
				text: JSON.stringify(componentSpecSchema),
				cache_control: {type: 'ephemeral'},
			},
		];
	};
};

/**
 * Builds user prompt function for GenerateSigilIR Agent
 *
 * Loads template from: src/agent/definitions/generateSigilIR/prompts/templates/user.liquid
 * Throws if template loading fails (fail-fast during agent construction).
 */
export const buildUserPrompt = async (): Promise<UserPromptFunction<GenerateSigilIRInput>> => {
	const templatePath = resolve(process.cwd(), 'src/agent/definitions/generateSigilIR/prompts/templates/user.liquid');
	const result = await loadTemplate<GenerateSigilIRInput>(templatePath);

	if (isErr(result)) {
		throw new Error(
			`Failed to load user template from ${templatePath}: ${result.error.message}`
		);
	}

	return asUserPromptFunction(result.data);
};

/**
 * Builds error prompt function for GenerateSigilIR Agent
 *
 * Loads template from: src/agent/definitions/generateSigilIR/prompts/templates/error.liquid
 * Throws if template loading fails (fail-fast during agent construction).
 */
export const buildErrorPrompt = async (): Promise<ErrorPromptFunction> => {
	const templatePath = resolve(process.cwd(), 'src/agent/definitions/generateSigilIR/prompts/templates/error.liquid');
	const result = await loadTemplate<string>(templatePath);

	if (isErr(result)) {
		throw new Error(
			`Failed to load error template from ${templatePath}: ${result.error.message}`
		);
	}

	return asErrorPromptFunction(result.data);
};
