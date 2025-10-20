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
	 * Model name (e.g., 'claude-3-5-sonnet-20241022')
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
