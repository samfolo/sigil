import {describe, expect, it, beforeEach, vi} from 'vitest';

const mockMessagesCreate = vi.fn();

vi.mock('@sigil/src/agent/clients/anthropic', () => ({
	createAnthropicClient: vi.fn(() => ({
		messages: {
			create: mockMessagesCreate,
		},
	})),
}));

import {agentBuilder} from '@sigil/src/agent/framework/defineAgent/defineAgent.fixtures';

import {
	executeAgent,
	VALID_MINIMAL_AGENT,
	VALID_COMPLETE_AGENT,
	AGENT_WITH_HELPER_TOOLS,
	VALID_EXECUTE_OPTIONS,
	isOk,
} from '../executeAgent.common.fixtures';
import {AnthropicApiMock, outputToolUse, helperToolUse} from '../executeAgent.mock';

// Agent with helper tools and token tracking enabled for multi-turn tests
const AGENT_WITH_HELPERS_AND_TRACKING = agentBuilder(AGENT_WITH_HELPER_TOOLS)
	.withObservability({
		trackCost: false,
		trackLatency: false,
		trackAttempts: false,
		trackTokens: true,
	})
	.build();

describe('executeAgent - Prompt Caching', () => {
	beforeEach(() => {
		// Reset mock between tests
		mockMessagesCreate.mockReset();
	});

	describe('System Prompt Caching', () => {
		it('should format system prompt as array with cache_control', async () => {
			const mock = new AnthropicApiMock();
			mock.respondWith({content: [outputToolUse('test result')]}).install(mockMessagesCreate);

			await executeAgent(VALID_MINIMAL_AGENT, VALID_EXECUTE_OPTIONS);

			const firstCall = mock.calls.at(0);
			expect(firstCall).toBeDefined();
			expect(Array.isArray(firstCall?.system)).toBe(true);

			if (firstCall && Array.isArray(firstCall.system)) {
				expect(firstCall.system).toHaveLength(1);
				expect(firstCall.system.at(0)).toMatchObject({
					type: 'text',
					cache_control: {type: 'ephemeral'},
				});
			}
		});

		it('should include system prompt text in cached block', async () => {
			const mock = new AnthropicApiMock();
			mock.respondWith({content: [outputToolUse('test result')]}).install(mockMessagesCreate);

			await executeAgent(VALID_MINIMAL_AGENT, VALID_EXECUTE_OPTIONS);

			const firstCall = mock.calls.at(0);
			if (firstCall && Array.isArray(firstCall.system)) {
				const systemBlock = firstCall.system.at(0);
				expect(systemBlock).toHaveProperty('text');
				expect(typeof systemBlock?.text).toBe('string');
				expect((systemBlock?.text ?? '').length).toBeGreaterThan(0);
			}
		});
	});

	describe('Conversation History Caching', () => {
		it('should add cache_control to initial user message', async () => {
			const mock = new AnthropicApiMock();
			mock.respondWith({content: [outputToolUse('test result')]}).install(mockMessagesCreate);

			await executeAgent(VALID_MINIMAL_AGENT, VALID_EXECUTE_OPTIONS);

			const firstCall = mock.calls.at(0);
			expect(firstCall?.messages).toBeDefined();
			expect(firstCall?.messages.length).toBeGreaterThan(0);

			const firstMessage = firstCall?.messages.at(0);
			expect(firstMessage?.role).toBe('user');
			expect(Array.isArray(firstMessage?.content)).toBe(true);

			if (firstMessage && Array.isArray(firstMessage.content)) {
				const lastBlock = firstMessage.content.at(-1);
				expect(lastBlock).toHaveProperty('cache_control');
				if (lastBlock && 'cache_control' in lastBlock) {
					expect(lastBlock.cache_control).toEqual({type: 'ephemeral'});
				}
			}
		});

		it('should add cache_control to last user message in multi-turn conversation', async () => {
			// Setup mock for multi-turn conversation
			const mock = new AnthropicApiMock();
			mock
				.respondWith({
					content: [helperToolUse('query_data', {query: 'test'})],
				})
				.respondWith({content: [outputToolUse('final result')]})
				.install(mockMessagesCreate);

			await executeAgent(AGENT_WITH_HELPERS_AND_TRACKING, VALID_EXECUTE_OPTIONS);

			// Second call should have 3 messages: initial user, assistant with tool use, user with tool result
			const secondCall = mock.calls.at(1);
			expect(secondCall?.messages).toHaveLength(3);

			// Last message should be user role with tool results
			const lastMessage = secondCall?.messages.at(-1);
			expect(lastMessage?.role).toBe('user');

			if (lastMessage && Array.isArray(lastMessage.content)) {
				const lastBlock = lastMessage.content.at(-1);
				expect(lastBlock).toHaveProperty('cache_control');
				if (lastBlock && 'cache_control' in lastBlock) {
					expect(lastBlock.cache_control).toEqual({type: 'ephemeral'});
				}
			}
		});

		it('should not add cache_control to assistant messages', async () => {
			// Setup mock for multi-turn conversation
			const mock = new AnthropicApiMock();
			mock
				.respondWith({
					content: [helperToolUse('query_data', {query: 'test'})],
				})
				.respondWith({content: [outputToolUse('final result')]})
				.install(mockMessagesCreate);

			await executeAgent(AGENT_WITH_HELPERS_AND_TRACKING, VALID_EXECUTE_OPTIONS);

			const secondCall = mock.calls.at(1);
			// Second message should be assistant
			const assistantMessage = secondCall?.messages.at(1);
			expect(assistantMessage?.role).toBe('assistant');

			// Assistant message content should not have cache_control
			if (assistantMessage && Array.isArray(assistantMessage.content)) {
				const blocks = assistantMessage.content;
				for (const block of blocks) {
					expect(block).not.toHaveProperty('cache_control');
				}
			}
		});
	});

	describe('Cache Metrics Tracking', () => {
		it('should track cache_creation_input_tokens from API response', async () => {
			const mock = new AnthropicApiMock();
			mock
				.respondWith({
					content: [outputToolUse('result that is long enough')],
					usage: {
						input: 5000,
						output: 100,
						cacheCreationInput: 4500,
					},
				})
				.install(mockMessagesCreate);

			const result = await executeAgent(VALID_COMPLETE_AGENT, VALID_EXECUTE_OPTIONS);

			expect(isOk(result)).toBe(true);
			if (isOk(result)) {
				expect(result.data.metadata?.tokens).toBeDefined();
				expect(result.data.metadata?.tokens?.cacheCreationInput).toBe(4500);
			}
		});

		it('should track cache_read_input_tokens from API response', async () => {
			const mock = new AnthropicApiMock();
			mock
				.respondWith({
					content: [outputToolUse('result that is long enough')],
					usage: {
						input: 1000,
						output: 100,
						cacheReadInput: 4000,
					},
				})
				.install(mockMessagesCreate);

			const result = await executeAgent(VALID_COMPLETE_AGENT, VALID_EXECUTE_OPTIONS);

			expect(isOk(result)).toBe(true);
			if (isOk(result)) {
				expect(result.data.metadata?.tokens).toBeDefined();
				expect(result.data.metadata?.tokens?.cacheReadInput).toBe(4000);
			}
		});

		it('should accumulate cache metrics across multiple iterations', async () => {
			const mock = new AnthropicApiMock();
			mock
				.respondWith({
					content: [helperToolUse('query_data', {query: 'test'})],
					usage: {
						input: 5000,
						output: 50,
						cacheCreationInput: 4500,
					},
				})
				.respondWith({
					content: [outputToolUse('final that is long enough')],
					usage: {
						input: 1000,
						output: 100,
						cacheReadInput: 4500,
					},
				})
				.install(mockMessagesCreate);

			const result = await executeAgent(AGENT_WITH_HELPERS_AND_TRACKING, VALID_EXECUTE_OPTIONS);

			expect(isOk(result)).toBe(true);
			if (isOk(result)) {
				expect(result.data.metadata?.tokens).toMatchObject({
					input: 6000,
					output: 150,
					cacheCreationInput: 4500,
					cacheReadInput: 4500,
				});
			}
		});

		it('should handle responses without cache metrics', async () => {
			const mock = new AnthropicApiMock();
			mock
				.respondWith({
					content: [outputToolUse('result that is long enough')],
					usage: {
						input: 1000,
						output: 100,
						// No cache metrics
					},
				})
				.install(mockMessagesCreate);

			const result = await executeAgent(VALID_COMPLETE_AGENT, VALID_EXECUTE_OPTIONS);

			expect(isOk(result)).toBe(true);
			if (isOk(result)) {
				expect(result.data.metadata?.tokens).toMatchObject({
					input: 1000,
					output: 100,
					// Cache metrics should be undefined when not present
					cacheCreationInput: undefined,
					cacheReadInput: undefined,
				});
			}
		});
	});

	describe('Multi-Attempt Caching', () => {
		it('should apply caching on all attempts', async () => {
			// VALID_COMPLETE_AGENT requires result length >= 10
			// First attempt: "short" (5 chars) fails validation
			// Second attempt: "valid result" (12 chars) passes validation
			const mock = new AnthropicApiMock();
			mock
				.respondWith({
					content: [outputToolUse('short')],
					usage: {
						input: 5000,
						output: 50,
						cacheCreationInput: 4500,
					},
				})
				.respondWith({
					content: [outputToolUse('valid result')],
					usage: {
						input: 1000,
						output: 50,
						cacheReadInput: 4500,
					},
				})
				.install(mockMessagesCreate);

			const result = await executeAgent(VALID_COMPLETE_AGENT, VALID_EXECUTE_OPTIONS);

			expect(isOk(result)).toBe(true);
			if (isOk(result)) {
				expect(result.data.attempts).toBe(2);
				// Both attempts should have cache_control in their requests
				expect(mock.calls).toHaveLength(2);

				for (const call of mock.calls) {
					// System prompt should have cache_control
					expect(Array.isArray(call.system)).toBe(true);
					if (Array.isArray(call.system)) {
						expect(call.system.at(0)).toHaveProperty('cache_control');
					}

					// Last user message should have cache_control
					const lastUserMessage = [...call.messages].reverse().find((msg) => msg.role === 'user');
					if (lastUserMessage && Array.isArray(lastUserMessage.content)) {
						const lastBlock = lastUserMessage.content.at(-1);
						expect(lastBlock).toHaveProperty('cache_control');
					}
				}
			}
		});
	});
});
