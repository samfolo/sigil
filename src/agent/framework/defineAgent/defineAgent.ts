import type {z} from 'zod';

import type {AgentExecutionContext} from '@sigil/src/agent/framework/types';
import type {ValidationLayer} from '@sigil/src/agent/framework/validation';
import type {Result, AgentError} from '@sigil/src/common/errors';
import {ok, err, AGENT_ERROR_CODES, AGENT_VALIDATION_CONSTRAINTS} from '@sigil/src/common/errors';

import type {ToolReducerHandler} from './types';

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
 * System prompt function - receives input and execution state
 *
 * Called on each attempt. Can adapt based on state.attempt to provide
 * retry-specific context (e.g., "this is retry 2/5").
 *
 * @template Input - The type of input data the agent accepts
 * @param input - The agent input data
 * @param state - Execution state containing attempt number and max attempts
 * @param signal - Optional AbortSignal to cancel long-running prompt generation
 * @returns Promise resolving to the generated system prompt string
 *
 * @example
 * ```typescript
 * const systemPrompt: SystemPromptFunction<string> = async (input, state, signal) => {
 *   if (state.attempt > 1) {
 *     return `You are processing: ${input}. Retry ${state.attempt}/${state.maxAttempts}.`;
 *   }
 *   return `You are processing: ${input}`;
 * };
 * ```
 */
export type SystemPromptFunction<Input> = (
  input: Input,
  context: AgentExecutionContext,
  signal?: AbortSignal
) => Promise<string>;

/**
 * User prompt function - receives input only
 *
 * Called once before the retry loop. Represents the immutable task description
 * that is preserved in conversation history across all retry attempts.
 *
 * @template Input - The type of input data the agent accepts
 * @param input - The agent input data
 * @param signal - Optional AbortSignal to cancel long-running prompt generation
 * @returns Promise resolving to the generated user prompt string
 *
 * @example
 * ```typescript
 * const userPrompt: UserPromptFunction<string> = async (input, signal) =>
 *   `Please process this input: ${input}`;
 * ```
 */
export type UserPromptFunction<Input> = (
  input: Input,
  signal?: AbortSignal
) => Promise<string>;

/**
 * Error prompt function - receives formatted error and execution state
 *
 * Called after validation failures. Can adapt based on state.attempt to
 * provide attempt-specific feedback.
 *
 * @param formattedError - The formatted error string from validation failure
 * @param state - Execution state containing attempt number and max attempts
 * @param signal - Optional AbortSignal to cancel long-running prompt generation
 * @returns Promise resolving to the generated error prompt string
 *
 * @example
 * ```typescript
 * const errorPrompt: ErrorPromptFunction = async (errorMessage, state, signal) =>
 *   `Attempt ${state.attempt}/${state.maxAttempts} failed:\n${errorMessage}\n\nPlease fix these issues.`;
 * ```
 */
