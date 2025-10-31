/**
 * Test fixtures for prompt building utilities
 *
 * Provides mock agents with various prompt function behaviours:
 * - Working prompts (sync and async)
 * - Prompts that throw synchronously
 * - Prompts that return rejecting promises
 * - Various execution state scenarios
 */

import {z} from 'zod';

import type {AgentDefinition} from '@sigil/src/agent/framework/defineAgent/defineAgent';
import type {AgentExecutionContext} from '@sigil/src/agent/framework/types';
import type {EmptyObject} from '@sigil/src/common/types';

/**
 * Simple input interface for test agents
 */
interface TestInput {
  query: string;
}

/**
 * Simple output interface for test agents
 */
interface TestOutput {
  result: string;
}

/**
 * Test output schema
 */
const TEST_OUTPUT_SCHEMA = z.object({
	result: z.string(),
});

/**
 * Default tools config for test fixtures
 */
const TEST_TOOLS_CONFIG = {
	output: {
		name: 'generate_output',
		description: 'Generate the test output',
	},
};

/**
 * Execution state for first attempt
 */
export const FIRST_ATTEMPT_CONTEXT: AgentExecutionContext = {
	attempt: 1,
	maxAttempts: 3,
	iteration: 1,
	maxIterations: 10,
};

/**
 * Execution state for second attempt (retry)
 */
export const SECOND_ATTEMPT_CONTEXT: AgentExecutionContext = {
	attempt: 2,
	maxAttempts: 3,
	iteration: 1,
	maxIterations: 10,
};

/**
 * Execution state for final attempt
 */
export const FINAL_ATTEMPT_CONTEXT: AgentExecutionContext = {
	attempt: 3,
	maxAttempts: 3,
	iteration: 1,
	maxIterations: 10,
};

/**
 * Test input data
 */
export const TEST_INPUT: TestInput = {
	query: 'Analyse sales data',
};

/**
 * Test error message
 */
export const TEST_ERROR_MESSAGE = 'Validation failed: missing required field';

/**
 * Working agent with all prompt functions functioning correctly
 */
