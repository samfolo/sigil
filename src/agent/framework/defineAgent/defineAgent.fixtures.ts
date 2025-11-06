/**
 * Test fixtures for agent definition system
 *
 * Comprehensive test cases covering:
 * - Minimal valid agent configurations
 * - Complete agent configurations with all features
 * - Agents with helper tools and reflection mode
 * - Invalid configurations for each validation rule
 */

import type Anthropic from '@anthropic-ai/sdk';
import {z} from 'zod';

import type {AgentExecutionContext} from '@sigil/src/agent/framework';
import type {Result} from '@sigil/src/common/errors';
import {err, ok} from '@sigil/src/common/errors';
import type {EmptyObject} from '@sigil/src/common/types';

import type {AgentDefinition} from './defineAgent';

/**
 * Simple output interface used across all test fixtures for consistency
 */
interface TestOutput {
  result: string;
}

/**
 * Test output schema used in fixtures
 */
const TEST_OUTPUT_SCHEMA = z.object({
	result: z.string(),
});

/**
 * Builder for creating AgentDefinition fixtures with type-safe overrides
 *
 * Provides chainable methods to customise specific fields while preserving the base configuration.
 * Simplifies fixture creation by only specifying fields that differ from the base.
 *
 * @example
 * ```typescript
 * const invalidAgent = agentBuilder(BASE_MINIMAL_AGENT)
 *   .withName('')
 *   .build();
 *
 * const agentWithHelpers = agentBuilder(BASE_MINIMAL_AGENT)
 *   .withHelpers([queryDataTool, fetchContextTool])
 *   .build();
 * ```
 */
class AgentDefinitionBuilder<Input, Output, Run extends object = EmptyObject, Attempt extends object = EmptyObject> {
	private overrides: {
		name?: string;
		description?: string;
		maxAttempts?: number;
		maxIterationsPerAttempt?: number;
		helpers?: AgentDefinition<Input, Output, Run, Attempt>['tools']['helpers'];
		reflectionHandler?: AgentDefinition<Input, Output, Run, Attempt>['tools']['output']['reflectionHandler'];
		customValidators?: AgentDefinition<Input, Output, Run, Attempt>['validation']['customValidators'];
		observability?: Partial<AgentDefinition<Input, Output, Run, Attempt>['observability']>;
		outputSchema?: z.ZodSchema<Output>;
		modelName?: string;
		temperature?: number;
		maxTokens?: number;
		initialRunState?: AgentDefinition<Input, Output, Run, Attempt>['initialRunState'];
		initialAttemptState?: AgentDefinition<Input, Output, Run, Attempt>['initialAttemptState'];
	} = {};

	constructor(private base: AgentDefinition<Input, Output, Run, Attempt>) {}

	withName(name: string): this {
		this.overrides.name = name;
		return this;
	}

	withDescription(description: string): this {
		this.overrides.description = description;
		return this;
	}

	withMaxAttempts(maxAttempts: number): this {
		this.overrides.maxAttempts = maxAttempts;
		return this;
	}

	withMaxIterations(maxIterations: number): this {
		this.overrides.maxIterationsPerAttempt = maxIterations;
		return this;
	}

	withHelpers(helpers: AgentDefinition<Input, Output, Run, Attempt>['tools']['helpers']): this {
		this.overrides.helpers = helpers;
		return this;
	}

	withReflection(handler: AgentDefinition<Input, Output, Run, Attempt>['tools']['output']['reflectionHandler']): this {
		this.overrides.reflectionHandler = handler;
		return this;
	}

	withCustomValidators(validators: AgentDefinition<Input, Output, Run, Attempt>['validation']['customValidators']): this {
		this.overrides.customValidators = validators;
		return this;
	}

	withObservability(observability: Partial<AgentDefinition<Input, Output, Run, Attempt>['observability']>): this {
		this.overrides.observability = observability;
		return this;
	}

	withOutputSchema(schema: z.ZodSchema<Output>): this {
		this.overrides.outputSchema = schema;
		return this;
	}

