/**
 * Prompt builder functions for Analyser Agent
 *
 * Loads Liquid templates and adapts them to framework prompt function signatures.
 * Template loading failures throw during builder invocation, failing at agent construction time.
 */

import {resolve} from 'node:path';

import type {
	SystemPromptFunction,
	UserPromptFunction,
	ErrorPromptFunction,
} from '@sigil/src/agent/framework/defineAgent';
import {
	loadTemplate,
	asSystemPromptFunction,
	asUserPromptFunction,
	asErrorPromptFunction,
} from '@sigil/src/agent/framework/prompts/templateLoader';
import {isErr} from '@sigil/src/common/errors/result';

import type {AnalyserAgentInput} from '../schemas';

/**
 * Builds system prompt function for Analyser Agent
 *
 * Loads template from: src/agent/definitions/analyser/prompts/templates/system.liquid
 * Throws if template loading fails (fail-fast during agent construction).
 */
export const buildSystemPrompt = async (): Promise<SystemPromptFunction<AnalyserAgentInput>> => {
	const templatePath = resolve(process.cwd(), 'src/agent/definitions/analyser/prompts/templates/system.liquid');
	const result = await loadTemplate<AnalyserAgentInput>(templatePath);

	if (isErr(result)) {
		throw new Error(
			`Failed to load system template from ${templatePath}: ${result.error.message}`
		);
	}

	return asSystemPromptFunction(result.data);
};

/**
 * Builds user prompt function for Analyser Agent
 *
 * Loads template from: src/agent/definitions/analyser/prompts/templates/user.liquid
 * Throws if template loading fails (fail-fast during agent construction).
 */
export const buildUserPrompt = async (): Promise<UserPromptFunction<AnalyserAgentInput>> => {
	const templatePath = resolve(process.cwd(), 'src/agent/definitions/analyser/prompts/templates/user.liquid');
	const result = await loadTemplate<AnalyserAgentInput>(templatePath);

	if (isErr(result)) {
		throw new Error(
			`Failed to load user template from ${templatePath}: ${result.error.message}`
		);
	}

	return asUserPromptFunction(result.data);
};

/**
 * Builds error prompt function for Analyser Agent
 *
 * Loads template from: src/agent/definitions/analyser/prompts/templates/error.liquid
 * Throws if template loading fails (fail-fast during agent construction).
 */
export const buildErrorPrompt = async (): Promise<ErrorPromptFunction> => {
	const templatePath = resolve(process.cwd(), 'src/agent/definitions/analyser/prompts/templates/error.liquid');
	const result = await loadTemplate<string>(templatePath);

	if (isErr(result)) {
		throw new Error(
			`Failed to load error template from ${templatePath}: ${result.error.message}`
		);
	}

	return asErrorPromptFunction(result.data);
};
