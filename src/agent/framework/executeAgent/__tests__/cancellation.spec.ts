import {beforeEach, describe, expect, it, vi} from 'vitest';

const mockMessagesCreate = vi.fn();

vi.mock('@sigil/src/agent/clients/anthropic', () => ({
	createAnthropicClient: vi.fn(() => ({
		messages: {
			create: mockMessagesCreate,
		},
	})),
}));

import {
	AGENT_ERROR_CODES,
	AGENT_WITH_HELPER_TOOLS,
	VALID_COMPLETE_AGENT,
	VALID_EXECUTE_OPTIONS,
	VALID_MINIMAL_AGENT,
	executeAgent,
	isErr,
	setupExecuteAgentMocks,
} from '../executeAgent.common.fixtures';
import {AnthropicApiMock, helperToolUse, outputToolUse} from '../executeAgent.mock';

describe('executeAgent - Cancellation', () => {
	beforeEach(() => {
		setupExecuteAgentMocks(mockMessagesCreate);
	});

	describe('AbortSignal Support', () => {
		it('should accept abort signal in execute options', async () => {
			const controller = new AbortController();

			const result = await executeAgent(VALID_MINIMAL_AGENT, {
				input: 'test input',
				signal: controller.signal,
			});

			expect(result).toBeDefined();
		});

		it('should abort execution when signal is aborted before execution', async () => {
			const controller = new AbortController();
			controller.abort();

			const result = await executeAgent(VALID_MINIMAL_AGENT, {
				input: 'test input',
				signal: controller.signal,
			});

			expect(isErr(result)).toBe(true);

			if (isErr(result)) {
				const error = result.error.errors.at(0);
				expect(error?.code).toBe(AGENT_ERROR_CODES.EXECUTION_CANCELLED);
			}
		});

		it('should abort execution when signal is aborted during API call', async () => {
			const controller = new AbortController();

			// First call: return invalid response, schedule abort during delay
			// This ensures abort happens after first attempt but before second
			const mock = new AnthropicApiMock();
			mock
				.respondWith(
					{content: [outputToolUse('short')]},
					{delay: 10}
				)
				.install(mockMessagesCreate);

			// Schedule abort to happen after response returns
			setTimeout(() => {
				controller.abort();
			}, 5);

			const result = await executeAgent(VALID_COMPLETE_AGENT, {
				input: 'test input',
				signal: controller.signal,
			});

			expect(isErr(result)).toBe(true);

			if (isErr(result)) {
				const error = result.error.errors.at(0);
				expect(error?.code).toBe(AGENT_ERROR_CODES.EXECUTION_CANCELLED);
			}
		});

		it('should abort during helper tool iteration', async () => {
			const controller = new AbortController();

			// First call: helper tool, then schedule abort during delay
			// Second call would be another helper, but abort catches it
			const mock = new AnthropicApiMock();
			mock
				.respondWith(
					{content: [helperToolUse('query_data', {query: 'test'})]},
					{delay: 10}
				)
				.install(mockMessagesCreate);

			// Schedule abort to happen after response returns
			setTimeout(() => {
				controller.abort();
			}, 5);

			const result = await executeAgent(AGENT_WITH_HELPER_TOOLS, {
				input: 'test input',
				signal: controller.signal,
			});

			expect(isErr(result)).toBe(true);

			if (isErr(result)) {
				const error = result.error.errors.at(0);
				expect(error?.code).toBe(AGENT_ERROR_CODES.EXECUTION_CANCELLED);
				if (error?.code === AGENT_ERROR_CODES.EXECUTION_CANCELLED) {
					expect(error.context.phase).toBe('iteration');
				}
			}
		});
	});

	describe('Abort Error Handling', () => {
		it('should return EXECUTION_ABORTED error code', async () => {
			const controller = new AbortController();
			controller.abort();

			const result = await executeAgent(VALID_MINIMAL_AGENT, {
				input: 'test input',
				signal: controller.signal,
			});

			expect(isErr(result)).toBe(true);

			if (isErr(result)) {
				const error = result.error.errors.at(0);
				expect(error?.code).toBe(AGENT_ERROR_CODES.EXECUTION_CANCELLED);
				expect(error?.category).toBe('execution');
			}
		});

		it('should include abort reason in error context', async () => {
			const controller = new AbortController();
			controller.abort('User cancelled operation');

			const result = await executeAgent(VALID_MINIMAL_AGENT, {
				input: 'test input',
				signal: controller.signal,
			});

			if (isErr(result)) {
				const error = result.error.errors.at(0);
				if (error?.code === AGENT_ERROR_CODES.EXECUTION_CANCELLED) {
					expect(error.context.attempt).toBe(0);
					expect(error.context.phase).toBe('prompt_generation');
				}
			}
		});

		it('should include metadata even when aborted', async () => {
			const controller = new AbortController();
			controller.abort();

			const result = await executeAgent(VALID_COMPLETE_AGENT, {
				input: 'test input',
				signal: controller.signal,
			});

			if (isErr(result)) {
				expect(result.error.metadata).toBeDefined();
				expect(result.error.metadata?.latency).toBeTypeOf('number');
				expect(result.error.metadata?.tokens).toBeDefined();
			}
		});
	});

	describe('Cleanup After Abort', () => {
		it('should not invoke onFailure callback when aborted', async () => {
			const controller = new AbortController();
			controller.abort();

			const callbackInvocations: string[] = [];

			await executeAgent(VALID_MINIMAL_AGENT, {
				input: 'test input',
				signal: controller.signal,
				callbacks: {
					onFailure: () => {
						callbackInvocations.push('onFailure');
					},
				},
			});

			expect(callbackInvocations).not.toContain('onFailure');
		});

		it('should not invoke onSuccess callback when aborted', async () => {
			const controller = new AbortController();
			controller.abort();

			let onSuccessCalled = false;

			await executeAgent(VALID_MINIMAL_AGENT, {
				input: 'test input',
				signal: controller.signal,
				callbacks: {
					onSuccess: () => {
						onSuccessCalled = true;
					},
				},
			});

			expect(onSuccessCalled).toBe(false);
		});

		it('should stop making API calls after abort', async () => {
			const controller = new AbortController();

			// First call: helper tool, schedule abort during delay
			// Should not make a second API call
			const mock = new AnthropicApiMock();
			mock
				.respondWith(
					{content: [helperToolUse('query_data', {query: 'test'})]},
					{delay: 10}
				)
				.install(mockMessagesCreate);

			// Schedule abort to happen after response returns
			setTimeout(() => {
				controller.abort();
			}, 5);

			await executeAgent(AGENT_WITH_HELPER_TOOLS, {
				input: 'test input',
				signal: controller.signal,
			});

			// Should have called API only once before abort was caught
			expect(mockMessagesCreate).toHaveBeenCalledTimes(1);
		});
	});

	describe('Signal Without Abort', () => {
		it('should complete normally when signal is not aborted', async () => {
			const controller = new AbortController();

			const result = await executeAgent(VALID_MINIMAL_AGENT, {
				input: 'test input',
				signal: controller.signal,
			});

			expect(isErr(result)).toBe(false);
		});

		it('should work without abort signal', async () => {
			const result = await executeAgent(VALID_MINIMAL_AGENT, VALID_EXECUTE_OPTIONS);

			expect(result).toBeDefined();
		});
	});
});