	withModel(modelName: string): this {
		this.overrides.modelName = modelName;
		return this;
	}

	withTemperature(temperature: number): this {
		this.overrides.temperature = temperature;
		return this;
	}

	withMaxTokens(maxTokens: number): this {
		this.overrides.maxTokens = maxTokens;
		return this;
	}

	withInitialRunState(initialiser: AgentDefinition<Input, Output, Run, Attempt>['initialRunState']): this {
		this.overrides.initialRunState = initialiser;
		return this;
	}

	withInitialAttemptState(initialiser: AgentDefinition<Input, Output, Run, Attempt>['initialAttemptState']): this {
		this.overrides.initialAttemptState = initialiser;
		return this;
	}

	build(): AgentDefinition<Input, Output, Run, Attempt> {
		return {
			name: this.overrides.name ?? this.base.name,
			description: this.overrides.description ?? this.base.description,
			model: {
				...this.base.model,
				...(this.overrides.modelName !== undefined ? {name: this.overrides.modelName} : {}),
				...(this.overrides.temperature !== undefined ? {temperature: this.overrides.temperature} : {}),
				...(this.overrides.maxTokens !== undefined ? {maxTokens: this.overrides.maxTokens} : {}),
			},
			prompts: this.base.prompts,
			tools: {
				output: {
					...this.base.tools.output,
					...(this.overrides.reflectionHandler !== undefined ? {reflectionHandler: this.overrides.reflectionHandler} : {}),
				},
				...(() => {
					if (this.overrides.helpers !== undefined) {
						return {helpers: this.overrides.helpers};
					}
					if (this.base.tools.helpers !== undefined) {
						return {helpers: this.base.tools.helpers};
					}
					return {};
				})(),
			},
			validation: {
				outputSchema: 'outputSchema' in this.overrides ? this.overrides.outputSchema! : this.base.validation.outputSchema,
				customValidators: this.overrides.customValidators ?? this.base.validation.customValidators,
				maxAttempts: this.overrides.maxAttempts ?? this.base.validation.maxAttempts,
				...(() => {
					if (this.overrides.maxIterationsPerAttempt !== undefined) {
						return {maxIterationsPerAttempt: this.overrides.maxIterationsPerAttempt};
					}
					if (this.base.validation.maxIterationsPerAttempt !== undefined) {
						return {maxIterationsPerAttempt: this.base.validation.maxIterationsPerAttempt};
					}
					return {};
				})(),
			},
			observability: {
				...this.base.observability,
				...this.overrides.observability,
			},
			...(() => {
				if (this.overrides.initialRunState !== undefined) {
					return {initialRunState: this.overrides.initialRunState};
				}
				if (this.base.initialRunState !== undefined) {
					return {initialRunState: this.base.initialRunState};
				}
				return {};
			})(),
			...(() => {
				if (this.overrides.initialAttemptState !== undefined) {
					return {initialAttemptState: this.overrides.initialAttemptState};
				}
				if (this.base.initialAttemptState !== undefined) {
					return {initialAttemptState: this.base.initialAttemptState};
				}
				return {};
			})(),
		};
	}
}

/**
 * Creates a builder for customising an AgentDefinition
 *
 * @param base - Base agent definition to extend
 * @returns Builder instance with chainable methods
 */
export const agentBuilder = <Input, Output, Run extends object = EmptyObject, Attempt extends object = EmptyObject>(
	base: AgentDefinition<Input, Output, Run, Attempt>
): AgentDefinitionBuilder<Input, Output, Run, Attempt> => new AgentDefinitionBuilder(base);

/**
 * Helper tool handlers for testing
 */

/**
 * Mock helper tool handler that returns success
 *
 * Simulates a helper tool that queries data and returns formatted results.
 * Always succeeds with a formatted string response.
 */
