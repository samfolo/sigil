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
	VALID_MINIMAL_AGENT,
	VALID_COMPLETE_AGENT,
	AGENT_WITH_HELPER_TOOLS,
	AGENT_WITH_REFLECTION,
	VALID_EXECUTE_OPTIONS,
	createMockApiCalls,
	createOutputThenSubmitResponse,
} from './executeAgent.common.fixtures';

describe('executeAgent - Conversation History', () => {
	beforeEach(() => {
		setupExecuteAgentMocks(mockMessagesCreate);
	});

	describe('Initial Message Structure', () => {
		it('should send user message with input on first call', async () => {
			await executeAgent(VALID_MINIMAL_AGENT, VALID_EXECUTE_OPTIONS);

			expect(mockMessagesCreate).toHaveBeenCalledTimes(1);

			const firstCall = mockMessagesCreate.mock.calls.at(0);
			const messages = firstCall?.at(0)?.messages;

			expect(messages).toBeDefined();
			expect(messages?.at(0)?.role).toBe('user');
			expect(messages?.at(0)?.content).toContain('test input');
		});

		it('should send only user message on first attempt', async () => {
			await executeAgent(VALID_MINIMAL_AGENT, VALID_EXECUTE_OPTIONS);

			const firstCall = mockMessagesCreate.mock.calls.at(0);
			const messages = firstCall?.at(0)?.messages;

			expect(messages?.length).toBe(1);
			expect(messages?.at(0)?.role).toBe('user');
		});
	});

	describe('History Accumulation Across Attempts', () => {
		it('should accumulate history after validation failure', async () => {
			createMockApiCalls(mockMessagesCreate, [
				{type: 'invalid'},
				{type: 'success', result: 'valid result that is long enough'},
			]);

			await executeAgent(VALID_COMPLETE_AGENT, VALID_EXECUTE_OPTIONS);

			expect(mockMessagesCreate).toHaveBeenCalledTimes(2);

			const secondCall = mockMessagesCreate.mock.calls.at(1);
			const messages = secondCall?.at(0)?.messages;

			expect(messages?.length).toBeGreaterThan(1);
		});

		it('should include assistant response in history after failure', async () => {
			createMockApiCalls(mockMessagesCreate, [
				{type: 'invalid'},
				{type: 'success', result: 'valid result that is long enough'},
			]);

			await executeAgent(VALID_COMPLETE_AGENT, VALID_EXECUTE_OPTIONS);

			const secondCall = mockMessagesCreate.mock.calls.at(1);
			const messages = secondCall?.at(0)?.messages;

			const assistantMessage = messages?.find((m: {role: string}) => m.role === 'assistant');
			expect(assistantMessage).toBeDefined();
		});

		it('should append error message after validation failure', async () => {
			createMockApiCalls(mockMessagesCreate, [
				{type: 'invalid'},
				{type: 'success', result: 'valid result that is long enough'},
			]);

			await executeAgent(VALID_COMPLETE_AGENT, VALID_EXECUTE_OPTIONS);

			const secondCall = mockMessagesCreate.mock.calls.at(1);
			const messages = secondCall?.at(0)?.messages;

			const userMessages = messages?.filter((m: {role: string}) => m.role === 'user');
			expect(userMessages?.length).toBeGreaterThan(1);
		});

		it('should maintain correct message order across attempts', async () => {
			createMockApiCalls(mockMessagesCreate, [
				{type: 'invalid'},
				{type: 'success', result: 'valid result that is long enough'},
			]);

			await executeAgent(VALID_COMPLETE_AGENT, VALID_EXECUTE_OPTIONS);

			const secondCall = mockMessagesCreate.mock.calls.at(1);
			const messages = secondCall?.at(0)?.messages;

			expect(messages?.at(0)?.role).toBe('user');
			expect(messages?.at(1)?.role).toBe('assistant');
			expect(messages?.at(2)?.role).toBe('user');
		});
	});

	describe('History Accumulation Across Iterations', () => {
		it('should accumulate history after helper tool use', async () => {
			createMockApiCalls(mockMessagesCreate, [
				{type: 'helper'},
				{type: 'success'},
			]);

			await executeAgent(AGENT_WITH_HELPER_TOOLS, VALID_EXECUTE_OPTIONS);

			expect(mockMessagesCreate).toHaveBeenCalledTimes(2);

			const secondCall = mockMessagesCreate.mock.calls.at(1);
			const messages = secondCall?.at(0)?.messages;

			expect(messages?.length).toBeGreaterThan(1);
		});

		it('should include tool use in assistant message', async () => {
			createMockApiCalls(mockMessagesCreate, [
				{type: 'helper'},
				{type: 'success'},
			]);

			await executeAgent(AGENT_WITH_HELPER_TOOLS, VALID_EXECUTE_OPTIONS);

			const secondCall = mockMessagesCreate.mock.calls.at(1);
			const messages = secondCall?.at(0)?.messages;

			const assistantMessage = messages?.find((m: {role: string}) => m.role === 'assistant');
			expect(assistantMessage).toBeDefined();

			if (assistantMessage) {
				const content = assistantMessage.content;
				const toolUse = Array.isArray(content)
					? content.find((block: {type: string}) => block.type === 'tool_use')
					: null;
				expect(toolUse).toBeDefined();
			}
		});

		it('should include tool result in user message', async () => {
			createMockApiCalls(mockMessagesCreate, [
				{type: 'helper'},
				{type: 'success'},
			]);

			await executeAgent(AGENT_WITH_HELPER_TOOLS, VALID_EXECUTE_OPTIONS);

			const secondCall = mockMessagesCreate.mock.calls.at(1);
			const messages = secondCall?.at(0)?.messages;

			const userMessages = messages?.filter((m: {role: string}) => m.role === 'user');
			const toolResultMessage = userMessages?.at(-1);

			expect(toolResultMessage).toBeDefined();

			if (toolResultMessage) {
				const content = toolResultMessage.content;
				const toolResult = Array.isArray(content)
					? content.find((block: {type: string}) => block.type === 'tool_result')
					: null;
				expect(toolResult).toBeDefined();
			}
		});

		it('should accumulate multiple iterations in history', async () => {
			createMockApiCalls(mockMessagesCreate, [
				{type: 'helper'},
				{type: 'helper'},
				{type: 'success'},
			]);

			await executeAgent(AGENT_WITH_HELPER_TOOLS, VALID_EXECUTE_OPTIONS);

			const thirdCall = mockMessagesCreate.mock.calls.at(2);
			const messages = thirdCall?.at(0)?.messages;

			expect(messages?.length).toBeGreaterThan(3);
		});
	});

	describe('Reflection Mode History', () => {
		it('should include output tool use in history', async () => {
			createMockApiCalls(mockMessagesCreate, [
				{type: 'success', result: 'draft'},
				{type: 'custom', response: createOutputThenSubmitResponse('final')},
			]);

			await executeAgent(AGENT_WITH_REFLECTION, VALID_EXECUTE_OPTIONS);

			const secondCall = mockMessagesCreate.mock.calls.at(1);
			const messages = secondCall?.at(0)?.messages;

			const assistantMessage = messages?.find((m: {role: string}) => m.role === 'assistant');

			if (assistantMessage) {
				const content = assistantMessage.content;
				const outputToolUse = Array.isArray(content)
					? content.find((block: {type: string; name?: string}) =>
						block.type === 'tool_use' && block.name === 'generate_output'
					)
					: null;
				expect(outputToolUse).toBeDefined();
			}
		});

		it('should include reflection feedback in tool result', async () => {
			createMockApiCalls(mockMessagesCreate, [
				{type: 'success', result: 'draft'},
				{type: 'custom', response: createOutputThenSubmitResponse('final')},
			]);

			await executeAgent(AGENT_WITH_REFLECTION, VALID_EXECUTE_OPTIONS);

			const secondCall = mockMessagesCreate.mock.calls.at(1);
			const messages = secondCall?.at(0)?.messages;

			const userMessages = messages?.filter((m: {role: string}) => m.role === 'user');
			const feedbackMessage = userMessages?.at(-1);

			if (feedbackMessage) {
				const content = feedbackMessage.content;
				const toolResult = Array.isArray(content)
					? content.find((block: {type: string}) => block.type === 'tool_result')
					: null;
				expect(toolResult).toBeDefined();
			}
		});

		it('should maintain history through multiple reflection iterations', async () => {
			createMockApiCalls(mockMessagesCreate, [
				{type: 'success', result: 'draft 1'},
				{type: 'success', result: 'draft 2'},
				{type: 'custom', response: createOutputThenSubmitResponse('final')},
			]);

			await executeAgent(AGENT_WITH_REFLECTION, VALID_EXECUTE_OPTIONS);

			const thirdCall = mockMessagesCreate.mock.calls.at(2);
			const messages = thirdCall?.at(0)?.messages;

			expect(messages?.length).toBeGreaterThan(4);
		});
	});

	describe('Tool Result Structure', () => {
		it('should include tool_use_id in tool_result', async () => {
			createMockApiCalls(mockMessagesCreate, [
				{type: 'helper'},
				{type: 'success'},
			]);

			await executeAgent(AGENT_WITH_HELPER_TOOLS, VALID_EXECUTE_OPTIONS);

			const secondCall = mockMessagesCreate.mock.calls.at(1);
			const messages = secondCall?.at(0)?.messages;

			const userMessages = messages?.filter((m: {role: string}) => m.role === 'user');
			const toolResultMessage = userMessages?.at(-1);

			if (toolResultMessage) {
				const content = toolResultMessage.content;
				const toolResult = Array.isArray(content)
					? content.find((block: {type: string}) => block.type === 'tool_result')
					: null;

				if (toolResult && typeof toolResult === 'object' && 'tool_use_id' in toolResult) {
					expect(toolResult.tool_use_id).toBeDefined();
					expect(typeof toolResult.tool_use_id).toBe('string');
				}
			}
		});

		it('should match tool_use_id between tool_use and tool_result', async () => {
			createMockApiCalls(mockMessagesCreate, [
				{type: 'helper'},
				{type: 'success'},
			]);

			await executeAgent(AGENT_WITH_HELPER_TOOLS, VALID_EXECUTE_OPTIONS);

			const secondCall = mockMessagesCreate.mock.calls.at(1);
			const messages = secondCall?.at(0)?.messages;

			const assistantMessage = messages?.at(1);
			const userMessage = messages?.at(2);

			if (assistantMessage && userMessage) {
				const toolUse = Array.isArray(assistantMessage.content)
					? assistantMessage.content.find((block: {type: string}) => block.type === 'tool_use')
					: null;
				const toolResult = Array.isArray(userMessage.content)
					? userMessage.content.find((block: {type: string}) => block.type === 'tool_result')
					: null;

				if (toolUse && toolResult &&
						typeof toolUse === 'object' && 'id' in toolUse &&
						typeof toolResult === 'object' && 'tool_use_id' in toolResult) {
					expect(toolResult.tool_use_id).toBe(toolUse.id);
				}
			}
		});
	});
});
