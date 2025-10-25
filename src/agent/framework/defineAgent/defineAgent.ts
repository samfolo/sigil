import type {z} from 'zod';

import type {AgentExecutionState} from '@sigil/src/agent/framework/types';
import type {ValidationLayer} from '@sigil/src/agent/framework/validation';
import type {Result, AgentError} from '@sigil/src/common/errors';
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
 * - `PromptFunction<string>` - receives formatted error string (used for error prompts)
 *
 * @template T - The type of data this prompt function accepts
 * @param data - The data to base the prompt on (input or formatted error string)
 * @param state - Execution state containing attempt number and max attempts
 * @returns Promise resolving to the generated prompt string
 *
 * @example
 * ```typescript
 * // System prompt with input only
 * const systemPrompt: PromptFunction<string> = async (input, state) =>
 *   `You are processing: ${input}`;
 *
 * // Error prompt with formatted error string
 * const errorPrompt: PromptFunction<string> = async (errorMessage, state) =>
 *   `Attempt ${state.attempt}/${state.maxAttempts} failed:\n${errorMessage}\n\nPlease fix these issues.`;
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
	 *
	 * Called on each attempt and can adapt based on state (e.g., mention retry count).
	 * The system prompt provides meta-context about the execution environment.
	 */
	system: PromptFunction<Input>;

	/**
	 * User prompt function - receives agent input only
	 *
	 * Called once before the retry loop to generate the immutable task description.
	 * This prompt is preserved in conversation history across all retry attempts,
	 * ensuring the model always has access to the original task requirements.
	 */
	user: (input: Input) => Promise<string>;

	/**
	 * Error iteration prompt function - receives formatted error string and execution state
	 *
	 * Called after validation failures to provide feedback for retry attempts.
	 */
	error: PromptFunction<string>;

	/**
	 * Optional error formatter function
	 *
	 * Converts validation errors (of any type) into a formatted string for the error prompt.
	 * If not provided, executeAgent will use a default formatter that handles SpecError[]
	 * and ZodError with appropriate formatting.
	 *
	 * @param errors - Validation errors from failed validation layer (can be any type)
	 * @returns Formatted error string to pass to the error prompt function
	 *
	 * @example
	 * ```typescript
	 * // Custom formatter for domain-specific errors
	 * errorFormatter: (errors) => {
	 *   if (Array.isArray(errors)) {
	 *     return errors.map(e => `- ${e}`).join('\n');
	 *   }
	 *   return String(errors);
	 * }
	 * ```
	 */
	errorFormatter?: (errors: unknown) => string;
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
 *     error: async (errorMessage, state) =>
 *       `Attempt ${state.attempt}/${state.maxAttempts} failed:\n${errorMessage}`,
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
