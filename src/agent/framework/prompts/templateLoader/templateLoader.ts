import {readFile} from 'node:fs/promises';
import {Liquid} from 'liquidjs';

import type {AgentExecutionState} from '@sigil/src/agent/framework/types';
import type {PromptFunction} from '@sigil/src/agent/framework/defineAgent/defineAgent';
import type {Result} from '@sigil/src/common/errors/result';
import {ok, err} from '@sigil/src/common/errors/result';

/**
 * Liquid template engine instance used for compilation
 */
const liquidEngine = new Liquid();

/**
 * Loads a Liquid template from a file and returns a PromptFunction
 *
 * The returned function merges the provided data and execution state into the template context,
 * making both available to the template. Templates can access:
 * - All properties from the data parameter via `data.*`
 * - All properties from AgentExecutionState via `state.*`
 *
 * @template T - The type of data this prompt function accepts
 * @param filePath - Path to the .liquid template file (relative to project root)
 * @returns Result containing PromptFunction on success, or Error on failure
 *
 * @example
 * ```typescript
 * // Load template from file
 * const result = await loadTemplate<{query: string}>('prompts/system.liquid');
 * if (isErr(result)) {
 *   console.error('Failed to load template:', result.error);
 *   return;
 * }
 *
 * const systemPrompt = result.data;
 * const prompt = await systemPrompt(
 *   {query: 'Analyse sales data'},
 *   {attempt: 1, maxAttempts: 3}
 * );
 * ```
 */
export const loadTemplate = async <T>(
	filePath: string
): Promise<Result<PromptFunction<T>, Error>> => {
	try {
		const templateString = await readFile(filePath, 'utf-8');
		return compileTemplate<T>(templateString);
	} catch (error) {
		return err(
			error instanceof Error
				? error
				: new Error(`Failed to load template from ${filePath}`)
		);
	}
};

/**
 * Compiles a Liquid template string directly and returns a PromptFunction
 *
 * The returned function merges the provided data and execution state into the template context,
 * making both available to the template. Templates can access:
 * - All properties from the data parameter via `data.*`
 * - All properties from AgentExecutionState via `state.*`
 *
 * @template T - The type of data this prompt function accepts
 * @param templateString - Liquid template string to compile
 * @returns Result containing PromptFunction on success, or Error on failure
 *
 * @example
 * ```typescript
 * // Compile inline template
 * const result = compileTemplate<string>(`
 *   Attempt {{ state.attempt }}/{{ state.maxAttempts }} failed:
 *
 *   {{ data }}
 *
 *   Please fix these issues.
 * `);
 *
 * if (isErr(result)) {
 *   console.error('Template compilation failed:', result.error);
 *   return;
 * }
 *
 * const errorPrompt = result.data;
 * const prompt = await errorPrompt(
 *   'Validation failed',
 *   {attempt: 2, maxAttempts: 3}
 * );
 * ```
 */
export const compileTemplate = <T>(
	templateString: string
): Result<PromptFunction<T>, Error> => {
	try {
		const template = liquidEngine.parse(templateString);

		const promptFunction: PromptFunction<T> = async (
			data: T,
			state: AgentExecutionState
		): Promise<string> => liquidEngine.render(template, {data, state});

		return ok(promptFunction);
	} catch (error) {
		return err(
			error instanceof Error
				? error
				: new Error('Failed to compile template')
		);
	}
};
