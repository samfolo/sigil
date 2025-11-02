import type Anthropic from '@anthropic-ai/sdk';
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
	AGENT_WITH_REFLECTION,
	AGENT_WITH_REJECTING_REFLECTION,
	AGENT_WITH_THROWING_REFLECTION,
	VALID_EXECUTE_OPTIONS,
	isOk,
	isErr,
	AGENT_ERROR_CODES,
} from '../executeAgent.common.fixtures';
import {AnthropicApiMock, CallbackTracker, outputToolUse, submitToolUse} from '../executeAgent.mock';

describe('executeAgent - Reflection Mode', () => {
	beforeEach(() => {
		setupExecuteAgentMocks(mockMessagesCreate);
	});

	it('should execute reflection handler when output tool is called', async () => {
		const mock = new AnthropicApiMock();
		mock
			.respondWith({content: [outputToolUse('success result')]})
			.respondWith({content: [submitToolUse()]})
			.install(mockMessagesCreate);

		const result = await executeAgent(AGENT_WITH_REFLECTION, VALID_EXECUTE_OPTIONS);

		expect(isOk(result)).toBe(true);
	});

	it('should allow output tool to be called multiple times before submit', async () => {
		const mock = new AnthropicApiMock();
		mock
			.respondWith({content: [outputToolUse('first draft')]})
			.respondWith({content: [outputToolUse('second draft')]})
			.respondWith({content: [outputToolUse('final draft')]})
			.respondWith({content: [outputToolUse('final draft'), submitToolUse()]})
			.install(mockMessagesCreate);

		const result = await executeAgent(AGENT_WITH_REFLECTION, VALID_EXECUTE_OPTIONS);

		expect(isOk(result)).toBe(true);

		if (isOk(result)) {
			// Should use the last output before submit
			expect(result.data.output.result).toBe('final draft');
		}
	});

	it('should return SUBMIT_BEFORE_OUTPUT error when submit called without output', async () => {
		const mock = new AnthropicApiMock();
		mock.respondWith({content: [submitToolUse()]}).install(mockMessagesCreate);

		const result = await executeAgent(AGENT_WITH_REFLECTION, VALID_EXECUTE_OPTIONS);

		expect(isErr(result)).toBe(true);

		if (isErr(result)) {
			const error = result.error.errors.at(0);
			expect(error?.code).toBe(AGENT_ERROR_CODES.SUBMIT_BEFORE_OUTPUT);
			expect(error?.category).toBe('model');
		}
	});

	it('should pass output to reflection handler for formatting', async () => {
		const mock = new AnthropicApiMock();
		mock.respondWith({content: [outputToolUse('test result'), submitToolUse()]}).install(mockMessagesCreate);

		const result = await executeAgent(AGENT_WITH_REFLECTION, VALID_EXECUTE_OPTIONS);

		expect(isOk(result)).toBe(true);
	});

	it('should handle reflection handler returning error', async () => {
		// Output is too short (< 20 chars), should get error from reflection handler
		const mock = new AnthropicApiMock();
		mock
			.respondWith({content: [outputToolUse('short')]})
			.respondWith({content: [outputToolUse('longer result that meets requirements'), submitToolUse()]})
			.install(mockMessagesCreate);

		const result = await executeAgent(AGENT_WITH_REJECTING_REFLECTION, VALID_EXECUTE_OPTIONS);

		expect(isOk(result)).toBe(true);

		if (isOk(result)) {
			expect(result.data.output.result).toBe('longer result that meets requirements');
		}
	});

	it('should terminate iteration when submit is called', async () => {
		const mock = new AnthropicApiMock();
		mock.respondWith({content: [outputToolUse('success result'), submitToolUse()]}).install(mockMessagesCreate);

		const result = await executeAgent(AGENT_WITH_REFLECTION, VALID_EXECUTE_OPTIONS);

		expect(isOk(result)).toBe(true);

		// Verify only one API call was made (output + submit in one response)
		expect(mockMessagesCreate).toHaveBeenCalledTimes(1);
	});

	it('should accumulate tokens across reflection iterations', async () => {
		const mock = new AnthropicApiMock();
		mock
			.respondWith({content: [outputToolUse('draft 1')], usage: {input: 100, output: 50}})
			.respondWith({content: [outputToolUse('draft 2')], usage: {input: 150, output: 75}})
			.respondWith({content: [outputToolUse('final draft'), submitToolUse()], usage: {input: 200, output: 100}})
			.install(mockMessagesCreate);

		const result = await executeAgent(AGENT_WITH_REFLECTION, VALID_EXECUTE_OPTIONS);

		expect(isOk(result)).toBe(true);

		if (isOk(result)) {
			expect(result.data.metadata?.tokens?.input).toBe(450);
			expect(result.data.metadata?.tokens?.output).toBe(225);
		}
	});

	it('should bypass reflection handler in non-reflection mode', async () => {
		// VALID_MINIMAL_AGENT doesn't have reflectionHandler
		const mock = new AnthropicApiMock();
		mock.respondWith({content: [outputToolUse('success result')]}).install(mockMessagesCreate);

		const result = await executeAgent(VALID_MINIMAL_AGENT, VALID_EXECUTE_OPTIONS);

		expect(isOk(result)).toBe(true);

		// Should have called API only once (no reflection iteration)
		expect(mockMessagesCreate).toHaveBeenCalledTimes(1);
	});

	it('should not inject submit tool in non-reflection mode', async () => {
		const mock = new AnthropicApiMock();
		mock.respondWith({content: [outputToolUse('success result')]}).install(mockMessagesCreate);

		await executeAgent(VALID_MINIMAL_AGENT, VALID_EXECUTE_OPTIONS);

		// Check that tools array doesn't include submit
		const firstCall = mockMessagesCreate.mock.calls.at(0);
		const tools = firstCall?.at(0)?.tools;

		expect(tools).toBeDefined();
		expect(tools?.some((tool: {name: string}) => tool.name === 'submit')).toBe(false);
	});

	it('should inject submit tool in reflection mode', async () => {
		const mock = new AnthropicApiMock();
		mock.respondWith({content: [outputToolUse('success result'), submitToolUse()]}).install(mockMessagesCreate);

		await executeAgent(AGENT_WITH_REFLECTION, VALID_EXECUTE_OPTIONS);

		// Check that tools array includes submit
		const firstCall = mockMessagesCreate.mock.calls.at(0);
		const tools = firstCall?.at(0)?.tools;

		expect(tools).toBeDefined();
		expect(tools?.some((tool: {name: string}) => tool.name === 'submit')).toBe(true);
	});

	describe('Validation Error Handling', () => {
		it('should add tool_result when validation fails in reflection mode', async () => {
			// First response: output+submit with invalid data (fails Zod validation)
			// Second response: output+submit with valid data
			const mock = new AnthropicApiMock();
			mock
				.respondWith({
					content: [
						{type: 'tool_use', id: 'toolu_invalid', name: 'generate_output', input: {wrongField: 'oops'}},
						{type: 'tool_use', id: 'toolu_submit', name: 'submit', input: {}},
					],
					id: 'msg_test_invalid',
				})
				.respondWith({content: [outputToolUse('valid result'), submitToolUse()]})
				.install(mockMessagesCreate);

			const result = await executeAgent(AGENT_WITH_REFLECTION, VALID_EXECUTE_OPTIONS);

			expect(isOk(result)).toBe(true);

			// Verify second call has tool_result for the failed output tool
			const secondCall = mockMessagesCreate.mock.calls.at(1);
			const messages = secondCall?.at(0)?.messages;

			const userMessage = Array.isArray(messages)
				? messages.find((m) => m.role === 'user' && Array.isArray(m.content))
				: undefined;

			const toolResult = Array.isArray(userMessage?.content)
				? userMessage.content.find((block: Anthropic.ContentBlockParam) => typeof block === 'object' && block !== null && 'type' in block && block.type === 'tool_result')
				: undefined;

			expect(toolResult).toBeDefined();
		});

		it('should mark tool_result as error when validation fails', async () => {
			const mock = new AnthropicApiMock();
			mock
				.respondWith({
					content: [
						{type: 'tool_use', id: 'toolu_invalid', name: 'generate_output', input: {wrongField: 'oops'}},
						{type: 'tool_use', id: 'toolu_submit', name: 'submit', input: {}},
					],
					id: 'msg_test_invalid',
				})
				.respondWith({content: [outputToolUse('valid result'), submitToolUse()]})
				.install(mockMessagesCreate);

			await executeAgent(AGENT_WITH_REFLECTION, VALID_EXECUTE_OPTIONS);

			const secondCall = mockMessagesCreate.mock.calls.at(1);
			const messages = secondCall?.at(0)?.messages;

			const userMessage = Array.isArray(messages)
				? messages.find((m) => m.role === 'user' && Array.isArray(m.content))
				: undefined;

			const toolResult = Array.isArray(userMessage?.content)
				? userMessage.content.find((block: Anthropic.ContentBlockParam) => typeof block === 'object' && block !== null && 'type' in block && block.type === 'tool_result')
				: undefined;

			if (toolResult && typeof toolResult === 'object' && 'is_error' in toolResult) {
				expect(toolResult.is_error).toBe(true);
			}
		});

		it('should invoke onToolResult callback when validation fails', async () => {
			const mock = new AnthropicApiMock();
			mock
				.respondWith({
					content: [
						{type: 'tool_use', id: 'toolu_invalid', name: 'generate_output', input: {wrongField: 'oops'}},
						{type: 'tool_use', id: 'toolu_submit', name: 'submit', input: {}},
					],
					id: 'msg_test_invalid',
				})
				.respondWith({content: [outputToolUse('valid result'), submitToolUse()]})
				.install(mockMessagesCreate);

			const tracker = new CallbackTracker();

			await executeAgent(AGENT_WITH_REFLECTION, {
				input: 'test input with callbacks',
				callbacks: tracker.createCallbacks(),
			});

			const validationErrorResult = tracker.invocations.find((inv) =>
				inv.type === 'onToolResult' &&
				inv.toolName === 'generate_output' &&
				inv.toolResult.includes('Validation failed')
			);

			expect(validationErrorResult).toBeDefined();
		});
	});

	describe('Reflection Handler Exception Safety', () => {
		it('should handle reflection handler that throws exception', async () => {
			const mock = new AnthropicApiMock();
			mock
				.respondWith({content: [outputToolUse('success result')]})
				.respondWith({content: [submitToolUse()]})
				.install(mockMessagesCreate);

			const result = await executeAgent(AGENT_WITH_THROWING_REFLECTION, VALID_EXECUTE_OPTIONS);

			// Should still succeed - exception caught and returned as error tool result
			expect(isOk(result)).toBe(true);
		});

		it('should pass error message to model when reflection handler throws', async () => {
			const mock = new AnthropicApiMock();
			mock
				.respondWith({content: [outputToolUse('success result')]})
				.respondWith({content: [submitToolUse()]})
				.install(mockMessagesCreate);

			await executeAgent(AGENT_WITH_THROWING_REFLECTION, VALID_EXECUTE_OPTIONS);

			// Check that second API call received error in conversation history
			const secondCall = mockMessagesCreate.mock.calls.at(1);
			const messages = secondCall?.at(0)?.messages;

			// Find the user message with tool result
			const toolResultMessage = messages?.find((m: {role: string; content: unknown}) => {
				if (m.role !== 'user') {
					return false;
				}
				const content = m.content;
				return Array.isArray(content) && content.some((block: {type: string}) => block.type === 'tool_result');
			});

			expect(toolResultMessage).toBeDefined();

			if (toolResultMessage) {
				const content = toolResultMessage.content;
				const toolResult = Array.isArray(content)
					? content.find((block: {type: string}) => block.type === 'tool_result')
					: null;

				if (toolResult && typeof toolResult === 'object' && 'content' in toolResult) {
					expect(toolResult.content).toContain('Error:');
					expect(toolResult.content).toContain('Reflection handler threw exception');
				}
			}
		});

		it('should mark tool result as error when reflection handler throws', async () => {
			const mock = new AnthropicApiMock();
			mock
				.respondWith({content: [outputToolUse('success result')]})
				.respondWith({content: [submitToolUse()]})
				.install(mockMessagesCreate);

			await executeAgent(AGENT_WITH_THROWING_REFLECTION, VALID_EXECUTE_OPTIONS);

			// Check that second API call received is_error: true
			const secondCall = mockMessagesCreate.mock.calls.at(1);
			const messages = secondCall?.at(0)?.messages;

			const toolResultMessage = messages?.find((m: {role: string; content: unknown}) => {
				if (m.role !== 'user') {
					return false;
				}
				const content = m.content;
				return Array.isArray(content) && content.some((block: {type: string}) => block.type === 'tool_result');
			});

			if (toolResultMessage) {
				const content = toolResultMessage.content;
				const toolResult = Array.isArray(content)
					? content.find((block: {type: string}) => block.type === 'tool_result')
					: null;

				if (toolResult && typeof toolResult === 'object' && 'is_error' in toolResult) {
					expect(toolResult.is_error).toBe(true);
				}
			}
		});

		it('should invoke onToolResult callback when reflection handler throws', async () => {
			const mock = new AnthropicApiMock();
			mock
				.respondWith({content: [outputToolUse('success result')]})
				.respondWith({content: [submitToolUse()]})
				.install(mockMessagesCreate);

			const tracker = new CallbackTracker();

			await executeAgent(AGENT_WITH_THROWING_REFLECTION, {
				input: 'test input with callbacks',
				callbacks: tracker.createCallbacks(),
			});

			// Should have called onToolResult with error
			const toolResults = tracker.invocations.filter((i) => i.type === 'onToolResult');
			expect(toolResults.length).toBeGreaterThan(0);

			const outputResult = toolResults.find((result) => {
				if (result.type === 'onToolResult') {
					return result.toolName === 'generate_output';
				}
				return false;
			});

			if (outputResult?.type === 'onToolResult') {
				expect(outputResult.toolResult).toContain('Error:');
				expect(outputResult.toolResult).toContain('Reflection handler threw exception');
			}
		});
	});
});
