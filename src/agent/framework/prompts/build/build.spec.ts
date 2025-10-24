/**
 * Tests for prompt building utilities
 */

import {describe, expect, it} from 'vitest';

import {isErr, isOk, AGENT_ERROR_CODES} from '@sigil/src/common/errors';

import {buildSystemPrompt, buildUserPrompt, buildErrorPrompt, buildAllPrompts} from './build';
import {
	WORKING_AGENT,
	SYSTEM_THROWS_AGENT,
	USER_THROWS_AGENT,
	ERROR_THROWS_AGENT,
	SYSTEM_REJECTS_AGENT,
	USER_REJECTS_AGENT,
	ERROR_REJECTS_AGENT,
	NON_ERROR_THROW_AGENT,
	FIRST_ATTEMPT_STATE,
	SECOND_ATTEMPT_STATE,
	FINAL_ATTEMPT_STATE,
	TEST_INPUT,
	TEST_ERROR_MESSAGE,
} from './build.fixtures';

describe('buildSystemPrompt', () => {
	describe('successful generation', () => {
		it('should generate system prompt successfully', async () => {
			const result = await buildSystemPrompt(
				WORKING_AGENT,
				TEST_INPUT,
				FIRST_ATTEMPT_STATE
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
				SECOND_ATTEMPT_STATE
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
				FINAL_ATTEMPT_STATE
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
				FIRST_ATTEMPT_STATE
			);

			expect(isErr(result)).toBe(true);

			if (isErr(result)) {
				expect(result.error).toHaveLength(1);
				expect(result.error.at(0)?.code).toBe(
					AGENT_ERROR_CODES.PROMPT_GENERATION_FAILED
				);
				expect(result.error.at(0)?.severity).toBe('error');
				expect(result.error.at(0)?.category).toBe('execution');
				expect(result.error.at(0)?.context.promptType).toBe('system');
				expect(result.error.at(0)?.context.reason).toBe(
					'System prompt generation failed'
				);
				expect(result.error.at(0)?.context.attempt).toBe(1);
			}
		});

		it('should handle asynchronous rejection', async () => {
			const result = await buildSystemPrompt(
				SYSTEM_REJECTS_AGENT,
				TEST_INPUT,
				SECOND_ATTEMPT_STATE
			);

			expect(isErr(result)).toBe(true);

			if (isErr(result)) {
				expect(result.error).toHaveLength(1);
				expect(result.error.at(0)?.code).toBe(
					AGENT_ERROR_CODES.PROMPT_GENERATION_FAILED
				);
				expect(result.error.at(0)?.context.promptType).toBe('system');
				expect(result.error.at(0)?.context.reason).toBe(
					'System prompt async failure'
				);
				expect(result.error.at(0)?.context.attempt).toBe(2);
			}
		});

		it('should handle non-Error throw', async () => {
			const result = await buildSystemPrompt(
				NON_ERROR_THROW_AGENT,
				TEST_INPUT,
				FIRST_ATTEMPT_STATE
			);

			expect(isErr(result)).toBe(true);

			if (isErr(result)) {
				expect(result.error).toHaveLength(1);
				expect(result.error.at(0)?.code).toBe(
					AGENT_ERROR_CODES.PROMPT_GENERATION_FAILED
				);
				expect(result.error.at(0)?.context.reason).toBe(
					'String error instead of Error object'
				);
			}
		});
	});
});