export const mockDataQueryHandler = (input: unknown): Result<unknown, string> => {
	const query = typeof input === 'object' && input !== null && 'query' in input
		? String(input.query)
		: 'default';
	return ok(`Query results for: ${query}`);
};

/**
 * Mock helper tool handler that returns error
 *
 * Simulates a helper tool that fails validation or encounters an error.
 * Always returns an error Result with a descriptive message.
 */
export const mockFailingHandler = (_input: unknown): Result<unknown, string> =>
	err('Handler execution failed: invalid query');

/**
 * Mock helper tool handler for fetching context
 *
 * Simulates fetching additional context by ID.
 */
export const mockFetchContextHandler = (input: unknown): Result<unknown, string> => {
	const id = typeof input === 'object' && input !== null && 'id' in input
		? String(input.id)
		: 'unknown';
	return ok(`Context for ID: ${id}`);
};

/**
 * Mock helper tool handler for calculations
 *
 * Simulates performing calculations on arrays of numbers.
 */
export const mockCalculateHandler = (input: unknown): Result<unknown, string> => {
	if (typeof input !== 'object' || input === null) {
		return err('Invalid calculation input');
	}

	if (!('operation' in input) || !('values' in input)) {
		return err('Invalid calculation input');
	}

	const op = String(input.operation);
	const values = input.values;

	if (!Array.isArray(values)) {
		return err('Invalid calculation input');
	}

	// Type guard: check all values are numbers
	if (!values.every((v) => typeof v === 'number')) {
		return err('Invalid calculation input');
	}

	if (op === 'sum') {
		return ok(values.reduce((a: number, b: number) => a + b, 0));
	}

	return err('Invalid calculation input');
};

/**
 * Mock helper tool handler that throws exception
 *
 * Simulates a helper tool that violates the Result contract by throwing.
 * Used to test exception safety in executeAgent.
 */
export const mockThrowingHandler = (_input: unknown): Result<unknown, string> => {
	throw new Error('Handler threw exception');
};



/**
 * Base minimal agent - simplest valid configuration
 *
 * Used as foundation for most test fixtures. Contains minimal required fields
 * with sensible defaults. Customise using agentBuilder().
 */
const BASE_MINIMAL_AGENT: AgentDefinition<string, TestOutput, EmptyObject, EmptyObject> = {
	name: 'TestAgent',
	description: 'A simple test agent for validation',
	model: {
		provider: 'anthropic',
		name: 'claude-sonnet-4-5-20250929',
		temperature: 0.7,
		maxTokens: 1024,
	},
	prompts: {
		system: async (input: string, _signal?: AbortSignal): Promise<Anthropic.Messages.TextBlockParam[]> => [
			{
				type: 'text',
				text: `You are a test agent processing: ${input}`,
				cache_control: {type: 'ephemeral'},
			},
		],
		user: async (input: string, _signal?: AbortSignal) =>
			`Please process this input: ${input}`,
		error: async (errorMessage: string, context: AgentExecutionContext, _signal?: AbortSignal) =>
			`Attempt ${context.attempt} failed:\n${errorMessage}\n\nPlease try again.`,
	},
	tools: {
		output: {
			name: 'generate_output',
			description: 'Generate the test output result',
		},
	},
	validation: {
		outputSchema: TEST_OUTPUT_SCHEMA,
		customValidators: [],
		maxAttempts: 3,
	},
	observability: {
		trackCost: false,
		trackLatency: false,
		trackAttempts: false,
		trackTokens: false,
	},
};

/**
 * 1. Minimal valid agent - simplest possible configuration
 */
export const VALID_MINIMAL_AGENT: AgentDefinition<string, TestOutput, EmptyObject, EmptyObject> = BASE_MINIMAL_AGENT;

/**
 * 2. Complete valid agent - all features enabled with custom validator
 */
