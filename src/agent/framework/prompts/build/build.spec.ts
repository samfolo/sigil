/**
 * Tests for prompt building utilities
 */

import {describe, expect, it} from 'vitest';

import {isErr, isOk, AGENT_ERROR_CODES} from '@sigil/src/common/errors';

import {buildSystemPrompt, buildUserPrompt, buildErrorPrompt} from './build';
import {
	WORKING_AGENT,
	SYSTEM_THROWS_AGENT,
	USER_THROWS_AGENT,
	ERROR_THROWS_AGENT,
	SYSTEM_REJECTS_AGENT,
	USER_REJECTS_AGENT,
	ERROR_REJECTS_AGENT,
	NON_ERROR_THROW_AGENT,
	USER_NON_ERROR_THROW_AGENT,
	ERROR_NON_ERROR_THROW_AGENT,
	FIRST_ATTEMPT_CONTEXT,
	SECOND_ATTEMPT_CONTEXT,
	FINAL_ATTEMPT_CONTEXT,
	TEST_INPUT,
	TEST_ERROR_MESSAGE,
} from './build.fixtures';

describe('buildSystemPrompt', () => {
	describe('successful generation', () => {
		it('should generate system prompt successfully', async () => {
			const result = await buildSystemPrompt(
				WORKING_AGENT,
				TEST_INPUT,
				FIRST_ATTEMPT_CONTEXT
			);

			expect(isOk(result)).toBe(true);

			if (isOk(result)) {
				expect(result.data).toContain('System prompt');
				expect(result.data).toContain(TEST_INPUT.query);
				expect(result.data).toContain('attempt 1/3');
			}
		});

		it('should pass execution state correctly', async () => {
			const result = await buildSystemPrompt(
				WORKING_AGENT,
				TEST_INPUT,
				SECOND_ATTEMPT_CONTEXT
			);

			expect(isOk(result)).toBe(true);

			if (isOk(result)) {
				expect(result.data).toContain('attempt 2/3');
			}
		});

		it('should handle final attempt state', async () => {
			const result = await buildSystemPrompt(
				WORKING_AGENT,
				TEST_INPUT,
				FINAL_ATTEMPT_CONTEXT
			);

			expect(isOk(result)).toBe(true);

			if (isOk(result)) {
				expect(result.data).toContain('attempt 3/3');
			}
		});
	});

	describe('error handling', () => {
		it('should handle synchronous throw', async () => {
			const result = await buildSystemPrompt(
				SYSTEM_THROWS_AGENT,
				TEST_INPUT,
				FIRST_ATTEMPT_CONTEXT
			);

			expect(isErr(result)).toBe(true);

			if (isErr(result)) {
				expect(result.error).toHaveLength(1);
				expect(result.error.at(0)?.code).toBe(
					AGENT_ERROR_CODES.PROMPT_GENERATION_FAILED
				);
				expect(result.error.at(0)?.severity).toBe('error');
				expect(result.error.at(0)?.category).toBe('execution');
				const firstError = result.error.at(0);
				if (firstError?.code === AGENT_ERROR_CODES.PROMPT_GENERATION_FAILED) {
					expect(firstError.context.promptType).toBe('system');
					expect(firstError.context.reason).toBe(
						'System prompt generation failed'
					);
					expect(firstError.context.attempt).toBe(1);
				}
			}
		});

		it('should handle asynchronous rejection', async () => {
			const result = await buildSystemPrompt(
				SYSTEM_REJECTS_AGENT,
				TEST_INPUT,
				SECOND_ATTEMPT_CONTEXT
			);

			expect(isErr(result)).toBe(true);

			if (isErr(result)) {
				expect(result.error).toHaveLength(1);
				expect(result.error.at(0)?.code).toBe(
					AGENT_ERROR_CODES.PROMPT_GENERATION_FAILED
				);
				const firstError = result.error.at(0);
				if (firstError?.code === AGENT_ERROR_CODES.PROMPT_GENERATION_FAILED) {
					expect(firstError.context.promptType).toBe('system');
					expect(firstError.context.reason).toBe(
						'System prompt async failure'
					);
					expect(firstError.context.attempt).toBe(2);
				}
			}
		});

		it('should handle non-Error throw', async () => {
			const result = await buildSystemPrompt(
				NON_ERROR_THROW_AGENT,
				TEST_INPUT,
				FIRST_ATTEMPT_CONTEXT
			);

			expect(isErr(result)).toBe(true);

			if (isErr(result)) {
				expect(result.error).toHaveLength(1);
				expect(result.error.at(0)?.code).toBe(
					AGENT_ERROR_CODES.PROMPT_GENERATION_FAILED
				);
				const firstError = result.error.at(0);
				if (firstError?.code === AGENT_ERROR_CODES.PROMPT_GENERATION_FAILED) {
					expect(firstError.context.reason).toBe(
						'String error instead of Error object'
					);
				}
			}
		});
	});
});