describe('buildUserPrompt', () => {
	describe('successful generation', () => {
		it('should generate user prompt successfully', async () => {
			const result = await buildUserPrompt(
				WORKING_AGENT,
				TEST_INPUT,
				FIRST_ATTEMPT_STATE
			);

			expect(isOk(result)).toBe(true);

			if (isOk(result)) {
				expect(result.data).toContain('User prompt');
				expect(result.data).toContain(TEST_INPUT.query);
				expect(result.data).toContain('attempt 1');
			}
		});

		it('should pass execution state correctly', async () => {
			const result = await buildUserPrompt(
				WORKING_AGENT,
				TEST_INPUT,
				SECOND_ATTEMPT_STATE
			);

			expect(isOk(result)).toBe(true);

			if (isOk(result)) {
				expect(result.data).toContain('attempt 2');
			}
		});

		it('should handle final attempt state', async () => {
			const result = await buildUserPrompt(
				WORKING_AGENT,
				TEST_INPUT,
				FINAL_ATTEMPT_STATE
			);

			expect(isOk(result)).toBe(true);

			if (isOk(result)) {
				expect(result.data).toContain('attempt 3');
			}
		});
	});

	describe('error handling', () => {
		it('should handle synchronous throw', async () => {
			const result = await buildUserPrompt(
				USER_THROWS_AGENT,
				TEST_INPUT,
				FIRST_ATTEMPT_STATE
			);

			expect(isErr(result)).toBe(true);

			if (isErr(result)) {
				expect(result.error).toHaveLength(1);
				expect(result.error.at(0)?.code).toBe(
					AGENT_ERROR_CODES.PROMPT_GENERATION_FAILED
				);
				expect(result.error.at(0)?.severity).toBe('error');
				expect(result.error.at(0)?.category).toBe('execution');
				expect(result.error.at(0)?.context.promptType).toBe('user');
				expect(result.error.at(0)?.context.reason).toBe(
					'User prompt generation failed'
				);
				expect(result.error.at(0)?.context.attempt).toBe(1);
			}
		});

		it('should handle asynchronous rejection', async () => {
			const result = await buildUserPrompt(
				USER_REJECTS_AGENT,
				TEST_INPUT,
				SECOND_ATTEMPT_STATE
			);

			expect(isErr(result)).toBe(true);

			if (isErr(result)) {
				expect(result.error).toHaveLength(1);
				expect(result.error.at(0)?.code).toBe(
					AGENT_ERROR_CODES.PROMPT_GENERATION_FAILED
				);
				expect(result.error.at(0)?.context.promptType).toBe('user');
				expect(result.error.at(0)?.context.reason).toBe(
					'User prompt async failure'
				);
				expect(result.error.at(0)?.context.attempt).toBe(2);
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
				FIRST_ATTEMPT_STATE
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
				SECOND_ATTEMPT_STATE
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
				FINAL_ATTEMPT_STATE
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
				FIRST_ATTEMPT_STATE
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
				FIRST_ATTEMPT_STATE
			);

			expect(isErr(result)).toBe(true);

			if (isErr(result)) {
				expect(result.error).toHaveLength(1);
				expect(result.error.at(0)?.code).toBe(
					AGENT_ERROR_CODES.PROMPT_GENERATION_FAILED
				);
				expect(result.error.at(0)?.severity).toBe('error');
				expect(result.error.at(0)?.category).toBe('execution');
				expect(result.error.at(0)?.context.promptType).toBe('error');
				expect(result.error.at(0)?.context.reason).toBe(
					'Error prompt generation failed'
				);
				expect(result.error.at(0)?.context.attempt).toBe(1);
			}
		});

		it('should handle asynchronous rejection', async () => {
			const result = await buildErrorPrompt(
				ERROR_REJECTS_AGENT,
				TEST_ERROR_MESSAGE,
				SECOND_ATTEMPT_STATE
			);

			expect(isErr(result)).toBe(true);

			if (isErr(result)) {
				expect(result.error).toHaveLength(1);
				expect(result.error.at(0)?.code).toBe(
					AGENT_ERROR_CODES.PROMPT_GENERATION_FAILED
				);
				expect(result.error.at(0)?.context.promptType).toBe('error');
				expect(result.error.at(0)?.context.reason).toBe(
					'Error prompt async failure'
				);
				expect(result.error.at(0)?.context.attempt).toBe(2);
			}
		});
	});
});