export const VALID_COMPLETE_AGENT: AgentDefinition<string, TestOutput, EmptyObject, EmptyObject> = agentBuilder(BASE_MINIMAL_AGENT)
	.withName('CompleteAgent')
	.withDescription('Agent with all observability flags and custom validation')
	.withTemperature(0.5)
	.withMaxTokens(2048)
	.withMaxAttempts(5)
	.withCustomValidators([
		{
			name: 'result-length-validator',
			description: 'Result must be at least 10 characters',
			validate: async (output, _signal?: AbortSignal) => {
				if (output.result.length < 10) {
					return err('Result must be at least 10 characters');
				}
				return ok(output);
			},
		},
		{
			name: 'no-empty-result-validator',
			description: 'Result cannot be empty or whitespace only',
			validate: async (output, _signal?: AbortSignal) => {
				if (output.result.trim() === '') {
					return err('Result cannot be empty or whitespace only');
				}
				return ok(output);
			},
		},
	])
	.withObservability({
		trackCost: true,
		trackLatency: true,
		trackAttempts: true,
		trackTokens: true,
	})
	.build();

/**
 * 3. Invalid agent - empty name
 *
 * When passed to defineAgent, should return error with code EMPTY_NAME
 */
export const INVALID_EMPTY_NAME: AgentDefinition<string, TestOutput, EmptyObject, EmptyObject> = agentBuilder(BASE_MINIMAL_AGENT)
	.withName('')
	.build();

/**
 * 4. Invalid agent - whitespace-only name
 *
 * When passed to defineAgent, should return error with code EMPTY_NAME
 */
export const INVALID_WHITESPACE_NAME: AgentDefinition<string, TestOutput, EmptyObject, EmptyObject> = agentBuilder(BASE_MINIMAL_AGENT)
	.withName('   ')
	.build();

/**
 * 5. Invalid agent - empty description
 *
 * When passed to defineAgent, should return error with code EMPTY_DESCRIPTION
 */
export const INVALID_EMPTY_DESCRIPTION: AgentDefinition<string, TestOutput, EmptyObject, EmptyObject> = agentBuilder(BASE_MINIMAL_AGENT)
	.withDescription('')
	.build();

/**
 * 6. Invalid agent - whitespace-only description
 *
 * When passed to defineAgent, should return error with code EMPTY_DESCRIPTION
 */
export const INVALID_WHITESPACE_DESCRIPTION: AgentDefinition<string, TestOutput, EmptyObject, EmptyObject> = agentBuilder(BASE_MINIMAL_AGENT)
	.withDescription('   ')
	.build();

/**
 * 7. Invalid agent - empty model name
 *
 * When passed to defineAgent, should return error with code EMPTY_MODEL_NAME
 */
export const INVALID_EMPTY_MODEL_NAME: AgentDefinition<string, TestOutput, EmptyObject, EmptyObject> = agentBuilder(BASE_MINIMAL_AGENT)
	.withModel('')
	.build();

/**
 * 8. Invalid agent - whitespace-only model name
 *
 * When passed to defineAgent, should return error with code EMPTY_MODEL_NAME
 */
export const INVALID_WHITESPACE_MODEL_NAME: AgentDefinition<string, TestOutput, EmptyObject, EmptyObject> = agentBuilder(BASE_MINIMAL_AGENT)
	.withModel('   ')
	.build();

/**
 * 9. Invalid agent - zero max attempts
 *
 * When passed to defineAgent, should return error with code INVALID_MAX_ATTEMPTS
 */
export const INVALID_ZERO_MAX_ATTEMPTS: AgentDefinition<string, TestOutput, EmptyObject, EmptyObject> = agentBuilder(BASE_MINIMAL_AGENT)
	.withMaxAttempts(0)
	.build();

/**
 * 10. Invalid agent - negative max attempts
 *
 * When passed to defineAgent, should return error with code INVALID_MAX_ATTEMPTS
 */
export const INVALID_NEGATIVE_MAX_ATTEMPTS: AgentDefinition<string, TestOutput, EmptyObject, EmptyObject> = agentBuilder(BASE_MINIMAL_AGENT)
	.withMaxAttempts(-1)
	.build();