describe('buildUserPrompt', () => {
	describe('successful generation', () => {
		it('should generate user prompt successfully', async () => {
			const result = await buildUserPrompt(
				WORKING_AGENT,
				TEST_INPUT
			);

			expect(isOk(result)).toBe(true);

			if (isOk(result)) {
				expect(result.data).toContain('User prompt');
				expect(result.data).toContain(TEST_INPUT.query);
			}
		});
	});

	describe('error handling', () => {
		it('should handle synchronous throw', async () => {
			const result = await buildUserPrompt(
				USER_THROWS_AGENT,
				TEST_INPUT
			);

			expect(isErr(result)).toBe(true);

			if (isErr(result)) {
				expect(result.error).toHaveLength(1);
				expect(result.error.at(0)?.code).toBe(
					AGENT_ERROR_CODES.PROMPT_GENERATION_FAILED
				);
				expect(result.error.at(0)?.severity).toBe('error');
				expect(result.error.at(0)?.category).toBe('execution');
				const firstError = result.error.at(0);
				if (firstError?.code === AGENT_ERROR_CODES.PROMPT_GENERATION_FAILED) {
					expect(firstError.context.promptType).toBe('user');
					expect(firstError.context.reason).toBe(
						'User prompt generation failed'
					);
				}
			}
		});

		it('should handle asynchronous rejection', async () => {
			const result = await buildUserPrompt(
				USER_REJECTS_AGENT,
				TEST_INPUT
			);

			expect(isErr(result)).toBe(true);

			if (isErr(result)) {
				expect(result.error).toHaveLength(1);
				expect(result.error.at(0)?.code).toBe(
					AGENT_ERROR_CODES.PROMPT_GENERATION_FAILED
				);
				const firstError = result.error.at(0);
				if (firstError?.code === AGENT_ERROR_CODES.PROMPT_GENERATION_FAILED) {
					expect(firstError.context.promptType).toBe('user');
					expect(firstError.context.reason).toBe(
						'User prompt async failure'
					);
				}
			}
		});

		it('should handle non-Error throw', async () => {
			const result = await buildUserPrompt(
				USER_NON_ERROR_THROW_AGENT,
				TEST_INPUT
			);

			expect(isErr(result)).toBe(true);

			if (isErr(result)) {
				expect(result.error).toHaveLength(1);
				expect(result.error.at(0)?.code).toBe(
					AGENT_ERROR_CODES.PROMPT_GENERATION_FAILED
				);
				const firstError = result.error.at(0);
				if (firstError?.code === AGENT_ERROR_CODES.PROMPT_GENERATION_FAILED) {
					expect(firstError.context.reason).toBe(
						'String error in user prompt'
					);
				}
			}
		});
	});
});