describe('buildAllPrompts', () => {
	describe('successful generation', () => {
		it('should build system and user prompts on first attempt without error prompt', async () => {
			const result = await buildAllPrompts(
				WORKING_AGENT,
				TEST_INPUT,
				FIRST_ATTEMPT_STATE
			);

			expect(isOk(result)).toBe(true);

			if (isOk(result)) {
				expect(result.data.system).toContain('System prompt');
				expect(result.data.system).toContain(TEST_INPUT.query);
				expect(result.data.system).toContain('attempt 1/3');

				expect(result.data.user).toContain('User prompt');
				expect(result.data.user).toContain(TEST_INPUT.query);
				expect(result.data.user).toContain('attempt 1');

				expect(result.data.error).toBeUndefined();
			}
		});

		it('should build all three prompts on retry attempt with errors', async () => {
			const result = await buildAllPrompts(
				WORKING_AGENT,
				TEST_INPUT,
				SECOND_ATTEMPT_STATE,
				TEST_ERROR_MESSAGE
			);

			expect(isOk(result)).toBe(true);

			if (isOk(result)) {
				expect(result.data.system).toContain('System prompt');
				expect(result.data.system).toContain('attempt 2/3');

				expect(result.data.user).toContain('User prompt');
				expect(result.data.user).toContain('attempt 2');

				expect(result.data.error).toBeDefined();
				expect(result.data.error).toContain('Attempt 2/3 failed');
				expect(result.data.error).toContain(TEST_ERROR_MESSAGE);
				expect(result.data.error).toContain('Please fix these issues');
			}
		});

		it('should not build error prompt on first attempt even if error message provided', async () => {
			const result = await buildAllPrompts(
				WORKING_AGENT,
				TEST_INPUT,
				FIRST_ATTEMPT_STATE,
				TEST_ERROR_MESSAGE
			);

			expect(isOk(result)).toBe(true);

			if (isOk(result)) {
				expect(result.data.system).toBeDefined();
				expect(result.data.user).toBeDefined();
				expect(result.data.error).toBeUndefined();
			}
		});

		it('should not build error prompt on retry attempt if no error message provided', async () => {
			const result = await buildAllPrompts(
				WORKING_AGENT,
				TEST_INPUT,
				SECOND_ATTEMPT_STATE
			);

			expect(isOk(result)).toBe(true);

			if (isOk(result)) {
				expect(result.data.system).toBeDefined();
				expect(result.data.user).toBeDefined();
				expect(result.data.error).toBeUndefined();
			}
		});

		it('should handle final attempt with errors', async () => {
			const result = await buildAllPrompts(
				WORKING_AGENT,
				TEST_INPUT,
				FINAL_ATTEMPT_STATE,
				TEST_ERROR_MESSAGE
			);

			expect(isOk(result)).toBe(true);

			if (isOk(result)) {
				expect(result.data.system).toContain('attempt 3/3');
				expect(result.data.user).toContain('attempt 3');
				expect(result.data.error).toContain('Attempt 3/3 failed');
			}
		});
	});

	describe('error handling - fail fast behaviour', () => {
		it('should fail immediately if system prompt generation fails', async () => {
			const result = await buildAllPrompts(
				SYSTEM_THROWS_AGENT,
				TEST_INPUT,
				FIRST_ATTEMPT_STATE
			);

			expect(isErr(result)).toBe(true);

			if (isErr(result)) {
				expect(result.error).toHaveLength(1);
				expect(result.error.at(0)?.code).toBe(
					AGENT_ERROR_CODES.PROMPT_GENERATION_FAILED
				);
				expect(result.error.at(0)?.context.promptType).toBe('system');
				expect(result.error.at(0)?.context.reason).toBe(
					'System prompt generation failed'
				);
			}
		});

		it('should fail immediately if user prompt generation fails', async () => {
			const result = await buildAllPrompts(
				USER_THROWS_AGENT,
				TEST_INPUT,
				FIRST_ATTEMPT_STATE
			);

			expect(isErr(result)).toBe(true);

			if (isErr(result)) {
				expect(result.error).toHaveLength(1);
				expect(result.error.at(0)?.code).toBe(
					AGENT_ERROR_CODES.PROMPT_GENERATION_FAILED
				);
				expect(result.error.at(0)?.context.promptType).toBe('user');
				expect(result.error.at(0)?.context.reason).toBe(
					'User prompt generation failed'
				);
			}
		});

		it('should fail immediately if error prompt generation fails on retry', async () => {
			const result = await buildAllPrompts(
				ERROR_THROWS_AGENT,
				TEST_INPUT,
				SECOND_ATTEMPT_STATE,
				TEST_ERROR_MESSAGE
			);

			expect(isErr(result)).toBe(true);

			if (isErr(result)) {
				expect(result.error).toHaveLength(1);
				expect(result.error.at(0)?.code).toBe(
					AGENT_ERROR_CODES.PROMPT_GENERATION_FAILED
				);
				expect(result.error.at(0)?.context.promptType).toBe('error');
				expect(result.error.at(0)?.context.reason).toBe(
					'Error prompt generation failed'
				);
			}
		});

		it('should handle async rejection in system prompt', async () => {
			const result = await buildAllPrompts(
				SYSTEM_REJECTS_AGENT,
				TEST_INPUT,
				SECOND_ATTEMPT_STATE,
				TEST_ERROR_MESSAGE
			);

			expect(isErr(result)).toBe(true);

			if (isErr(result)) {
				expect(result.error).toHaveLength(1);
				expect(result.error.at(0)?.code).toBe(
					AGENT_ERROR_CODES.PROMPT_GENERATION_FAILED
				);
				expect(result.error.at(0)?.context.promptType).toBe('system');
				expect(result.error.at(0)?.context.reason).toBe(
					'System prompt async failure'
				);
			}
		});

		it('should handle async rejection in user prompt', async () => {
			const result = await buildAllPrompts(
				USER_REJECTS_AGENT,
				TEST_INPUT,
				SECOND_ATTEMPT_STATE,
				TEST_ERROR_MESSAGE
			);

			expect(isErr(result)).toBe(true);

			if (isErr(result)) {
				expect(result.error).toHaveLength(1);
				expect(result.error.at(0)?.code).toBe(
					AGENT_ERROR_CODES.PROMPT_GENERATION_FAILED
				);
				expect(result.error.at(0)?.context.promptType).toBe('user');
				expect(result.error.at(0)?.context.reason).toBe(
					'User prompt async failure'
				);
			}
		});

		it('should handle async rejection in error prompt', async () => {
			const result = await buildAllPrompts(
				ERROR_REJECTS_AGENT,
				TEST_INPUT,
				SECOND_ATTEMPT_STATE,
				TEST_ERROR_MESSAGE
			);

			expect(isErr(result)).toBe(true);

			if (isErr(result)) {
				expect(result.error).toHaveLength(1);
				expect(result.error.at(0)?.code).toBe(
					AGENT_ERROR_CODES.PROMPT_GENERATION_FAILED
				);
				expect(result.error.at(0)?.context.promptType).toBe('error');
				expect(result.error.at(0)?.context.reason).toBe(
					'Error prompt async failure'
				);
			}
		});
	});
});