/**
 * 11. Invalid agent - missing output schema
 *
 * When passed to defineAgent, should return error with code MISSING_OUTPUT_SCHEMA
 *
 * Note: This fixture uses a type assertion to bypass TypeScript checking
 * since we need to test runtime validation of this error case.
 */
export const INVALID_MISSING_OUTPUT_SCHEMA: AgentDefinition<string, TestOutput, EmptyObject, EmptyObject> = agentBuilder(BASE_MINIMAL_AGENT)
	.withOutputSchema(undefined as unknown as z.ZodSchema<TestOutput>)
	.build();

/**
 * 12. Invalid agent - multiple errors
 *
 * When passed to defineAgent, should return multiple errors:
 * - EMPTY_NAME
 * - EMPTY_DESCRIPTION
 * - EMPTY_MODEL_NAME
 * - INVALID_MAX_ATTEMPTS
 */
export const INVALID_MULTIPLE_ERRORS: AgentDefinition<string, TestOutput, EmptyObject, EmptyObject> = agentBuilder(BASE_MINIMAL_AGENT)
	.withName('')
	.withDescription('')
	.withModel('')
	.withMaxAttempts(0)
	.build();

/**
 * Mock reflection handler that returns success
 *
 * Simulates a reflection handler that formats output for model review.
 * Returns formatted JSON preview with instructions to call submit.
 */
export const mockReflectionHandler = (output: TestOutput): Result<string, string> =>
	ok(`Preview:\n${JSON.stringify(output, null, 2)}\n\nCall submit when ready.`);

/**
 * Mock reflection handler that returns error
 *
 * Simulates a reflection handler that rejects output due to validation issues.
 * Returns error Result with feedback for the model to fix.
 */
export const mockRejectingReflectionHandler = (output: TestOutput): Result<string, string> => {
	if (output.result.length < 20) {
		return err('Output too short; must be at least 20 characters');
	}
	return ok(`Preview:\n${JSON.stringify(output, null, 2)}`);
};

/**
 * Mock reflection handler that throws exception
 *
 * Simulates a reflection handler that violates the Result contract by throwing.
 * Used to test exception safety in executeAgent.
 */
export const mockThrowingReflectionHandler = (_output: TestOutput): Result<string, string> => {
	throw new Error('Reflection handler threw exception');
};

/**
 * 13. Agent with helper tools - single helper tool
 *
 * Demonstrates agent using helper tools for multi-step workflows.
 * Uses mockDataQueryHandler which always succeeds.
 */
export const AGENT_WITH_HELPER_TOOLS: AgentDefinition<string, TestOutput, EmptyObject, EmptyObject> = agentBuilder(BASE_MINIMAL_AGENT)
	.withName('HelperToolsAgent')
	.withDescription('Agent with helper tools for data querying')
	.withHelpers({
		query_data: {
			name: 'query_data',
			description: 'Query test data',
			inputSchema: z.object({query: z.string()}),
			handler: (state, toolInput) => {
				const handlerResult = mockDataQueryHandler(toolInput);
				if (!handlerResult.success) {
					return err(handlerResult.error);
				}
				return ok({
					newState: state,
					toolResult: handlerResult.data,
				});
			},
		},
	})
	.withObservability({
		trackCost: true,
		trackLatency: true,
		trackAttempts: true,
		trackTokens: true,
	})
	.build();

/**
 * 14. Agent with failing helper tool
 *
 * Demonstrates error handling for helper tools that return errors.
 * Uses mockFailingHandler which always returns err().
 */
export const AGENT_WITH_FAILING_HELPER: AgentDefinition<string, TestOutput, EmptyObject, EmptyObject> = agentBuilder(BASE_MINIMAL_AGENT)
	.withName('FailingHelperAgent')
	.withDescription('Agent with helper tool that fails')
	.withHelpers({
		failing_tool: {
			name: 'failing_tool',
			description: 'A tool that always fails',
			inputSchema: z.object({query: z.string()}),
			handler: (state, toolInput) => {
				const handlerResult = mockFailingHandler(toolInput);
				if (!handlerResult.success) {
					return err(handlerResult.error);
				}
				return ok({
					newState: state,
					toolResult: handlerResult.data,
				});
			},
		},
	})
	.withObservability({
		trackCost: true,
		trackLatency: true,
		trackAttempts: true,
		trackTokens: true,
	})
	.build();

