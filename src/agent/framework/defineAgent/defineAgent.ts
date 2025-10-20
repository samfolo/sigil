import type {z} from 'zod';

import type {AgentExecutionState} from '@sigil/src/agent/framework/types';
import type {ValidationLayer} from '@sigil/src/agent/framework/validation';
import type {Result, SpecError, AgentError} from '@sigil/src/common/errors';
import {ok, err, AGENT_ERROR_CODES, AGENT_VALIDATION_CONSTRAINTS} from '@sigil/src/common/errors';

/**
 * Configuration for the LLM model used by the agent
 */
export interface ModelConfig {
	/**
	 * LLM provider (currently only Anthropic is supported)
	 */
	provider: 'anthropic';

	/**
	 * Model name (e.g., 'claude-sonnet-4-5-20250929')
	 */
	name: string;

	/**
	 * Temperature for response generation (0-1)
	 */
	temperature: number;

	/**
	 * Maximum tokens in the response
	 */
	maxTokens: number;
}

/**
 * Generic prompt function that generates prompts based on input data and execution state
 *
 * The generic type parameter determines what data the function receives:
 * - `PromptFunction<Input>` - receives the agent input (used for system/user prompts)
 * - `PromptFunction<SpecError[]>` - receives validation errors (used for error prompts)
 * - `PromptFunction<{input: Input, errors: SpecError[]}>` - receives both (for advanced error handling)
 *
 * @template T - The type of data this prompt function accepts
 * @param data - The data to base the prompt on (input, errors, or combination)
 * @param state - Execution state containing attempt number and max attempts
 * @returns Promise resolving to the generated prompt string
 *
 * @example
 * ```typescript
 * // System prompt with input only
 * const systemPrompt: PromptFunction<string> = async (input, state) =>
 *   `You are processing: ${input}`;
 *
 * // Error prompt with errors only
 * const errorPrompt: PromptFunction<SpecError[]> = async (errors, state) =>
 *   `Attempt ${state.attempt}/${state.maxAttempts} failed with ${errors.length} errors`;
 *
 * // Error prompt with both input and errors
 * const advancedErrorPrompt: PromptFunction<{input: string, errors: SpecError[]}> =
 *   async ({input, errors}, state) =>
 *     `Processing "${input}" failed on attempt ${state.attempt}/${state.maxAttempts}`;
 * ```
 */
export type PromptFunction<T> = (
	data: T,
	state: AgentExecutionState
) => Promise<string>;

/**
 * Configuration for validating agent output
 *
 * @template Output - The type of output the agent produces
 */
export interface ValidationConfig<Output> {
	/**
	 * Zod schema for validating and typing the agent output
	 */
	outputSchema: z.ZodSchema<Output>;

	/**
	 * Additional custom validators to run after schema validation
	 */
	customValidators: ValidationLayer<Output>[];

	/**
	 * Maximum number of retry attempts when validation fails
	 */
	maxAttempts: number;
}

/**
 * Observability configuration for tracking agent execution metrics
 */
export interface ObservabilityConfig {
	/**
	 * Track API costs for agent execution
	 */
	trackCost: boolean;

	/**
	 * Track latency/response time
	 */
	trackLatency: boolean;

	/**
	 * Track number of attempts/retries
	 */
	trackAttempts: boolean;

	/**
	 * Track token usage (input/output)
	 */
	trackTokens: boolean;
}

/**
 * Collection of prompt generation functions for the agent
 *
 * @template Input - The type of input the agent accepts
 */
export interface PromptsConfig<Input> {
	/**
	 * System prompt function - receives agent input and execution state
	 */
	system: PromptFunction<Input>;

	/**
	 * User prompt function - receives agent input and execution state
	 */
	user: PromptFunction<Input>;

	/**
	 * Error iteration prompt function - receives validation errors and execution state
	 */
	error: PromptFunction<SpecError[]>;
}

/**
 * Complete agent definition combining model config, prompts, validation, and observability
 *
 * @template Input - The type of input the agent accepts
 * @template Output - The type of output the agent produces
 */
export interface AgentDefinition<Input, Output> {
	/**
	 * Unique name for the agent
	 */
	name: string;

	/**
	 * Human-readable description of the agent's purpose
	 */
	description: string;

	/**
	 * LLM model configuration
	 */
	model: ModelConfig;

	/**
	 * Prompt generation functions
	 */
	prompts: PromptsConfig<Input>;

