import type {z} from 'zod';

import type {SpecError} from '@sigil/src/common/errors';

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
 * Function that generates the system prompt for the agent
 *
 * @param input - The input data to base the prompt on
 * @returns Promise resolving to the system prompt string
 */
export type SystemPromptFunction<Input> = (input: Input) => Promise<string>;

/**
 * Function that generates the user prompt for the agent
 *
 * @param input - The input data to base the prompt on
 * @returns Promise resolving to the user prompt string
 */
export type UserPromptFunction<Input> = (input: Input) => Promise<string>;

/**
 * Function that generates an error iteration prompt when validation fails
 *
 * @param errors - Array of validation errors from previous attempt
 * @param attempt - The current attempt number (1-indexed)
 * @returns Promise resolving to the error prompt string
 */
export type ErrorPromptFunction = (
	errors: SpecError[],
	attempt: number
) => Promise<string>;

/**
 * Custom validator with a name and validation function
 */
export interface CustomValidator {
	/**
	 * Name of the validator for logging and debugging
	 */
	name: string;

	/**
	 * Async validation function
	 *
	 * @param output - The output to validate
	 * @returns Promise resolving to the validated output or rejecting with an error
	 */
	validate: (output: unknown) => Promise<unknown>;
}

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
	customValidators: CustomValidator[];

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
	 * System prompt function
	 */
	system: SystemPromptFunction<Input>;

	/**
	 * User prompt function
	 */
	user: UserPromptFunction<Input>;

	/**
	 * Error iteration prompt function
	 */
	error: ErrorPromptFunction;
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
 * Validates all required fields and returns a deeply frozen (immutable) copy
 * of the agent definition to prevent accidental modification.
 *
 * @param definition - The agent definition to validate and freeze
 * @returns A deeply frozen agent definition
 * @throws Error if any required field is missing or invalid
 *
 * @example
 * ```typescript
 * const agent = defineAgent({
 *   name: 'DataAnalyser',
 *   description: 'Analyses tabular data and generates insights',
 *   model: {
 *     provider: 'anthropic',
 *     name: 'claude-sonnet-4-5-20250929',
 *     temperature: 0.7,
 *     maxTokens: 4096,
 *   },
 *   prompts: {
 *     system: async (input) => 'System prompt',
 *     user: async (input) => 'User prompt',
 *     error: async (errors, attempt) => 'Error prompt',
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
 * ```
 */
export const defineAgent = <Input, Output>(
	definition: AgentDefinition<Input, Output>
): Readonly<AgentDefinition<Input, Output>> => {
	// Validate required fields
	if (!definition.name || definition.name.trim() === '') {
		throw new Error('Agent name must be a non-empty string');
	}

	if (!definition.description || definition.description.trim() === '') {
		throw new Error('Agent description must be a non-empty string');
	}

	if (!definition.model.name || definition.model.name.trim() === '') {
		throw new Error('Model name must be a non-empty string');
	}

	if (!definition.validation.outputSchema) {
		throw new Error('Validation output schema must be provided');
	}

	if (definition.validation.maxAttempts < 1) {
		throw new Error('Validation maxAttempts must be at least 1');
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

	return definition;
};