/**
 * 15. Agent with multiple helper tools
 *
 * Demonstrates agent with multiple helper tools that can be called in sequence.
 */
export const AGENT_WITH_MULTIPLE_HELPERS: AgentDefinition<string, TestOutput, EmptyObject, EmptyObject> = agentBuilder(BASE_MINIMAL_AGENT)
	.withName('MultipleHelpersAgent')
	.withDescription('Agent with multiple helper tools')
	.withHelpers({
		query_data: {
			name: 'query_data',
			description: 'Query test data',
			inputSchema: z.object({query: z.string()}),
			handler: (state, toolInput) => {
				const handlerResult = mockDataQueryHandler(toolInput);
				if (!handlerResult.success) {
					return err(handlerResult.error);
				}
				return ok({
					newState: state,
					toolResult: handlerResult.data,
				});
			},
		},
		fetch_context: {
			name: 'fetch_context',
			description: 'Fetch additional context',
			inputSchema: z.object({id: z.string()}),
			handler: (state, toolInput) => {
				const handlerResult = mockFetchContextHandler(toolInput);
				if (!handlerResult.success) {
					return err(handlerResult.error);
				}
				return ok({
					newState: state,
					toolResult: handlerResult.data,
				});
			},
		},
		calculate: {
			name: 'calculate',
			description: 'Perform calculations',
			inputSchema: z.object({operation: z.string(), values: z.array(z.number())}),
			handler: (state, toolInput) => {
				const handlerResult = mockCalculateHandler(toolInput);
				if (!handlerResult.success) {
					return err(handlerResult.error);
				}
				return ok({
					newState: state,
					toolResult: handlerResult.data,
				});
			},
		},
	})
	.withObservability({
		trackCost: true,
		trackLatency: true,
		trackAttempts: true,
		trackTokens: true,
	})
	.build();

/**
 * 16. Agent with reflection mode
 *
 * Demonstrates reflection mode where the agent can call the output tool
 * multiple times to refine its output before final submission.
 */
export const AGENT_WITH_REFLECTION: AgentDefinition<string, TestOutput, EmptyObject, EmptyObject> = agentBuilder(BASE_MINIMAL_AGENT)
	.withName('ReflectionAgent')
	.withDescription('Agent with reflection mode enabled')
	.withReflection(mockReflectionHandler)
	.withObservability({
		trackCost: true,
		trackLatency: true,
		trackAttempts: true,
		trackTokens: true,
	})
	.build();

/**
 * 17. Agent with rejecting reflection handler
 *
 * Demonstrates reflection mode where the handler can reject output
 * and provide feedback for the model to improve.
 */
export const AGENT_WITH_REJECTING_REFLECTION: AgentDefinition<string, TestOutput, EmptyObject, EmptyObject> = agentBuilder(BASE_MINIMAL_AGENT)
	.withName('RejectingReflectionAgent')
	.withDescription('Agent with reflection handler that validates output')
	.withReflection(mockRejectingReflectionHandler)
	.withObservability({
		trackCost: true,
		trackLatency: true,
		trackAttempts: true,
		trackTokens: true,
	})
	.build();

/**
 * 18. Agent with both helper tools and reflection mode
 *
 * Demonstrates combining helper tools with reflection mode for
 * complex multi-step workflows with output refinement.
 */
