import {describe, expect, it, beforeEach, vi} from 'vitest';

const mockMessagesCreate = vi.fn();

vi.mock('@sigil/src/agent/clients/anthropic', () => ({
	createAnthropicClient: vi.fn(() => ({
		messages: {
			create: mockMessagesCreate,
		},
	})),
}));

import {
	executeAgent,
	setupExecuteAgentMocks,
	VALID_COMPLETE_AGENT,
	AGENT_WITH_HELPER_TOOLS,
	AGENT_WITH_REFLECTION,
	VALID_EXECUTE_OPTIONS,
	createMockApiCalls,
	createOutputThenSubmitResponse,
	isOk,
	isErr,
} from '../executeAgent.common.fixtures';

describe('executeAgent - Observability', () => {
	beforeEach(() => {
		setupExecuteAgentMocks(mockMessagesCreate);
	});

	describe('Metadata Structure', () => {
		it('should populate metadata on success', async () => {
			const result = await executeAgent(
				VALID_COMPLETE_AGENT,
				VALID_EXECUTE_OPTIONS
			);

			expect(isOk(result)).toBe(true);

			if (isOk(result)) {
				expect(result.data.metadata).toBeDefined();
			}
		});

		it('should populate metadata on failure', async () => {
			mockMessagesCreate.mockRejectedValueOnce(new Error('API error'));

			const result = await executeAgent(
				VALID_COMPLETE_AGENT,
				VALID_EXECUTE_OPTIONS
			);

			expect(isErr(result)).toBe(true);

			if (isErr(result)) {
				expect(result.error.metadata).toBeDefined();
			}
		});

		it('should include latency in metadata', async () => {
			const result = await executeAgent(
				VALID_COMPLETE_AGENT,
				VALID_EXECUTE_OPTIONS
			);

			if (isOk(result)) {
				expect(result.data.metadata?.latency).toBeDefined();
				expect(typeof result.data.metadata?.latency).toBe('number');
				expect(result.data.metadata?.latency).toBeGreaterThanOrEqual(0);
			}
		});

		it('should include tokens in metadata', async () => {
			const result = await executeAgent(
				VALID_COMPLETE_AGENT,
				VALID_EXECUTE_OPTIONS
			);

			if (isOk(result)) {
				expect(result.data.metadata?.tokens).toBeDefined();
				expect(result.data.metadata?.tokens?.input).toBeDefined();
				expect(result.data.metadata?.tokens?.output).toBeDefined();
			}
		});
	});

	describe('Token Tracking', () => {
		it('should track input tokens from single API call', async () => {
			createMockApiCalls(mockMessagesCreate, [
				{type: 'success', inputTokens: 150, outputTokens: 75},
			]);

			const result = await executeAgent(
				VALID_COMPLETE_AGENT,
				VALID_EXECUTE_OPTIONS
			);

			if (isOk(result)) {
				expect(result.data.metadata?.tokens?.input).toBe(150);
			}
		});

		it('should track output tokens from single API call', async () => {
			createMockApiCalls(mockMessagesCreate, [
				{type: 'success', inputTokens: 150, outputTokens: 75},
			]);

			const result = await executeAgent(
				VALID_COMPLETE_AGENT,
				VALID_EXECUTE_OPTIONS
			);

			if (isOk(result)) {
				expect(result.data.metadata?.tokens?.output).toBe(75);
			}
		});

		it('should accumulate tokens across multiple attempts', async () => {
			createMockApiCalls(mockMessagesCreate, [
				{type: 'invalid', inputTokens: 100, outputTokens: 50},
				{type: 'invalid', inputTokens: 120, outputTokens: 60},
				{type: 'success', result: 'valid result that is long enough', inputTokens: 150, outputTokens: 75},
			]);

			const result = await executeAgent(
				VALID_COMPLETE_AGENT,
				VALID_EXECUTE_OPTIONS
			);

			if (isOk(result)) {
				expect(result.data.metadata?.tokens?.input).toBe(370);
				expect(result.data.metadata?.tokens?.output).toBe(185);
			}
		});

		it('should accumulate tokens across iterations', async () => {
			createMockApiCalls(mockMessagesCreate, [
				{type: 'helper', inputTokens: 100, outputTokens: 50},
				{type: 'helper', inputTokens: 120, outputTokens: 60},
				{type: 'success', inputTokens: 150, outputTokens: 75},
			]);

			const result = await executeAgent(
				AGENT_WITH_HELPER_TOOLS,
				VALID_EXECUTE_OPTIONS
			);

			if (isOk(result)) {
				expect(result.data.metadata?.tokens?.input).toBe(370);
				expect(result.data.metadata?.tokens?.output).toBe(185);
			}
		});

		it('should accumulate tokens in reflection mode', async () => {
			createMockApiCalls(mockMessagesCreate, [
				{type: 'success', result: 'draft 1', inputTokens: 100, outputTokens: 50},
				{type: 'success', result: 'draft 2', inputTokens: 150, outputTokens: 75},
				{type: 'custom', response: createOutputThenSubmitResponse('final draft', 200, 100)},
			]);

			const result = await executeAgent(
				AGENT_WITH_REFLECTION,
				VALID_EXECUTE_OPTIONS
			);

			if (isOk(result)) {
				expect(result.data.metadata?.tokens?.input).toBe(450);
				expect(result.data.metadata?.tokens?.output).toBe(225);
			}
		});
	});

	describe('Latency Tracking', () => {
		it('should track latency for successful execution', async () => {
			const result = await executeAgent(
				VALID_COMPLETE_AGENT,
				VALID_EXECUTE_OPTIONS
			);

			if (isOk(result)) {
				expect(result.data.metadata?.latency).toBeTypeOf('number');
				expect(result.data.metadata?.latency).toBeGreaterThan(0);
			}
		});

		it('should track latency for failed execution', async () => {
			mockMessagesCreate.mockRejectedValueOnce(new Error('API error'));

			const result = await executeAgent(
				VALID_COMPLETE_AGENT,
				VALID_EXECUTE_OPTIONS
			);

			if (isErr(result)) {
				expect(result.error.metadata?.latency).toBeTypeOf('number');
				expect(result.error.metadata?.latency).toBeGreaterThan(0);
			}
		});

		it('should include time for multiple attempts in latency', async () => {
			createMockApiCalls(mockMessagesCreate, [
				{type: 'invalid'},
				{type: 'invalid'},
				{type: 'success', result: 'valid result that is long enough'},
			]);

			const result = await executeAgent(
				VALID_COMPLETE_AGENT,
				VALID_EXECUTE_OPTIONS
			);

			if (isOk(result)) {
				expect(result.data.metadata?.latency).toBeGreaterThan(0);
			}
		});

		it('should include time for multiple iterations in latency', async () => {
			createMockApiCalls(mockMessagesCreate, [
				{type: 'helper'},
				{type: 'helper'},
				{type: 'success'},
			]);

			const result = await executeAgent(
				AGENT_WITH_HELPER_TOOLS,
				VALID_EXECUTE_OPTIONS
			);

			if (isOk(result)) {
				expect(result.data.metadata?.latency).toBeGreaterThan(0);
			}
		});
	});

	describe('Callback Errors', () => {
		it('should collect callback errors in metadata', async () => {
			const result = await executeAgent(VALID_COMPLETE_AGENT, {
				input: 'test input',
				callbacks: {
					onAttemptStart: () => {
						throw new Error('Callback error 1');
					},
					onValidationLayerStart: () => {
						throw new Error('Callback error 2');
					},
				},
			});

			if (isOk(result)) {
				expect(result.data.metadata?.callbackErrors).toBeDefined();
				// onAttemptStart: 1 error
				// onValidationLayerStart: 3 errors (Zod + 2 custom validators in VALID_COMPLETE_AGENT)
				expect(result.data.metadata?.callbackErrors?.length).toBe(4);
			}
		});

		it('should include error messages in callback errors', async () => {
			const result = await executeAgent(VALID_COMPLETE_AGENT, {
				input: 'test input',
				callbacks: {
					onAttemptStart: () => {
						throw new Error('Test error message');
					},
				},
			});

			if (isOk(result)) {
				const callbackErrors = result.data.metadata?.callbackErrors;
				expect(callbackErrors?.at(0)?.message).toContain('Test error message');
			}
		});

		it('should not fail execution due to callback errors', async () => {
			const result = await executeAgent(VALID_COMPLETE_AGENT, {
				input: 'test input',
				callbacks: {
					onAttemptStart: () => {
						throw new Error('Callback error');
					},
					onValidationLayerStart: () => {
						throw new Error('Another error');
					},
					onValidationLayerComplete: () => {
						throw new Error('Yet another error');
					},
				},
			});

			expect(isOk(result)).toBe(true);
		});
	});

	describe('Metadata Consistency', () => {
		it('should always include metadata even with zero tokens', async () => {
			createMockApiCalls(mockMessagesCreate, [
				{type: 'success', inputTokens: 0, outputTokens: 0},
			]);

			const result = await executeAgent(
				VALID_COMPLETE_AGENT,
				VALID_EXECUTE_OPTIONS
			);

			if (isOk(result)) {
				expect(result.data.metadata).toBeDefined();
				expect(result.data.metadata?.tokens?.input).toBe(0);
				expect(result.data.metadata?.tokens?.output).toBe(0);
			}
		});

		it('should maintain metadata structure across attempts', async () => {
			createMockApiCalls(mockMessagesCreate, [
				{type: 'invalid', inputTokens: 100, outputTokens: 50},
				{type: 'success', result: 'valid result that is long enough', inputTokens: 150, outputTokens: 75},
			]);

			const result = await executeAgent(
				VALID_COMPLETE_AGENT,
				VALID_EXECUTE_OPTIONS
			);

			if (isOk(result)) {
				expect(result.data.metadata).toBeDefined();
				expect(result.data.metadata?.latency).toBeDefined();
				expect(result.data.metadata?.tokens).toBeDefined();
				expect(result.data.metadata?.tokens?.input).toBeDefined();
				expect(result.data.metadata?.tokens?.output).toBeDefined();
			}
		});
	});

	describe('Token Metadata in Error Paths', () => {
		it('should include token metadata in API error responses', async () => {
			createMockApiCalls(mockMessagesCreate, [
				{type: 'helper', inputTokens: 100, outputTokens: 50},
				{type: 'error', error: new Error('API error')},
			]);

			const result = await executeAgent(
				AGENT_WITH_HELPER_TOOLS,
				VALID_EXECUTE_OPTIONS
			);

			expect(isErr(result)).toBe(true);

			if (isErr(result)) {
				expect(result.error.metadata).toBeDefined();
				expect(result.error.metadata?.tokens).toBeDefined();
				expect(result.error.metadata?.tokens?.input).toBe(100);
				expect(result.error.metadata?.tokens?.output).toBe(50);
			}
		});

		it('should include accumulated tokens when max attempts exceeded', async () => {
			createMockApiCalls(mockMessagesCreate, [
				{type: 'invalid', inputTokens: 100, outputTokens: 50},
				{type: 'invalid', inputTokens: 120, outputTokens: 60},
				{type: 'invalid', inputTokens: 150, outputTokens: 75},
				{type: 'invalid', inputTokens: 140, outputTokens: 70},
				{type: 'invalid', inputTokens: 160, outputTokens: 80},
			]);

			const result = await executeAgent(
				VALID_COMPLETE_AGENT,
				VALID_EXECUTE_OPTIONS
			);

			expect(isErr(result)).toBe(true);

			if (isErr(result)) {
				expect(result.error.metadata).toBeDefined();
				expect(result.error.metadata?.tokens).toBeDefined();
				expect(result.error.metadata?.tokens?.input).toBe(670);
				expect(result.error.metadata?.tokens?.output).toBe(335);
			}
		});
	});
});