export type ErrorPromptFunction = (
  formattedError: string,
  context: AgentExecutionContext,
  signal?: AbortSignal
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

  /**
   * Maximum number of iterations per attempt
   *
   * Controls how many tool-calling iterations can occur within a single attempt
   * before returning a MAX_ITERATIONS_EXCEEDED error. Prevents runaway loops
   * that consume excessive tokens.
   *
   * If not specified, uses the framework's default limit.
   */
  maxIterationsPerAttempt?: number;
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
 * Configuration for the output tool that produces the agent's validated result
 *
 * The output tool's input_schema is automatically derived from validation.outputSchema.
 * When this tool is called, executeAgent validates its input and completes execution.
 *
 * @template Output - The type of output the agent produces
 */
export interface OutputToolConfig<Output> {
  /**
   * Name of the output tool
   *
   * This is the tool name the model must call to provide its final result.
   * Must be a non-empty string.
   */
  name: string;

  /**
   * Description of what the output tool does
   *
   * Provides context to the model about when and how to use this tool.
   * Must be a non-empty string.
   */
  description: string;

  /**
   * Optional reflection handler for output review mode
   *
   * When provided, enables reflection mode where the model can call the output tool
   * multiple times to refine its output before final submission. The handler receives
   * the proposed output and returns a formatted string for the model to review.
   *
   * Reflection mode requires a submit tool (automatically injected by the framework)
   * to signal when the model is satisfied with its output and ready for validation.
   *
   * @param output - The proposed output from the model
   * @returns Result containing formatted string for model review, or error message string
   *
   * @example
   * ```typescript
   * reflectionHandler: (output) => ok(`Preview:\n${JSON.stringify(output, null, 2)}\n\nCall submit when ready.`)
   * ```
   */
  reflectionHandler?: (output: Output) => Result<string, string>;
}

/**
 * Configuration for a helper tool with embedded handler
 *
 * Helper tools enable multi-step workflows, data exploration, and context retrieval
 * within agent execution. Each helper tool contains its name, description, input schema,
 * and handler function, ensuring compile-time safety and automatic tool-to-handler mapping.
 *
 * The Name generic enforces that the tool name matches its object key when used in
 * the helpers object, providing compile-time verification of tool name consistency.
 *
 * @template Name - The tool name (must match object key in helpers)
 * @template Run - User run state type (persists across attempts)
 * @template Attempt - User attempt state type (resets on retry)
 * @template ToolInput - The type of input this helper tool accepts
 */
export interface HelperToolConfig<Name extends string, Run, Attempt, ToolInput> {
  /**
   * Name of the helper tool
   *
   * Must match the object key in the helpers configuration.
   */
  name: Name;

  /**
   * Description of what the helper tool does
   *
   * Provides context to the model about when and how to use this tool.
   */
  description: string;

  /**
   * Zod schema for validating and typing the tool input
   *
   * Automatically converted to JSON Schema for the Anthropic API.
   */
  inputSchema: z.ZodSchema<ToolInput>;

  /**
   * Handler function for executing this tool
   *
   * Receives current state and tool input, returns new state and tool result.
   * Must follow immutable update patterns.
   */
  handler: ToolReducerHandler<Run, Attempt>;
}

/**
 * Configuration for all tools available to the agent
 *
 * Supports both the required output tool and optional helper tools for
 * multi-step workflows, data exploration, and context retrieval.
 *
 * @template Output - The type of output the agent produces
 * @template Run - User run state type (persists across attempts)
 * @template Attempt - User attempt state type (resets on retry)
 */
export interface ToolsConfig<Output, Run, Attempt> {
  /**
   * Output tool configuration (REQUIRED)
   *
   * This tool produces the agent's final validated result. Its input_schema
   * is automatically derived from validation.outputSchema.
   */
  output: OutputToolConfig<Output>;

  /**
   * Helper tools for multi-step workflows (OPTIONAL)
   *
   * Object mapping tool names to their configurations. Each tool includes
   * its description, input schema, and handler function. Object keys serve
   * as tool names, ensuring uniqueness and compile-time tool-to-handler pairing.
   *
   * The mapped type enforces that each tool's name field matches its object key,
   * preventing synchronisation errors.
   *
   * @example
   * ```typescript
   * helpers: {
   *   parse_json: {
   *     name: 'parse_json',  // Must match key
   *     description: 'Parse JSON data',
   *     inputSchema: z.object({data: z.string()}),
   *     handler: parseJSONHandler,
   *   },
   *   parse_csv: {
   *     name: 'parse_csv',  // Must match key
   *     description: 'Parse CSV data',
   *     inputSchema: z.object({data: z.string()}),
   *     handler: parseCSVHandler,
   *   },
   * }
   * ```
   */
  helpers?: {
    [K in string]: HelperToolConfig<K, Run, Attempt, unknown>;
  };
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
  system: SystemPromptFunction<Input>;

  /**
   * User prompt function - receives agent input only
   *
   * Called once before the retry loop to generate the immutable task description.
   * This prompt is preserved in conversation history across all retry attempts,
   * ensuring the model always has access to the original task requirements.
   */
  user: UserPromptFunction<Input>;

  /**
   * Error iteration prompt function - receives formatted error string and execution state
   *
   * Called after validation failures to provide feedback for retry attempts.
   */
  error: ErrorPromptFunction;

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
 * Complete agent definition combining model config, prompts, tools, validation, and observability
 *
 * @template Input - The type of input the agent accepts
 * @template Output - The type of output the agent produces
 * @template Run - User run state type (persists across attempts)
 * @template Attempt - User attempt state type (resets on retry)
 */
export interface AgentDefinition<Input, Output, Run, Attempt> {
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
   * Tools configuration
   *
   * Each helper tool includes its own handler function, ensuring compile-time
   * safety and eliminating the need for a separate reducer.
   */
  tools: ToolsConfig<Output, Run, Attempt>;

  /**
   * Output validation configuration
   */
  validation: ValidationConfig<Output>;

  /**
   * Observability tracking configuration
   */
  observability: ObservabilityConfig;

  /**
   * Optional function to initialise run state from input
   *
   * Run state persists across retry attempts, making it suitable for
   * expensive computations and metrics that should survive validation failures.
   *
   * If not provided, defaults to an empty object {}.
   *
   * @param input - The agent input
   * @returns Initial run state
   *
   * @example
   * ```typescript
   * initialRunState: (input) => ({rawData: input.data, parsedData: undefined})
   * ```
   */
  initialRunState?: (input: Input) => Run;

  /**
   * Optional function to initialise attempt state
   *
   * Attempt state resets on validation failures, making it suitable for working
   * state and disposable resources that should start fresh on each retry.
   *
   * Receives immutable snapshots of input, run state, and execution context,
   * allowing initialization to adapt based on attempt number and other framework state.
   *
   * If not provided, defaults to an empty object {}.
   *
   * @param input - The agent input
   * @param run - Current run state (immutable snapshot)
   * @param context - Execution context with attempt/iteration tracking (immutable)
   * @returns Initial attempt state for this attempt
   *
   * @example
   * ```typescript
   * initialAttemptState: (input, run, context) => ({
   *   callCount: 0,
   *   retrying: context.attempt > 1,
   *   maxRetries: context.maxAttempts,
   * })
   * ```
   */
  initialAttemptState?: (input: Input, run: Run, context: AgentExecutionContext) => Attempt;
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
 *     system: async (input, context) => `Analyse data on attempt ${context.attempt}`,
 *     user: async (input) => `Process: ${input}`,
 *     error: async (errorMessage, context) =>
 *       `Attempt ${context.attempt}/${context.maxAttempts} failed:\n${errorMessage}`,
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
 *   initialRunState: (input) => ({rawData: input, parsedData: undefined}),
 *   initialAttemptState: (input, run, context) => ({callCount: 0}),
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
export const defineAgent = <Input, Output, Run, Attempt>(
	definition: AgentDefinition<Input, Output, Run, Attempt>
): Result<Readonly<AgentDefinition<Input, Output, Run, Attempt>>, AgentError[]> => {
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

	// Validate output tool name
	if (!definition.tools.output.name || definition.tools.output.name.trim() === '') {
		errors.push({
			code: AGENT_ERROR_CODES.EMPTY_OUTPUT_TOOL_NAME,
			severity: 'error',
			category: 'validation',
			path: '$.tools.output.name',
			context: {
				providedValue: definition.tools.output.name,
			},
		});
	}

	// Validate output tool description
	if (!definition.tools.output.description || definition.tools.output.description.trim() === '') {
		errors.push({
			code: AGENT_ERROR_CODES.EMPTY_OUTPUT_TOOL_DESCRIPTION,
			severity: 'error',
			category: 'validation',
			path: '$.tools.output.description',
			context: {
				providedValue: definition.tools.output.description,
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

	// Freeze tools config
	Object.freeze(definition.tools.output);
	if (definition.tools.helpers) {
		for (const toolName in definition.tools.helpers) {
			Object.freeze(definition.tools.helpers[toolName]);
		}
		Object.freeze(definition.tools.helpers);
	}
	Object.freeze(definition.tools);

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