	/**
	 * Output validation configuration
	 */
	validation: ValidationConfig<Output>;

	/**
	 * Observability tracking configuration
	 */
	observability: ObservabilityConfig;
}

/**
 * Factory function to create and validate an agent definition
 *
 * Validates all required fields and returns a Result containing either a deeply
 * frozen (immutable) agent definition or an array of validation errors.
 *
 * Collects ALL validation errors before returning to provide better developer
 * experience - developers see all issues at once rather than fixing one at a time.
 *
 * @param definition - The agent definition to validate and freeze
 * @returns Result containing frozen agent definition or array of validation errors
 *
 * @example
 * ```typescript
 * const result = defineAgent({
 *   name: 'DataAnalyser',
 *   description: 'Analyses tabular data and generates insights',
 *   model: {
 *     provider: 'anthropic',
 *     name: 'claude-sonnet-4-5-20250929',
 *     temperature: 0.7,
 *     maxTokens: 4096,
 *   },
 *   prompts: {
 *     system: async (input, state) => `Analyse data on attempt ${state.attempt}`,
 *     user: async (input, state) => `Process: ${input}`,
 *     error: async (errors, state) =>
 *       `Attempt ${state.attempt}/${state.maxAttempts} failed with ${errors.length} errors`,
 *   },
 *   validation: {
 *     outputSchema: z.object({...}),
 *     customValidators: [],
 *     maxAttempts: 3,
 *   },
 *   observability: {
 *     trackCost: true,
 *     trackLatency: true,
 *     trackAttempts: true,
 *     trackTokens: true,
 *   },
 * });
 *
 * if (isErr(result)) {
 *   console.error(formatAgentErrorsForDeveloper(result.error));
 *   return;
 * }
 *
 * const agent = result.data;
 * ```
 */
export const defineAgent = <Input, Output>(
	definition: AgentDefinition<Input, Output>
): Result<Readonly<AgentDefinition<Input, Output>>, AgentError[]> => {
	const errors: AgentError[] = [];

	// Validate name
	if (!definition.name || definition.name.trim() === '') {
		errors.push({
			code: AGENT_ERROR_CODES.EMPTY_NAME,
			severity: 'error',
			category: 'validation',
			context: {
				providedValue: definition.name,
			},
		});
	}

	// Validate description
	if (!definition.description || definition.description.trim() === '') {
		errors.push({
			code: AGENT_ERROR_CODES.EMPTY_DESCRIPTION,
			severity: 'error',
			category: 'validation',
			context: {
				providedValue: definition.description,
			},
		});
	}

	// Validate model name
	if (!definition.model.name || definition.model.name.trim() === '') {
		errors.push({
			code: AGENT_ERROR_CODES.EMPTY_MODEL_NAME,
			severity: 'error',
			category: 'validation',
			path: '$.model.name',
			context: {
				providedValue: definition.model.name,
			},
		});
	}

	// Validate output schema
	if (!definition.validation.outputSchema) {
		errors.push({
			code: AGENT_ERROR_CODES.MISSING_OUTPUT_SCHEMA,
			severity: 'error',
			category: 'validation',
			path: '$.validation.outputSchema',
			context: {},
		});
	}

	// Validate max attempts
	if (
		definition.validation.maxAttempts < AGENT_VALIDATION_CONSTRAINTS.MIN_MAX_ATTEMPTS
	) {
		errors.push({
			code: AGENT_ERROR_CODES.INVALID_MAX_ATTEMPTS,
			severity: 'error',
			category: 'validation',
			path: '$.validation.maxAttempts',
			context: {
				providedValue: definition.validation.maxAttempts,
				minimumValue: AGENT_VALIDATION_CONSTRAINTS.MIN_MAX_ATTEMPTS,
			},
		});
	}

	// Return early if validation failed
	if (errors.length > 0) {
		return err(errors);
	}

	// Deep freeze the definition
	// Freeze model config
	Object.freeze(definition.model);

	// Freeze prompts config
	Object.freeze(definition.prompts);

	// Freeze custom validators array and each validator
	for (const validator of definition.validation.customValidators) {
		Object.freeze(validator);
	}
	Object.freeze(definition.validation.customValidators);

	// Freeze validation config
	Object.freeze(definition.validation);

	// Freeze observability config
	Object.freeze(definition.observability);

	// Freeze top-level object
	Object.freeze(definition);

	return ok(definition);
};
