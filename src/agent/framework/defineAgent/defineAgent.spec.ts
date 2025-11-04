/**
 * Tests for defineAgent function
 */

import {describe, expect, it} from 'vitest';

import {isErr, isOk, ok, AGENT_ERROR_CODES} from '@sigil/src/common/errors';

import {defineAgent} from './defineAgent';
import {
	INVALID_EMPTY_DESCRIPTION,
	INVALID_EMPTY_MODEL_NAME,
	INVALID_EMPTY_NAME,
	INVALID_MISSING_OUTPUT_SCHEMA,
	INVALID_MULTIPLE_ERRORS,
	INVALID_NEGATIVE_MAX_ATTEMPTS,
	INVALID_WHITESPACE_DESCRIPTION,
	INVALID_WHITESPACE_MODEL_NAME,
	INVALID_WHITESPACE_NAME,
	INVALID_ZERO_MAX_ATTEMPTS,
	VALID_COMPLETE_AGENT,
	VALID_MINIMAL_AGENT,
} from './defineAgent.fixtures';

describe('defineAgent', () => {
	describe('valid definitions', () => {
		it('should successfully create agent from minimal config', () => {
			const result = defineAgent(VALID_MINIMAL_AGENT);

			expect(isOk(result)).toBe(true);

			if (isOk(result)) {
				expect(result.data.name).toBe('TestAgent');
				expect(result.data.description).toBe('A simple test agent for validation');
			}
		});

		it('should successfully create agent from complete config', () => {
			const result = defineAgent(VALID_COMPLETE_AGENT);

			expect(isOk(result)).toBe(true);

			if (isOk(result)) {
				expect(result.data.name).toBe('CompleteAgent');
				expect(result.data.description).toBe(
					'Agent with all observability flags and custom validation'
				);
			}
		});

		it('should preserve all config properties correctly', () => {
			const result = defineAgent(VALID_MINIMAL_AGENT);

			expect(isOk(result)).toBe(true);

			if (isOk(result)) {
				const agent = result.data;

				// Model properties
				expect(agent.model.provider).toBe('anthropic');
				expect(agent.model.name).toBe('claude-sonnet-4-5-20250929');
				expect(agent.model.temperature).toBe(0.7);
				expect(agent.model.maxTokens).toBe(1024);

				// Prompts
				expect(agent.prompts.system).toBe(VALID_MINIMAL_AGENT.prompts.system);
				expect(agent.prompts.user).toBe(VALID_MINIMAL_AGENT.prompts.user);
				expect(agent.prompts.error).toBe(VALID_MINIMAL_AGENT.prompts.error);

				// Validation
				expect(agent.validation.outputSchema).toBe(
					VALID_MINIMAL_AGENT.validation.outputSchema
				);
				expect(agent.validation.customValidators).toEqual([]);
				expect(agent.validation.maxAttempts).toBe(3);

				// Observability
				expect(agent.observability.trackCost).toBe(false);
				expect(agent.observability.trackLatency).toBe(false);
				expect(agent.observability.trackAttempts).toBe(false);
				expect(agent.observability.trackTokens).toBe(false);
			}
		});

		it('should preserve complete config with custom validators', () => {
			const result = defineAgent(VALID_COMPLETE_AGENT);

			expect(isOk(result)).toBe(true);

			if (isOk(result)) {
				const agent = result.data;

				// Model properties
				expect(agent.model.provider).toBe('anthropic');
				expect(agent.model.name).toBe('claude-sonnet-4-5-20250929');
				expect(agent.model.temperature).toBe(0.5);
				expect(agent.model.maxTokens).toBe(2048);

				// Validation with custom validators
				expect(agent.validation.customValidators).toHaveLength(2);
				expect(agent.validation.customValidators.at(0)?.name).toBe(
					'result-length-validator'
				);
				expect(agent.validation.customValidators.at(1)?.name).toBe(
					'no-empty-result-validator'
				);
				expect(agent.validation.maxAttempts).toBe(5);

				// Observability (all enabled)
				expect(agent.observability.trackCost).toBe(true);
				expect(agent.observability.trackLatency).toBe(true);
				expect(agent.observability.trackAttempts).toBe(true);
				expect(agent.observability.trackTokens).toBe(true);
			}
		});

		it('should maintain generic type parameters', () => {
			const result = defineAgent(VALID_MINIMAL_AGENT);

			expect(isOk(result)).toBe(true);

			if (isOk(result)) {
				// Type should be AgentDefinition<string, TestOutput>
				// If types are preserved correctly, this should compile without errors
				const agentName: string = result.data.name;
				const maxAttempts: number = result.data.validation.maxAttempts;

				expect(agentName).toBe('TestAgent');
				expect(maxAttempts).toBe(3);
			}
		});
	});

	describe('immutability', () => {
		it('should return frozen top-level object', () => {
			const result = defineAgent(VALID_MINIMAL_AGENT);

			expect(isOk(result)).toBe(true);

			if (isOk(result)) {
				expect(Object.isFrozen(result.data)).toBe(true);

				// Attempting to modify should throw in strict mode or fail silently
				expect(() => {
					// @ts-expect-error - Testing immutability at runtime
					result.data.name = 'ModifiedName';
				}).toThrow();
			}
		});

		it('should deeply freeze model config', () => {
			const result = defineAgent(VALID_MINIMAL_AGENT);

			expect(isOk(result)).toBe(true);

			if (isOk(result)) {
				expect(Object.isFrozen(result.data.model)).toBe(true);

				expect(() => {
					// Testing immutability at runtime
					result.data.model.temperature = 0.5;
				}).toThrow();
			}
		});

		it('should deeply freeze prompts object', () => {
			const result = defineAgent(VALID_MINIMAL_AGENT);

			expect(isOk(result)).toBe(true);

			if (isOk(result)) {
				expect(Object.isFrozen(result.data.prompts)).toBe(true);

				expect(() => {
					// Testing immutability at runtime
					result.data.prompts.system = async () => [{type: 'text', text: 'modified'}];
				}).toThrow();
			}
		});

		it('should deeply freeze validation config', () => {
			const result = defineAgent(VALID_MINIMAL_AGENT);

			expect(isOk(result)).toBe(true);

			if (isOk(result)) {
				expect(Object.isFrozen(result.data.validation)).toBe(true);

				expect(() => {
					// Testing immutability at runtime
					result.data.validation.maxAttempts = 10;
				}).toThrow();
			}
		});

		it('should deeply freeze observability config', () => {
			const result = defineAgent(VALID_MINIMAL_AGENT);

			expect(isOk(result)).toBe(true);

			if (isOk(result)) {
				expect(Object.isFrozen(result.data.observability)).toBe(true);

				expect(() => {
					// Testing immutability at runtime
					result.data.observability.trackCost = true;
				}).toThrow();
			}
		});

		it('should freeze customValidators array', () => {
			const result = defineAgent(VALID_COMPLETE_AGENT);

			expect(isOk(result)).toBe(true);

			if (isOk(result)) {
				expect(Object.isFrozen(result.data.validation.customValidators)).toBe(
					true
				);

				expect(() => {
					result.data.validation.customValidators.push({
						name: 'new-validator',
						description: 'new validator description',
						validate: async () => ok({result: ''}),
					});
				}).toThrow();
			}
		});

		it('should freeze each custom validator', () => {
			const result = defineAgent(VALID_COMPLETE_AGENT);

			expect(isOk(result)).toBe(true);

			if (isOk(result)) {
				const firstValidator = result.data.validation.customValidators.at(0);
				expect(firstValidator).toBeDefined();
				expect(Object.isFrozen(firstValidator)).toBe(true);

				expect(() => {
					// Testing immutability at runtime
					firstValidator!.name = 'modified-name';
				}).toThrow();

				const secondValidator = result.data.validation.customValidators.at(1);
				expect(secondValidator).toBeDefined();
				expect(Object.isFrozen(secondValidator)).toBe(true);
			}
		});
	});

	describe('validation errors', () => {
		it('should return error for empty name', () => {
			const result = defineAgent(INVALID_EMPTY_NAME);

			expect(isErr(result)).toBe(true);

			if (isErr(result)) {
				expect(result.error).toHaveLength(1);
				expect(result.error.at(0)?.code).toBe(AGENT_ERROR_CODES.EMPTY_NAME);
				expect(result.error.at(0)?.severity).toBe('error');
				expect(result.error.at(0)?.category).toBe('validation');
			}
		});

		it('should return error for whitespace-only name', () => {
			const result = defineAgent(INVALID_WHITESPACE_NAME);

			expect(isErr(result)).toBe(true);

			if (isErr(result)) {
				expect(result.error).toHaveLength(1);
				expect(result.error.at(0)?.code).toBe(AGENT_ERROR_CODES.EMPTY_NAME);
			}
		});

		it('should return error for empty description', () => {
			const result = defineAgent(INVALID_EMPTY_DESCRIPTION);

			expect(isErr(result)).toBe(true);

			if (isErr(result)) {
				expect(result.error).toHaveLength(1);
				expect(result.error.at(0)?.code).toBe(
					AGENT_ERROR_CODES.EMPTY_DESCRIPTION
				);
				expect(result.error.at(0)?.severity).toBe('error');
				expect(result.error.at(0)?.category).toBe('validation');
			}
		});

		it('should return error for whitespace-only description', () => {
			const result = defineAgent(INVALID_WHITESPACE_DESCRIPTION);

			expect(isErr(result)).toBe(true);

			if (isErr(result)) {
				expect(result.error).toHaveLength(1);
				expect(result.error.at(0)?.code).toBe(
					AGENT_ERROR_CODES.EMPTY_DESCRIPTION
				);
			}
		});

		it('should return error for empty model name', () => {
			const result = defineAgent(INVALID_EMPTY_MODEL_NAME);

			expect(isErr(result)).toBe(true);

			if (isErr(result)) {
				expect(result.error).toHaveLength(1);
				expect(result.error.at(0)?.code).toBe(
					AGENT_ERROR_CODES.EMPTY_MODEL_NAME
				);
				expect(result.error.at(0)?.path).toBe('$.model.name');
				expect(result.error.at(0)?.severity).toBe('error');
				expect(result.error.at(0)?.category).toBe('validation');
			}
		});

		it('should return error for whitespace-only model name', () => {
			const result = defineAgent(INVALID_WHITESPACE_MODEL_NAME);

			expect(isErr(result)).toBe(true);

			if (isErr(result)) {
				expect(result.error).toHaveLength(1);
				expect(result.error.at(0)?.code).toBe(
					AGENT_ERROR_CODES.EMPTY_MODEL_NAME
				);
			}
		});

		it('should return error for missing output schema', () => {
			const result = defineAgent(INVALID_MISSING_OUTPUT_SCHEMA);

			expect(isErr(result)).toBe(true);

			if (isErr(result)) {
				expect(result.error).toHaveLength(1);
				expect(result.error.at(0)?.code).toBe(
					AGENT_ERROR_CODES.MISSING_OUTPUT_SCHEMA
				);
				expect(result.error.at(0)?.path).toBe('$.validation.outputSchema');
				expect(result.error.at(0)?.severity).toBe('error');
				expect(result.error.at(0)?.category).toBe('validation');
			}
		});

		it('should return error for zero maxAttempts', () => {
			const result = defineAgent(INVALID_ZERO_MAX_ATTEMPTS);

			expect(isErr(result)).toBe(true);

			if (isErr(result)) {
				expect(result.error).toHaveLength(1);
				expect(result.error.at(0)?.code).toBe(
					AGENT_ERROR_CODES.INVALID_MAX_ATTEMPTS
				);
				expect(result.error.at(0)?.path).toBe('$.validation.maxAttempts');
				expect(result.error.at(0)?.severity).toBe('error');
				expect(result.error.at(0)?.category).toBe('validation');
			}
		});

		it('should return error for negative maxAttempts', () => {
			const result = defineAgent(INVALID_NEGATIVE_MAX_ATTEMPTS);

			expect(isErr(result)).toBe(true);

			if (isErr(result)) {
				expect(result.error).toHaveLength(1);
				expect(result.error.at(0)?.code).toBe(
					AGENT_ERROR_CODES.INVALID_MAX_ATTEMPTS
				);
			}
		});

		it('should collect and return all validation errors', () => {
			const result = defineAgent(INVALID_MULTIPLE_ERRORS);

			expect(isErr(result)).toBe(true);

			if (isErr(result)) {
				// Should have 4 errors: name, description, model name, max attempts
				expect(result.error).toHaveLength(4);

				const errorCodes = result.error.map((e) => e.code);

				expect(errorCodes).toContain(AGENT_ERROR_CODES.EMPTY_NAME);
				expect(errorCodes).toContain(AGENT_ERROR_CODES.EMPTY_DESCRIPTION);
				expect(errorCodes).toContain(AGENT_ERROR_CODES.EMPTY_MODEL_NAME);
				expect(errorCodes).toContain(AGENT_ERROR_CODES.INVALID_MAX_ATTEMPTS);

				// All should be validation errors
				expect(result.error.every((e) => e.category === 'validation')).toBe(
					true
				);
				expect(result.error.every((e) => e.severity === 'error')).toBe(true);
			}
		});
	});
});