export const AGENT_WITH_HELPERS_AND_REFLECTION: AgentDefinition<string, TestOutput, EmptyObject, EmptyObject> = agentBuilder(BASE_MINIMAL_AGENT)
	.withName('HelpersAndReflectionAgent')
	.withDescription('Agent with both helper tools and reflection mode')
	.withMaxTokens(2048)
	.withHelpers({
		query_data: {
			name: 'query_data',
			description: 'Query test data',
			inputSchema: z.object({query: z.string()}),
			handler: (state, toolInput) => {
				const handlerResult = mockDataQueryHandler(toolInput);
				if (!handlerResult.success) {
					return err(handlerResult.error);
				}
				return ok({
					newState: state,
					toolResult: handlerResult.data,
				});
			},
		},
		fetch_context: {
			name: 'fetch_context',
			description: 'Fetch additional context',
			inputSchema: z.object({id: z.string()}),
			handler: (state, toolInput) => {
				const handlerResult = mockFetchContextHandler(toolInput);
				if (!handlerResult.success) {
					return err(handlerResult.error);
				}
				return ok({
					newState: state,
					toolResult: handlerResult.data,
				});
			},
		},
	})
	.withReflection(mockReflectionHandler)
	.withObservability({
		trackCost: true,
		trackLatency: true,
		trackAttempts: true,
		trackTokens: true,
	})
	.build();

/**
 * 19. Agent with throwing helper tool handler
 *
 * Demonstrates exception safety when a helper tool violates the Result contract
 * by throwing an exception instead of returning err().
 */
export const AGENT_WITH_THROWING_HELPER: AgentDefinition<string, TestOutput, EmptyObject, EmptyObject> = agentBuilder(BASE_MINIMAL_AGENT)
	.withName('ThrowingHelperAgent')
	.withDescription('Agent with helper tool that throws exceptions')
	.withHelpers({
		throwing_tool: {
			name: 'throwing_tool',
			description: 'A tool that throws exceptions',
			inputSchema: z.object({query: z.string()}),
			handler: (state, toolInput) => {
				const handlerResult = mockThrowingHandler(toolInput);
				if (!handlerResult.success) {
					return err(handlerResult.error);
				}
				return ok({
					newState: state,
					toolResult: handlerResult.data,
				});
			},
		},
	})
	.withObservability({
		trackCost: true,
		trackLatency: true,
		trackAttempts: true,
		trackTokens: true,
	})
	.build();

/**
 * 20. Agent with throwing reflection handler
 *
 * Demonstrates exception safety when a reflection handler violates the Result contract
 * by throwing an exception instead of returning err().
 */
export const AGENT_WITH_THROWING_REFLECTION: AgentDefinition<string, TestOutput, EmptyObject, EmptyObject> = agentBuilder(BASE_MINIMAL_AGENT)
	.withName('ThrowingReflectionAgent')
	.withDescription('Agent with reflection handler that throws exceptions')
	.withReflection(mockThrowingReflectionHandler)
	.withObservability({
		trackCost: true,
		trackLatency: true,
		trackAttempts: true,
		trackTokens: true,
	})
	.build();

/**
 * 21. Agent with helper tools but no iteration limit specified
 *
 * Demonstrates default iteration limit behaviour when maxIterationsPerAttempt is not configured.
 * Should default to 15 iterations per attempt.
 */
export const AGENT_WITH_DEFAULT_ITERATION_LIMIT: AgentDefinition<string, TestOutput, EmptyObject, EmptyObject> = agentBuilder(BASE_MINIMAL_AGENT)
	.withName('DefaultIterationLimitAgent')
	.withDescription('Agent without explicit iteration limit configuration')
	.withHelpers({
		query_data: {
			name: 'query_data',
			description: 'Query test data',
			inputSchema: z.object({query: z.string()}),
			handler: (state, toolInput) => {
				const handlerResult = mockDataQueryHandler(toolInput);
				if (!handlerResult.success) {
					return err(handlerResult.error);
				}
				return ok({
					newState: state,
					toolResult: handlerResult.data,
				});
			},
		},
	})
	.withObservability({
		trackCost: true,
		trackLatency: true,
		trackAttempts: true,
		trackTokens: true,
	})
	.build();
