/**
 * Test fixtures for agent definition system
 *
 * Comprehensive test cases covering:
 * - Minimal valid agent configurations
 * - Complete agent configurations with all features
 * - Invalid configurations for each validation rule
 */

import {z} from 'zod';

import type {SpecError} from '@sigil/src/common/errors';

import type {AgentDefinition, AgentExecutionState} from './defineAgent';

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
		system: async (input: string, _state: AgentExecutionState) =>
			`You are a test agent processing: ${input}`,
		user: async (input: string, _state: AgentExecutionState) =>
			`Please process this input: ${input}`,
		error: async (errors: SpecError[], state: AgentExecutionState) =>
			`Attempt ${state.attempt} failed with ${errors.length} errors. Please try again.`,
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
		system: async (input: string, _state: AgentExecutionState) =>
			`You are an advanced agent. System context: ${input}`,
		user: async (input: string, _state: AgentExecutionState) =>
			`Process this with full validation: ${input}`,
		error: async (errors: SpecError[], state: AgentExecutionState) => {
			const errorList = errors.map((e) => `- ${e.code}`).join('\n');
			return `Attempt ${state.attempt}/${state.maxAttempts} failed:\n${errorList}\n\nPlease correct these issues.`;
		},
	},
	validation: {
		outputSchema: TEST_OUTPUT_SCHEMA,
		customValidators: [
			{
				name: 'result-length-validator',
				validate: async (output: unknown) => {
					const typed = output as TestOutput;
					if (typed.result.length < 10) {
						throw new Error('Result must be at least 10 characters');
					}
					return output;
				},
			},
			{
				name: 'no-empty-result-validator',
				validate: async (output: unknown) => {
					const typed = output as TestOutput;
					if (typed.result.trim() === '') {
						throw new Error('Result cannot be empty or whitespace only');
					}
					return output;
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
		system: async (input: string, _state: AgentExecutionState) => `System: ${input}`,
		user: async (input: string, _state: AgentExecutionState) => `User: ${input}`,
		error: async (errors: SpecError[], state: AgentExecutionState) =>
			`Error attempt ${state.attempt}`,
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
 * 4. Invalid agent - empty description
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
		system: async (input: string, _state: AgentExecutionState) => `System: ${input}`,
		user: async (input: string, _state: AgentExecutionState) => `User: ${input}`,
		error: async (errors: SpecError[], state: AgentExecutionState) =>
			`Error attempt ${state.attempt}`,
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
 * 5. Invalid agent - missing model name
 */
export const INVALID_MISSING_MODEL_NAME: AgentDefinition<string, TestOutput> = {
	name: 'ValidName',
	description: 'Valid description',
	model: {
		provider: 'anthropic',
		name: '',
		temperature: 0.7,
		maxTokens: 1024,
	},
	prompts: {
		system: async (input: string, _state: AgentExecutionState) => `System: ${input}`,
		user: async (input: string, _state: AgentExecutionState) => `User: ${input}`,
		error: async (errors: SpecError[], state: AgentExecutionState) =>
			`Error attempt ${state.attempt}`,
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
 * 6. Invalid agent - zero max attempts
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
		system: async (input: string, _state: AgentExecutionState) => `System: ${input}`,
		user: async (input: string, _state: AgentExecutionState) => `User: ${input}`,
		error: async (errors: SpecError[], state: AgentExecutionState) =>
			`Error attempt ${state.attempt}`,
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
 * 7. Invalid agent - missing output schema
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
			system: async (input: string, _state: AgentExecutionState) =>
				`System: ${input}`,
			user: async (input: string, _state: AgentExecutionState) => `User: ${input}`,
			error: async (errors: SpecError[], state: AgentExecutionState) =>
				`Error attempt ${state.attempt}`,
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