describe('buildErrorPrompt', () => {
	describe('successful generation', () => {
		it('should generate error prompt successfully', async () => {
			const result = await buildErrorPrompt(
				WORKING_AGENT,
				TEST_ERROR_MESSAGE,
				FIRST_ATTEMPT_CONTEXT
			);

			expect(isOk(result)).toBe(true);

			if (isOk(result)) {
				expect(result.data).toContain('Attempt 1/3 failed');
				expect(result.data).toContain(TEST_ERROR_MESSAGE);
				expect(result.data).toContain('Please fix these issues');
			}
		});

		it('should pass execution state correctly', async () => {
			const result = await buildErrorPrompt(
				WORKING_AGENT,
				TEST_ERROR_MESSAGE,
				SECOND_ATTEMPT_CONTEXT
			);

			expect(isOk(result)).toBe(true);

			if (isOk(result)) {
				expect(result.data).toContain('Attempt 2/3 failed');
			}
		});

		it('should handle final attempt state', async () => {
			const result = await buildErrorPrompt(
				WORKING_AGENT,
				TEST_ERROR_MESSAGE,
				FINAL_ATTEMPT_CONTEXT
			);

			expect(isOk(result)).toBe(true);

			if (isOk(result)) {
				expect(result.data).toContain('Attempt 3/3 failed');
			}
		});

		it('should include formatted error message in prompt', async () => {
			const customError = 'Custom validation error: field is required';
			const result = await buildErrorPrompt(
				WORKING_AGENT,
				customError,
				FIRST_ATTEMPT_CONTEXT
			);

			expect(isOk(result)).toBe(true);

			if (isOk(result)) {
				expect(result.data).toContain(customError);
			}
		});
	});

	describe('error handling', () => {
		it('should handle synchronous throw', async () => {
			const result = await buildErrorPrompt(
				ERROR_THROWS_AGENT,
				TEST_ERROR_MESSAGE,
				FIRST_ATTEMPT_CONTEXT
			);

			expect(isErr(result)).toBe(true);

			if (isErr(result)) {
				expect(result.error).toHaveLength(1);
				expect(result.error.at(0)?.code).toBe(
					AGENT_ERROR_CODES.PROMPT_GENERATION_FAILED
				);
				expect(result.error.at(0)?.severity).toBe('error');
				expect(result.error.at(0)?.category).toBe('execution');
				const firstError = result.error.at(0);
				if (firstError?.code === AGENT_ERROR_CODES.PROMPT_GENERATION_FAILED) {
					expect(firstError.context.promptType).toBe('error');
					expect(firstError.context.reason).toBe(
						'Error prompt generation failed'
					);
					expect(firstError.context.attempt).toBe(1);
				}
			}
		});

		it('should handle asynchronous rejection', async () => {
			const result = await buildErrorPrompt(
				ERROR_REJECTS_AGENT,
				TEST_ERROR_MESSAGE,
				SECOND_ATTEMPT_CONTEXT
			);

			expect(isErr(result)).toBe(true);

			if (isErr(result)) {
				expect(result.error).toHaveLength(1);
				expect(result.error.at(0)?.code).toBe(
					AGENT_ERROR_CODES.PROMPT_GENERATION_FAILED
				);
				const firstError = result.error.at(0);
				if (firstError?.code === AGENT_ERROR_CODES.PROMPT_GENERATION_FAILED) {
					expect(firstError.context.promptType).toBe('error');
					expect(firstError.context.reason).toBe(
						'Error prompt async failure'
					);
					expect(firstError.context.attempt).toBe(2);
				}
			}
		});

		it('should handle non-Error throw', async () => {
			const result = await buildErrorPrompt(
				ERROR_NON_ERROR_THROW_AGENT,
				TEST_ERROR_MESSAGE,
				FIRST_ATTEMPT_CONTEXT
			);

			expect(isErr(result)).toBe(true);

			if (isErr(result)) {
				expect(result.error).toHaveLength(1);
				expect(result.error.at(0)?.code).toBe(
					AGENT_ERROR_CODES.PROMPT_GENERATION_FAILED
				);
				const firstError = result.error.at(0);
				if (firstError?.code === AGENT_ERROR_CODES.PROMPT_GENERATION_FAILED) {
					expect(firstError.context.reason).toBe(
						'String error in error prompt'
					);
				}
			}
		});
	});
});