export const WORKING_AGENT: AgentDefinition<TestInput, TestOutput, EmptyObject, EmptyObject> = {
	name: 'WorkingAgent',
	description: 'Agent with working prompt functions',
	model: {
		provider: 'anthropic',
		name: 'claude-sonnet-4-5-20250929',
		temperature: 0.7,
		maxTokens: 1024,
	},
	prompts: {
		system: async (input: TestInput, context: AgentExecutionContext) =>
			`System prompt for ${input.query} (attempt ${context.attempt}/${context.maxAttempts})`,
		user: async (input: TestInput) =>
			`User prompt: ${input.query}`,
		error: async (errorMessage: string, context: AgentExecutionContext) =>
			`Attempt ${context.attempt}/${context.maxAttempts} failed:\n${errorMessage}\n\nPlease fix these issues.`,
	},
	tools: TEST_TOOLS_CONFIG,
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
 * Agent with system prompt that throws synchronously
 */
export const SYSTEM_THROWS_AGENT: AgentDefinition<TestInput, TestOutput, EmptyObject, EmptyObject> = {
	name: 'SystemThrowsAgent',
	description: 'Agent with system prompt that throws',
	model: {
		provider: 'anthropic',
		name: 'claude-sonnet-4-5-20250929',
		temperature: 0.7,
		maxTokens: 1024,
	},
	prompts: {
		system: async (_input: TestInput, _context: AgentExecutionContext) => {
			throw new Error('System prompt generation failed');
		},
		user: async (input: TestInput) =>
			`User prompt: ${input.query}`,
		error: async (errorMessage: string, _context: AgentExecutionContext) =>
			`Error: ${errorMessage}`,
	},
	tools: TEST_TOOLS_CONFIG,
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
 * Agent with user prompt that throws synchronously
 */
export const USER_THROWS_AGENT: AgentDefinition<TestInput, TestOutput, EmptyObject, EmptyObject> = {
	name: 'UserThrowsAgent',
	description: 'Agent with user prompt that throws',
	model: {
		provider: 'anthropic',
		name: 'claude-sonnet-4-5-20250929',
		temperature: 0.7,
		maxTokens: 1024,
	},
	prompts: {
		system: async (input: TestInput, _context: AgentExecutionContext) =>
			`System prompt: ${input.query}`,
		user: async (_input: TestInput) => {
			throw new Error('User prompt generation failed');
		},
		error: async (errorMessage: string, _context: AgentExecutionContext) =>
			`Error: ${errorMessage}`,
	},
	tools: TEST_TOOLS_CONFIG,
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
 * Agent with error prompt that throws synchronously
 */
export const ERROR_THROWS_AGENT: AgentDefinition<TestInput, TestOutput, EmptyObject, EmptyObject> = {
	name: 'ErrorThrowsAgent',
	description: 'Agent with error prompt that throws',
	model: {
		provider: 'anthropic',
		name: 'claude-sonnet-4-5-20250929',
		temperature: 0.7,
		maxTokens: 1024,
	},
	prompts: {
		system: async (input: TestInput, _context: AgentExecutionContext) =>
			`System prompt: ${input.query}`,
		user: async (input: TestInput) =>
			`User prompt: ${input.query}`,
		error: async (_errorMessage: string, _context: AgentExecutionContext) => {
			throw new Error('Error prompt generation failed');
		},
	},
	tools: TEST_TOOLS_CONFIG,
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
 * Agent with system prompt that returns rejecting promise
 */
export const SYSTEM_REJECTS_AGENT: AgentDefinition<TestInput, TestOutput, EmptyObject, EmptyObject> = {
	name: 'SystemRejectsAgent',
	description: 'Agent with system prompt that rejects',
	model: {
		provider: 'anthropic',
		name: 'claude-sonnet-4-5-20250929',
		temperature: 0.7,
		maxTokens: 1024,
	},
	prompts: {
		system: async (_input: TestInput, _context: AgentExecutionContext) =>
			Promise.reject(new Error('System prompt async failure')),
		user: async (input: TestInput) =>
			`User prompt: ${input.query}`,
		error: async (errorMessage: string, _context: AgentExecutionContext) =>
			`Error: ${errorMessage}`,
	},
	tools: TEST_TOOLS_CONFIG,
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
 * Agent with user prompt that returns rejecting promise
 */
export const USER_REJECTS_AGENT: AgentDefinition<TestInput, TestOutput, EmptyObject, EmptyObject> = {
	name: 'UserRejectsAgent',
	description: 'Agent with user prompt that rejects',
	model: {
		provider: 'anthropic',
		name: 'claude-sonnet-4-5-20250929',
		temperature: 0.7,
		maxTokens: 1024,
	},
	prompts: {
		system: async (input: TestInput, _context: AgentExecutionContext) =>
			`System prompt: ${input.query}`,
		user: async (_input: TestInput) =>
			Promise.reject(new Error('User prompt async failure')),
		error: async (errorMessage: string, _context: AgentExecutionContext) =>
			`Error: ${errorMessage}`,
	},
	tools: TEST_TOOLS_CONFIG,
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
 * Agent with error prompt that returns rejecting promise
 */
export const ERROR_REJECTS_AGENT: AgentDefinition<TestInput, TestOutput, EmptyObject, EmptyObject> = {
	name: 'ErrorRejectsAgent',
	description: 'Agent with error prompt that rejects',
	model: {
		provider: 'anthropic',
		name: 'claude-sonnet-4-5-20250929',
		temperature: 0.7,
		maxTokens: 1024,
	},
	prompts: {
		system: async (input: TestInput, _context: AgentExecutionContext) =>
			`System prompt: ${input.query}`,
		user: async (input: TestInput) =>
			`User prompt: ${input.query}`,
		error: async (_errorMessage: string, _context: AgentExecutionContext) =>
			Promise.reject(new Error('Error prompt async failure')),
	},
	tools: TEST_TOOLS_CONFIG,
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
 * Agent with system prompt that throws non-Error value
 */
export const NON_ERROR_THROW_AGENT: AgentDefinition<TestInput, TestOutput, EmptyObject, EmptyObject> = {
	name: 'NonErrorThrowAgent',
	description: 'Agent with prompt that throws non-Error value',
	model: {
		provider: 'anthropic',
		name: 'claude-sonnet-4-5-20250929',
		temperature: 0.7,
		maxTokens: 1024,
	},
	prompts: {
		system: async (_input: TestInput, _context: AgentExecutionContext) => {
			throw 'String error instead of Error object';
		},
		user: async (input: TestInput) =>
			`User prompt: ${input.query}`,
		error: async (errorMessage: string, _context: AgentExecutionContext) =>
			`Error: ${errorMessage}`,
	},
	tools: TEST_TOOLS_CONFIG,
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
 * Agent with user prompt that throws non-Error value
 */
export const USER_NON_ERROR_THROW_AGENT: AgentDefinition<TestInput, TestOutput, EmptyObject, EmptyObject> = {
	name: 'UserNonErrorThrowAgent',
	description: 'Agent with user prompt that throws non-Error value',
	model: {
		provider: 'anthropic',
		name: 'claude-sonnet-4-5-20250929',
		temperature: 0.7,
		maxTokens: 1024,
	},
	prompts: {
		system: async (input: TestInput, _context: AgentExecutionContext) =>
			`System prompt: ${input.query}`,
		user: async (_input: TestInput) => {
			throw 'String error in user prompt';
		},
		error: async (errorMessage: string, _context: AgentExecutionContext) =>
			`Error: ${errorMessage}`,
	},
	tools: TEST_TOOLS_CONFIG,
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
 * Agent with error prompt that throws non-Error value
 */
export const ERROR_NON_ERROR_THROW_AGENT: AgentDefinition<TestInput, TestOutput, EmptyObject, EmptyObject> = {
	name: 'ErrorNonErrorThrowAgent',
	description: 'Agent with error prompt that throws non-Error value',
	model: {
		provider: 'anthropic',
		name: 'claude-sonnet-4-5-20250929',
		temperature: 0.7,
		maxTokens: 1024,
	},
	prompts: {
		system: async (input: TestInput, _context: AgentExecutionContext) =>
			`System prompt: ${input.query}`,
		user: async (input: TestInput) =>
			`User prompt: ${input.query}`,
		error: async (_errorMessage: string, _context: AgentExecutionContext) => {
			throw 'String error in error prompt';
		},
	},
	tools: TEST_TOOLS_CONFIG,
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
