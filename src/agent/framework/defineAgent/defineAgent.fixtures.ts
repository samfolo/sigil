/**
 * Test fixtures for agent definition system
 *
 * Comprehensive test cases covering:
 * - Minimal valid agent configurations
 * - Complete agent configurations with all features
 * - Agents with helper tools and reflection mode
 * - Invalid configurations for each validation rule
 */

import {z} from 'zod';

import type {AgentExecutionState} from '@sigil/src/agent/framework/types';
import type {Result} from '@sigil/src/common/errors';
import {err, ok} from '@sigil/src/common/errors';

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
 * 1. Minimal valid agent - simplest possible configuration
 */
export const VALID_MINIMAL_AGENT: AgentDefinition<string, TestOutput> = {
	name: 'TestAgent',
	description: 'A simple test agent for validation',
	model: {
		provider: 'anthropic',
		name: 'claude-sonnet-4-5-20250929',
		temperature: 0.7,
		maxTokens: 1024,
	},
	prompts: {
		system: async (input: string, _state: AgentExecutionState, _signal?: AbortSignal) =>
			`You are a test agent processing: ${input}`,
		user: async (input: string, _signal?: AbortSignal) =>
			`Please process this input: ${input}`,
		error: async (errorMessage: string, state: AgentExecutionState, _signal?: AbortSignal) =>
			`Attempt ${state.attempt} failed:\n${errorMessage}\n\nPlease try again.`,
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
 * 2. Complete valid agent - all features enabled with custom validator
 */
export const VALID_COMPLETE_AGENT: AgentDefinition<string, TestOutput> = {
	name: 'CompleteAgent',
	description: 'Agent with all observability flags and custom validation',
	model: {
		provider: 'anthropic',
		name: 'claude-sonnet-4-5-20250929',
		temperature: 0.5,
		maxTokens: 2048,
	},
	prompts: {
		system: async (input: string, _state: AgentExecutionState, _signal?: AbortSignal) =>
			`You are an advanced agent. System context: ${input}`,
		user: async (input: string, _signal?: AbortSignal) =>
			`Process this with full validation: ${input}`,
		error: async (errorMessage: string, state: AgentExecutionState, _signal?: AbortSignal) =>
			`Attempt ${state.attempt}/${state.maxAttempts} failed:\n${errorMessage}\n\nPlease correct these issues.`,
	},
	tools: {
		output: {
			name: 'generate_output',
			description: 'Generate the fully validated output result',
		},
	},
	validation: {
		outputSchema: TEST_OUTPUT_SCHEMA,
		customValidators: [
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
		],
		maxAttempts: 5,
	},
	observability: {
		trackCost: true,
		trackLatency: true,
		trackAttempts: true,
		trackTokens: true,
	},
};

/**
 * 3. Invalid agent - empty name
 *
 * When passed to defineAgent, should return error with code EMPTY_NAME
 */
export const INVALID_EMPTY_NAME: AgentDefinition<string, TestOutput> = {
	name: '',
	description: 'Agent with empty name',
	model: {
		provider: 'anthropic',
		name: 'claude-sonnet-4-5-20250929',
		temperature: 0.7,
		maxTokens: 1024,
	},
	prompts: {
		system: async (input: string, _state: AgentExecutionState, _signal?: AbortSignal) => `System: ${input}`,
		user: async (input: string, _signal?: AbortSignal) => `User: ${input}`,
		error: async (errorMessage: string, state: AgentExecutionState, _signal?: AbortSignal) =>
			`Error attempt ${state.attempt}: ${errorMessage}`,
	},
	tools: {
		output: {
			name: 'generate_output',
			description: 'Generate the output',
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
 * 4. Invalid agent - whitespace-only name
 *
 * When passed to defineAgent, should return error with code EMPTY_NAME
 */
export const INVALID_WHITESPACE_NAME: AgentDefinition<string, TestOutput> = {
	name: '   ',
	description: 'Agent with whitespace-only name',
	model: {
		provider: 'anthropic',
		name: 'claude-sonnet-4-5-20250929',
		temperature: 0.7,
		maxTokens: 1024,
	},
	prompts: {
		system: async (input: string, _state: AgentExecutionState, _signal?: AbortSignal) => `System: ${input}`,
		user: async (input: string, _signal?: AbortSignal) => `User: ${input}`,
		error: async (errorMessage: string, state: AgentExecutionState, _signal?: AbortSignal) =>
			`Error attempt ${state.attempt}: ${errorMessage}`,
	},
	tools: {
		output: {
			name: 'generate_output',
			description: 'Generate the output',
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
 * 5. Invalid agent - empty description
 *
 * When passed to defineAgent, should return error with code EMPTY_DESCRIPTION
 */
export const INVALID_EMPTY_DESCRIPTION: AgentDefinition<string, TestOutput> = {
	name: 'ValidName',
	description: '',
	model: {
		provider: 'anthropic',
		name: 'claude-sonnet-4-5-20250929',
		temperature: 0.7,
		maxTokens: 1024,
	},
	prompts: {
		system: async (input: string, _state: AgentExecutionState, _signal?: AbortSignal) => `System: ${input}`,
		user: async (input: string, _signal?: AbortSignal) => `User: ${input}`,
		error: async (errorMessage: string, state: AgentExecutionState, _signal?: AbortSignal) =>
			`Error attempt ${state.attempt}: ${errorMessage}`,
	},
	tools: {
		output: {
			name: 'generate_output',
			description: 'Generate the output',
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
 * 6. Invalid agent - whitespace-only description
 *
 * When passed to defineAgent, should return error with code EMPTY_DESCRIPTION
 */
export const INVALID_WHITESPACE_DESCRIPTION: AgentDefinition<string, TestOutput> =
  {
  	name: 'ValidName',
  	description: '   ',
  	model: {
  		provider: 'anthropic',
  		name: 'claude-sonnet-4-5-20250929',
  		temperature: 0.7,
  		maxTokens: 1024,
  	},
  	prompts: {
  		system: async (input: string, _state: AgentExecutionState, _signal?: AbortSignal) =>
  			`System: ${input}`,
  		user: async (input: string, _signal?: AbortSignal) => `User: ${input}`,
  		error: async (errorMessage: string, state: AgentExecutionState, _signal?: AbortSignal) =>
  			`Error attempt ${state.attempt}: ${errorMessage}`,
  	},
  	tools: {
  		output: {
  			name: 'generate_output',
  			description: 'Generate the output',
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
 * 7. Invalid agent - empty model name
 *
 * When passed to defineAgent, should return error with code EMPTY_MODEL_NAME
 */
export const INVALID_EMPTY_MODEL_NAME: AgentDefinition<string, TestOutput> = {
	name: 'ValidName',
	description: 'Valid description',
	model: {
		provider: 'anthropic',
		name: '',
		temperature: 0.7,
		maxTokens: 1024,
	},
	prompts: {
		system: async (input: string, _state: AgentExecutionState, _signal?: AbortSignal) => `System: ${input}`,
		user: async (input: string, _signal?: AbortSignal) => `User: ${input}`,
		error: async (errorMessage: string, state: AgentExecutionState, _signal?: AbortSignal) =>
			`Error attempt ${state.attempt}: ${errorMessage}`,
	},
	tools: {
		output: {
			name: 'generate_output',
			description: 'Generate the output',
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
 * 8. Invalid agent - whitespace-only model name
 *
 * When passed to defineAgent, should return error with code EMPTY_MODEL_NAME
 */
export const INVALID_WHITESPACE_MODEL_NAME: AgentDefinition<string, TestOutput> =
  {
  	name: 'ValidName',
  	description: 'Valid description',
  	model: {
  		provider: 'anthropic',
  		name: '   ',
  		temperature: 0.7,
  		maxTokens: 1024,
  	},
  	prompts: {
  		system: async (input: string, _state: AgentExecutionState, _signal?: AbortSignal) =>
  			`System: ${input}`,
  		user: async (input: string, _signal?: AbortSignal) => `User: ${input}`,
  		error: async (errorMessage: string, state: AgentExecutionState, _signal?: AbortSignal) =>
  			`Error attempt ${state.attempt}: ${errorMessage}`,
  	},
  	tools: {
  		output: {
  			name: 'generate_output',
  			description: 'Generate the output',
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
 * 9. Invalid agent - zero max attempts
 *
 * When passed to defineAgent, should return error with code INVALID_MAX_ATTEMPTS
 */
export const INVALID_ZERO_MAX_ATTEMPTS: AgentDefinition<string, TestOutput> = {
	name: 'ValidName',
	description: 'Valid description',
	model: {
		provider: 'anthropic',
		name: 'claude-sonnet-4-5-20250929',
		temperature: 0.7,
		maxTokens: 1024,
	},
	prompts: {
		system: async (input: string, _state: AgentExecutionState, _signal?: AbortSignal) => `System: ${input}`,
		user: async (input: string, _signal?: AbortSignal) => `User: ${input}`,
		error: async (errorMessage: string, state: AgentExecutionState, _signal?: AbortSignal) =>
			`Error attempt ${state.attempt}: ${errorMessage}`,
	},
	tools: {
		output: {
			name: 'generate_output',
			description: 'Generate the output',
		},
	},
	validation: {
		outputSchema: TEST_OUTPUT_SCHEMA,
		customValidators: [],
		maxAttempts: 0,
	},
	observability: {
		trackCost: false,
		trackLatency: false,
		trackAttempts: false,
		trackTokens: false,
	},
};

/**
 * 10. Invalid agent - negative max attempts
 *
 * When passed to defineAgent, should return error with code INVALID_MAX_ATTEMPTS
 */
export const INVALID_NEGATIVE_MAX_ATTEMPTS: AgentDefinition<string, TestOutput> =
  {
  	name: 'ValidName',
  	description: 'Valid description',
  	model: {
  		provider: 'anthropic',
  		name: 'claude-sonnet-4-5-20250929',
  		temperature: 0.7,
  		maxTokens: 1024,
  	},
  	prompts: {
  		system: async (input: string, _state: AgentExecutionState, _signal?: AbortSignal) =>
  			`System: ${input}`,
  		user: async (input: string, _signal?: AbortSignal) => `User: ${input}`,
  		error: async (errorMessage: string, state: AgentExecutionState, _signal?: AbortSignal) =>
  			`Error attempt ${state.attempt}: ${errorMessage}`,
  	},
  	tools: {
  		output: {
  			name: 'generate_output',
  			description: 'Generate the output',
  		},
  	},
  	validation: {
  		outputSchema: TEST_OUTPUT_SCHEMA,
  		customValidators: [],
  		maxAttempts: -1,
  	},
  	observability: {
  		trackCost: false,
  		trackLatency: false,
  		trackAttempts: false,
  		trackTokens: false,
  	},
  };

/**
 * 11. Invalid agent - missing output schema
 *
 * When passed to defineAgent, should return error with code MISSING_OUTPUT_SCHEMA
 *
 * Note: This fixture uses a type assertion to bypass TypeScript checking
 * since we need to test runtime validation of this error case.
 */
export const INVALID_MISSING_OUTPUT_SCHEMA: AgentDefinition<string, TestOutput> =
  {
  	name: 'ValidName',
  	description: 'Valid description',
  	model: {
  		provider: 'anthropic',
  		name: 'claude-sonnet-4-5-20250929',
  		temperature: 0.7,
  		maxTokens: 1024,
  	},
  	prompts: {
  		system: async (input: string, _state: AgentExecutionState, _signal?: AbortSignal) =>
  			`System: ${input}`,
  		user: async (input: string, _signal?: AbortSignal) => `User: ${input}`,
  		error: async (errorMessage: string, state: AgentExecutionState, _signal?: AbortSignal) =>
  			`Error attempt ${state.attempt}: ${errorMessage}`,
  	},
  	tools: {
  		output: {
  			name: 'generate_output',
  			description: 'Generate the output',
  		},
  	},
  	validation: {
  		outputSchema: undefined as unknown as z.ZodSchema<TestOutput>,
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
 * 12. Invalid agent - multiple errors
 *
 * When passed to defineAgent, should return multiple errors:
 * - EMPTY_NAME
 * - EMPTY_DESCRIPTION
 * - EMPTY_MODEL_NAME
 * - INVALID_MAX_ATTEMPTS
 */
export const INVALID_MULTIPLE_ERRORS: AgentDefinition<string, TestOutput> = {
	name: '',
	description: '',
	model: {
		provider: 'anthropic',
		name: '',
		temperature: 0.7,
		maxTokens: 1024,
	},
	prompts: {
		system: async (input: string, _state: AgentExecutionState, _signal?: AbortSignal) => `System: ${input}`,
		user: async (input: string, _signal?: AbortSignal) => `User: ${input}`,
		error: async (errorMessage: string, state: AgentExecutionState, _signal?: AbortSignal) =>
			`Error attempt ${state.attempt}: ${errorMessage}`,
	},
	tools: {
		output: {
			name: 'generate_output',
			description: 'Generate the output',
		},
	},
	validation: {
		outputSchema: TEST_OUTPUT_SCHEMA,
		customValidators: [],
		maxAttempts: 0,
	},
	observability: {
		trackCost: false,
		trackLatency: false,
		trackAttempts: false,
		trackTokens: false,
	},
};

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
 * 13. Agent with helper tools - single helper tool
 *
 * Demonstrates agent using helper tools for multi-step workflows.
 * Uses mockDataQueryHandler which always succeeds.
 */
export const AGENT_WITH_HELPER_TOOLS: AgentDefinition<string, TestOutput> = {
	name: 'HelperToolsAgent',
	description: 'Agent with helper tools for data querying',
	model: {
		provider: 'anthropic',
		name: 'claude-sonnet-4-5-20250929',
		temperature: 0.7,
		maxTokens: 1024,
	},
	prompts: {
		system: async (input: string, _state: AgentExecutionState, _signal?: AbortSignal) =>
			`You are a test agent with helper tools. Processing: ${input}`,
		user: async (input: string, _signal?: AbortSignal) =>
			`Please process this input using helper tools if needed: ${input}`,
		error: async (errorMessage: string, state: AgentExecutionState, _signal?: AbortSignal) =>
			`Attempt ${state.attempt} failed:\n${errorMessage}\n\nPlease try again.`,
	},
	tools: {
		output: {
			name: 'generate_output',
			description: 'Generate the test output result',
		},
		helpers: [
			{
				name: 'query_data',
				description: 'Query test data',
				inputSchema: z.object({query: z.string()}),
				handler: mockDataQueryHandler,
			},
		],
	},
	validation: {
		outputSchema: TEST_OUTPUT_SCHEMA,
		customValidators: [],
		maxAttempts: 3,
		maxIterationsPerAttempt: 15,
	},
	observability: {
		trackCost: true,
		trackLatency: true,
		trackAttempts: true,
		trackTokens: true,
	},
};

/**
 * 14. Agent with failing helper tool
 *
 * Demonstrates error handling for helper tools that return errors.
 * Uses mockFailingHandler which always returns err().
 */
export const AGENT_WITH_FAILING_HELPER: AgentDefinition<string, TestOutput> = {
	name: 'FailingHelperAgent',
	description: 'Agent with helper tool that fails',
	model: {
		provider: 'anthropic',
		name: 'claude-sonnet-4-5-20250929',
		temperature: 0.7,
		maxTokens: 1024,
	},
	prompts: {
		system: async (input: string, _state: AgentExecutionState, _signal?: AbortSignal) =>
			`You are a test agent with helper tools. Processing: ${input}`,
		user: async (input: string, _signal?: AbortSignal) =>
			`Please process this input: ${input}`,
		error: async (errorMessage: string, state: AgentExecutionState, _signal?: AbortSignal) =>
			`Attempt ${state.attempt} failed:\n${errorMessage}\n\nPlease try again.`,
	},
	tools: {
		output: {
			name: 'generate_output',
			description: 'Generate the test output result',
		},
		helpers: [
			{
				name: 'failing_tool',
				description: 'A tool that always fails',
				inputSchema: z.object({query: z.string()}),
				handler: mockFailingHandler,
			},
		],
	},
	validation: {
		outputSchema: TEST_OUTPUT_SCHEMA,
		customValidators: [],
		maxAttempts: 3,
		maxIterationsPerAttempt: 15,
	},
	observability: {
		trackCost: true,
		trackLatency: true,
		trackAttempts: true,
		trackTokens: true,
	},
};

/**
 * 15. Agent with multiple helper tools
 *
 * Demonstrates agent with multiple helper tools that can be called in sequence.
 */
export const AGENT_WITH_MULTIPLE_HELPERS: AgentDefinition<string, TestOutput> = {
	name: 'MultipleHelpersAgent',
	description: 'Agent with multiple helper tools',
	model: {
		provider: 'anthropic',
		name: 'claude-sonnet-4-5-20250929',
		temperature: 0.7,
		maxTokens: 1024,
	},
	prompts: {
		system: async (input: string, _state: AgentExecutionState, _signal?: AbortSignal) =>
			`You are a test agent with multiple helper tools. Processing: ${input}`,
		user: async (input: string, _signal?: AbortSignal) =>
			`Please process this input using the available tools: ${input}`,
		error: async (errorMessage: string, state: AgentExecutionState, _signal?: AbortSignal) =>
			`Attempt ${state.attempt} failed:\n${errorMessage}\n\nPlease try again.`,
	},
	tools: {
		output: {
			name: 'generate_output',
			description: 'Generate the test output result',
		},
		helpers: [
			{
				name: 'query_data',
				description: 'Query test data',
				inputSchema: z.object({query: z.string()}),
				handler: mockDataQueryHandler,
			},
			{
				name: 'fetch_context',
				description: 'Fetch additional context',
				inputSchema: z.object({id: z.string()}),
				handler: mockFetchContextHandler,
			},
			{
				name: 'calculate',
				description: 'Perform calculations',
				inputSchema: z.object({operation: z.string(), values: z.array(z.number())}),
				handler: mockCalculateHandler,
			},
		],
	},
	validation: {
		outputSchema: TEST_OUTPUT_SCHEMA,
		customValidators: [],
		maxAttempts: 3,
		maxIterationsPerAttempt: 15,
	},
	observability: {
		trackCost: true,
		trackLatency: true,
		trackAttempts: true,
		trackTokens: true,
	},
};

/**
 * 16. Agent with reflection mode
 *
 * Demonstrates reflection mode where the agent can call the output tool
 * multiple times to refine its output before final submission.
 */
export const AGENT_WITH_REFLECTION: AgentDefinition<string, TestOutput> = {
	name: 'ReflectionAgent',
	description: 'Agent with reflection mode enabled',
	model: {
		provider: 'anthropic',
		name: 'claude-sonnet-4-5-20250929',
		temperature: 0.7,
		maxTokens: 1024,
	},
	prompts: {
		system: async (input: string, _state: AgentExecutionState, _signal?: AbortSignal) =>
			`You are a test agent with reflection mode. Processing: ${input}`,
		user: async (input: string, _signal?: AbortSignal) =>
			`Please process this input and review your output before submitting: ${input}`,
		error: async (errorMessage: string, state: AgentExecutionState, _signal?: AbortSignal) =>
			`Attempt ${state.attempt} failed:\n${errorMessage}\n\nPlease try again.`,
	},
	tools: {
		output: {
			name: 'generate_output',
			description: 'Generate the test output result',
			reflectionHandler: mockReflectionHandler,
		},
	},
	validation: {
		outputSchema: TEST_OUTPUT_SCHEMA,
		customValidators: [],
		maxAttempts: 3,
		maxIterationsPerAttempt: 15,
	},
	observability: {
		trackCost: true,
		trackLatency: true,
		trackAttempts: true,
		trackTokens: true,
	},
};

/**
 * 17. Agent with rejecting reflection handler
 *
 * Demonstrates reflection mode where the handler can reject output
 * and provide feedback for the model to improve.
 */
export const AGENT_WITH_REJECTING_REFLECTION: AgentDefinition<string, TestOutput> = {
	name: 'RejectingReflectionAgent',
	description: 'Agent with reflection handler that validates output',
	model: {
		provider: 'anthropic',
		name: 'claude-sonnet-4-5-20250929',
		temperature: 0.7,
		maxTokens: 1024,
	},
	prompts: {
		system: async (input: string, _state: AgentExecutionState, _signal?: AbortSignal) =>
			`You are a test agent with strict reflection validation. Processing: ${input}`,
		user: async (input: string, _signal?: AbortSignal) =>
			`Please process this input and ensure it meets all requirements: ${input}`,
		error: async (errorMessage: string, state: AgentExecutionState, _signal?: AbortSignal) =>
			`Attempt ${state.attempt} failed:\n${errorMessage}\n\nPlease try again.`,
	},
	tools: {
		output: {
			name: 'generate_output',
			description: 'Generate the test output result (must be at least 20 characters)',
			reflectionHandler: mockRejectingReflectionHandler,
		},
	},
	validation: {
		outputSchema: TEST_OUTPUT_SCHEMA,
		customValidators: [],
		maxAttempts: 3,
		maxIterationsPerAttempt: 15,
	},
	observability: {
		trackCost: true,
		trackLatency: true,
		trackAttempts: true,
		trackTokens: true,
	},
};

/**
 * 18. Agent with both helper tools and reflection mode
 *
 * Demonstrates combining helper tools with reflection mode for
 * complex multi-step workflows with output refinement.
 */
export const AGENT_WITH_HELPERS_AND_REFLECTION: AgentDefinition<string, TestOutput> = {
	name: 'HelpersAndReflectionAgent',
	description: 'Agent with both helper tools and reflection mode',
	model: {
		provider: 'anthropic',
		name: 'claude-sonnet-4-5-20250929',
		temperature: 0.7,
		maxTokens: 2048,
	},
	prompts: {
		system: async (input: string, _state: AgentExecutionState, _signal?: AbortSignal) =>
			`You are an advanced agent with helper tools and reflection. Processing: ${input}`,
		user: async (input: string, _signal?: AbortSignal) =>
			`Please process this input using helper tools and review your output: ${input}`,
		error: async (errorMessage: string, state: AgentExecutionState, _signal?: AbortSignal) =>
			`Attempt ${state.attempt} failed:\n${errorMessage}\n\nPlease try again.`,
	},
	tools: {
		output: {
			name: 'generate_output',
			description: 'Generate the test output result',
			reflectionHandler: mockReflectionHandler,
		},
		helpers: [
			{
				name: 'query_data',
				description: 'Query test data',
				inputSchema: z.object({query: z.string()}),
				handler: mockDataQueryHandler,
			},
			{
				name: 'fetch_context',
				description: 'Fetch additional context',
				inputSchema: z.object({id: z.string()}),
				handler: mockFetchContextHandler,
			},
		],
	},
	validation: {
		outputSchema: TEST_OUTPUT_SCHEMA,
		customValidators: [],
		maxAttempts: 3,
		maxIterationsPerAttempt: 15,
	},
	observability: {
		trackCost: true,
		trackLatency: true,
		trackAttempts: true,
		trackTokens: true,
	},
};
