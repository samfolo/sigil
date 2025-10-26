import {readFile} from 'node:fs/promises';

import {Liquid} from 'liquidjs';

import type {
	SystemPromptFunction,
	UserPromptFunction,
	ErrorPromptFunction,
} from '@sigil/src/agent/framework/defineAgent';
import type {AgentExecutionState} from '@sigil/src/agent/framework/types';
import type {Result} from '@sigil/src/common/errors/result';
import {ok, err} from '@sigil/src/common/errors/result';

/**
 * Liquid template engine instance used for compilation
 */
const liquidEngine = new Liquid();

/**
 * Generic template function that accepts both data and execution state
 *
 * This is the raw output from template compilation. Use the adapter functions
 * (asSystemPrompt, asUserPrompt, asErrorPrompt) to convert to specific prompt types.
 *
 * @template T - The type of data this template function accepts
 */
export type TemplateFunction<T> = (
  data: T,
  state: AgentExecutionState
) => Promise<string>;

/**
 * Loads a Liquid template from a file and returns a TemplateFunction
 *
 * The returned function merges the provided data and execution state into the template context,
 * making both available to the template. Templates can access:
 * - All properties from the data parameter via `data.*`
 * - All properties from AgentExecutionState via `state.*`
 *
 * To use the returned template as a specific prompt type (system/user/error), use the
 * adapter functions: asSystemPromptFunction, asUserPromptFunction, asErrorPromptFunction.
 *
 * @template T - The type of data this template function accepts
 * @param filePath - Path to the .liquid template file (relative to project root)
 * @returns Result containing TemplateFunction on success, or Error on failure
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
 * // Convert to SystemPromptFunction
 * const systemPrompt = asSystemPromptFunction(result.data);
 * const prompt = await systemPrompt(
 *   {query: 'Analyse sales data'},
 *   {attempt: 1, maxAttempts: 3}
 * );
 * ```
 */
export const loadTemplate = async <T>(
	filePath: string
): Promise<Result<TemplateFunction<T>, Error>> => {
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
 * Compiles a Liquid template string directly and returns a TemplateFunction
 *
 * The returned function merges the provided data and execution state into the template context,
 * making both available to the template. Templates can access:
 * - All properties from the data parameter via `data.*`
 * - All properties from AgentExecutionState via `state.*`
 *
 * To use the returned template as a specific prompt type (system/user/error), use the
 * adapter functions: asSystemPromptFunction, asUserPromptFunction, asErrorPromptFunction.
 *
 * @template T - The type of data this template function accepts
 * @param templateString - Liquid template string to compile
 * @returns Result containing TemplateFunction on success, or Error on failure
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
 * // Convert to ErrorPromptFunction
 * const errorPrompt = asErrorPromptFunction(result.data);
 * const prompt = await errorPrompt(
 *   'Validation failed',
 *   {attempt: 2, maxAttempts: 3}
 * );
 * ```
 */
export const compileTemplate = <T>(
	templateString: string
): Result<TemplateFunction<T>, Error> => {
	try {
		const template = liquidEngine.parse(templateString);

		const templateFunction: TemplateFunction<T> = async (
			data: T,
			state: AgentExecutionState
		): Promise<string> => liquidEngine.render(template, {data, state});

		return ok(templateFunction);
	} catch (error) {
		return err(
			error instanceof Error
				? error
				: new Error('Failed to compile template')
		);
	}
};

/**
 * Converts a TemplateFunction to a SystemPromptFunction
 *
 * SystemPromptFunction signature: (input: Input, state: AgentExecutionState) => Promise<string>
 * This is a direct pass-through since the signatures match.
 *
 * @template Input - The type of input data the system prompt accepts
 * @param template - The template function to convert
 * @returns SystemPromptFunction that can be used in agent prompts config
 *
 * @example
 * ```typescript
 * const result = await loadTemplate<MyInput>('prompts/system.liquid');
 * if (isOk(result)) {
 *   const systemPrompt = asSystemPromptFunction(result.data);
 *   // Use in agent definition
 * }
 * ```
 */
export const asSystemPromptFunction = <Input>(
	template: TemplateFunction<Input>
): SystemPromptFunction<Input> => template;

/**
 * Converts a TemplateFunction to a UserPromptFunction
 *
 * UserPromptFunction signature: (input: Input) => Promise<string>
 * The template receives empty state since user prompts don't use execution state.
 *
 * @template Input - The type of input data the user prompt accepts
 * @param template - The template function to convert
 * @returns UserPromptFunction that can be used in agent prompts config
 *
 * @example
 * ```typescript
 * const result = await loadTemplate<MyInput>('prompts/user.liquid');
 * if (isOk(result)) {
 *   const userPrompt = asUserPromptFunction(result.data);
 *   // Use in agent definition
 * }
 * ```
 */
export const asUserPromptFunction = <Input>(
	template: TemplateFunction<Input>
): UserPromptFunction<Input> => async (input: Input): Promise<string> => template(input, {attempt: 1, maxAttempts: 1, iteration: 1, maxIterations: 1});

/**
 * Converts a TemplateFunction to an ErrorPromptFunction
 *
 * ErrorPromptFunction signature: (formattedError: string, state: AgentExecutionState) => Promise<string>
 * This is a direct pass-through since the signatures match.
 *
 * @param template - The template function to convert
 * @returns ErrorPromptFunction that can be used in agent prompts config
 *
 * @example
 * ```typescript
 * const result = await loadTemplate<string>('prompts/error.liquid');
 * if (isOk(result)) {
 *   const errorPrompt = asErrorPromptFunction(result.data);
 *   // Use in agent definition
 * }
 * ```
 */
export const asErrorPromptFunction = (
	template: TemplateFunction<string>
): ErrorPromptFunction => template;
