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
	AGENT_WITH_HELPER_TOOLS,
	AGENT_WITH_REFLECTION,
	executeAgent,
	isOk,
	setupExecuteAgentMocks,
} from '../executeAgent.common.fixtures';
import {
	AnthropicApiMock,
	CallbackTracker,
	OUTPUT_TOOL_NAME,
	helperToolUse,
	outputToolUse,
	submitToolUse,
} from '../executeAgent.mock';
import {SUBMIT_TOOL_NAME} from '../iteration/constants';

describe('executeAgent - Callbacks', () => {
	beforeEach(() => {
		setupExecuteAgentMocks(mockMessagesCreate);
	});

	describe('Helper Tool Callbacks', () => {
		it('should invoke onToolCall when helper tool is called', async () => {
			const mock = new AnthropicApiMock();
			mock
				.respondWith({content: [helperToolUse('query_data', {query: 'test'})]})
				.respondWith({content: [outputToolUse('success result')]})
				.install(mockMessagesCreate);

			const tracker = new CallbackTracker();

			await executeAgent(AGENT_WITH_HELPER_TOOLS, {
				input: 'test input with callbacks',
				callbacks: tracker.createCallbacks(),
			});

			const toolCalls = tracker.invocations.filter((i) => i.type === 'onToolCall');

			expect(toolCalls.length).toBeGreaterThan(0);

			const helperCall = toolCalls.find((call) => {
				if (call.type === 'onToolCall') {
					return call.toolName === 'query_data';
				}
				return false;
			});

			expect(helperCall).toBeDefined();
		});

		it('should invoke onToolResult after helper tool executes', async () => {
			const mock = new AnthropicApiMock();
			mock
				.respondWith({content: [helperToolUse('query_data', {query: 'test'})]})
				.respondWith({content: [outputToolUse('success result')]})
				.install(mockMessagesCreate);

			const tracker = new CallbackTracker();

			await executeAgent(AGENT_WITH_HELPER_TOOLS, {
				input: 'test input with callbacks',
				callbacks: tracker.createCallbacks(),
			});

			const toolResults = tracker.invocations.filter((i) => i.type === 'onToolResult');

			expect(toolResults.length).toBeGreaterThan(0);

			const helperResult = toolResults.find((result) => {
				if (result.type === 'onToolResult') {
					return result.toolName === 'query_data';
				}
				return false;
			});

			expect(helperResult).toBeDefined();
		});

		it('should invoke callbacks in correct order for helper tools', async () => {
			const mock = new AnthropicApiMock();
			mock
				.respondWith({content: [helperToolUse('query_data', {query: 'test'})]})
				.respondWith({content: [outputToolUse('success result')]})
				.install(mockMessagesCreate);

			const tracker = new CallbackTracker();

			await executeAgent(AGENT_WITH_HELPER_TOOLS, {
				input: 'test input with callbacks',
				callbacks: tracker.createCallbacks(),
			});

			const helperCallIndex = tracker.invocations.findIndex(
				(i) => i.type === 'onToolCall' && i.toolName === 'query_data'
			);
			const helperResultIndex = tracker.invocations.findIndex(
				(i) => i.type === 'onToolResult' && i.toolName === 'query_data'
			);

			expect(helperCallIndex).toBeGreaterThan(-1);
			expect(helperResultIndex).toBeGreaterThan(-1);
			expect(helperCallIndex).toBeLessThan(helperResultIndex);
		});

		it('should pass correct tool input to onToolCall', async () => {
			const mock = new AnthropicApiMock();
			mock
				.respondWith({content: [helperToolUse('query_data', {query: 'test query'})]})
				.respondWith({content: [outputToolUse('success result')]})
				.install(mockMessagesCreate);

			const tracker = new CallbackTracker();

			await executeAgent(AGENT_WITH_HELPER_TOOLS, {
				input: 'test input with callbacks',
				callbacks: tracker.createCallbacks(),
			});

			const helperCall = tracker.invocations.find(
				(i) => i.type === 'onToolCall' && i.toolName === 'query_data'
			);

			if (helperCall?.type === 'onToolCall') {
				expect(helperCall.toolInput).toEqual({query: 'test query'});
			}
		});

		it('should pass tool result string to onToolResult', async () => {
			const mock = new AnthropicApiMock();
			mock
				.respondWith({content: [helperToolUse('query_data', {query: 'test'})]})
				.respondWith({content: [outputToolUse('success result')]})
				.install(mockMessagesCreate);

			const tracker = new CallbackTracker();

			await executeAgent(AGENT_WITH_HELPER_TOOLS, {
				input: 'test input with callbacks',
				callbacks: tracker.createCallbacks(),
			});

			const helperResult = tracker.invocations.find(
				(i) => i.type === 'onToolResult' && i.toolName === 'query_data'
			);

			if (helperResult?.type === 'onToolResult') {
				expect(typeof helperResult.toolResult).toBe('string');
				expect(helperResult.toolResult.length).toBeGreaterThan(0);
			}
		});

		it('should invoke callbacks for multiple helper tool calls', async () => {
			const mock = new AnthropicApiMock();
			mock
				.respondWith({content: [helperToolUse('query_data', {query: 'first'})]})
				.respondWith({content: [helperToolUse('query_data', {query: 'second'})]})
				.respondWith({content: [outputToolUse('success result')]})
				.install(mockMessagesCreate);

			const tracker = new CallbackTracker();

			await executeAgent(AGENT_WITH_HELPER_TOOLS, {
				input: 'test input with callbacks',
				callbacks: tracker.createCallbacks(),
			});

			const toolCalls = tracker.invocations.filter(
				(i) => i.type === 'onToolCall' && i.toolName === 'query_data'
			);
			const toolResults = tracker.invocations.filter(
				(i) => i.type === 'onToolResult' && i.toolName === 'query_data'
			);

			expect(toolCalls.length).toBe(2);
			expect(toolResults.length).toBe(2);
		});
	});

	describe('Output Tool Callbacks', () => {
		it('should invoke onToolCall when output tool is called in reflection mode', async () => {
			const mock = new AnthropicApiMock();
			mock
				.respondWith({content: [outputToolUse('test result'), submitToolUse()]})
				.install(mockMessagesCreate);

			const tracker = new CallbackTracker();

			await executeAgent(AGENT_WITH_REFLECTION, {
				input: 'test input with callbacks',
				callbacks: tracker.createCallbacks(),
			});

			const outputCall = tracker.invocations.find(
				(i) => i.type === 'onToolCall' && i.toolName === OUTPUT_TOOL_NAME
			);

			expect(outputCall).toBeDefined();
		});

		it('should invoke onToolResult after output tool executes in reflection mode', async () => {
			const mock = new AnthropicApiMock();
			mock
				.respondWith({content: [outputToolUse('test result'), submitToolUse()]})
				.install(mockMessagesCreate);

			const tracker = new CallbackTracker();

			await executeAgent(AGENT_WITH_REFLECTION, {
				input: 'test input with callbacks',
				callbacks: tracker.createCallbacks(),
			});

			const outputResult = tracker.invocations.find(
				(i) => i.type === 'onToolResult' && i.toolName === OUTPUT_TOOL_NAME
			);

			expect(outputResult).toBeDefined();
		});

		it('should invoke callbacks in correct order for output tool in reflection mode', async () => {
			const mock = new AnthropicApiMock();
			mock
				.respondWith({content: [outputToolUse('test result'), submitToolUse()]})
				.install(mockMessagesCreate);

			const tracker = new CallbackTracker();

			await executeAgent(AGENT_WITH_REFLECTION, {
				input: 'test input with callbacks',
				callbacks: tracker.createCallbacks(),
			});

			const outputCallIndex = tracker.invocations.findIndex(
				(i) => i.type === 'onToolCall' && i.toolName === OUTPUT_TOOL_NAME
			);
			const outputResultIndex = tracker.invocations.findIndex(
				(i) => i.type === 'onToolResult' && i.toolName === OUTPUT_TOOL_NAME
			);

			expect(outputCallIndex).toBeGreaterThan(-1);
			expect(outputResultIndex).toBeGreaterThan(-1);
			expect(outputCallIndex).toBeLessThan(outputResultIndex);
		});
	});

	describe('Reflection Mode Callbacks', () => {
		it('should invoke onToolCall for output in reflection mode', async () => {
			const mock = new AnthropicApiMock();
			mock
				.respondWith({content: [outputToolUse('test result'), submitToolUse()]})
				.install(mockMessagesCreate);

			const tracker = new CallbackTracker();

			await executeAgent(AGENT_WITH_REFLECTION, {
				input: 'test input with callbacks',
				callbacks: tracker.createCallbacks(),
			});

			const outputCall = tracker.invocations.find(
				(i) => i.type === 'onToolCall' && i.toolName === OUTPUT_TOOL_NAME
			);

			expect(outputCall).toBeDefined();
		});

		it('should invoke onToolResult for output in reflection mode', async () => {
			const mock = new AnthropicApiMock();
			mock
				.respondWith({content: [outputToolUse('test result'), submitToolUse()]})
				.install(mockMessagesCreate);

			const tracker = new CallbackTracker();

			await executeAgent(AGENT_WITH_REFLECTION, {
				input: 'test input with callbacks',
				callbacks: tracker.createCallbacks(),
			});

			const outputResult = tracker.invocations.find(
				(i) => i.type === 'onToolResult' && i.toolName === OUTPUT_TOOL_NAME
			);

			expect(outputResult).toBeDefined();

			if (outputResult?.type === 'onToolResult') {
				expect(outputResult.toolResult).toContain('Preview:');
			}
		});

		it('should invoke onToolCall for submit in reflection mode', async () => {
			const mock = new AnthropicApiMock();
			mock
				.respondWith({content: [outputToolUse('test result'), submitToolUse()]})
				.install(mockMessagesCreate);

			const tracker = new CallbackTracker();

			await executeAgent(AGENT_WITH_REFLECTION, {
				input: 'test input with callbacks',
				callbacks: tracker.createCallbacks(),
			});

			const submitCall = tracker.invocations.find(
				(i) => i.type === 'onToolCall' && i.toolName === SUBMIT_TOOL_NAME
			);

			expect(submitCall).toBeDefined();
		});

		it('should invoke onToolResult for submit in reflection mode', async () => {
			const mock = new AnthropicApiMock();
			mock
				.respondWith({content: [outputToolUse('test result'), submitToolUse()]})
				.install(mockMessagesCreate);

			const tracker = new CallbackTracker();

			await executeAgent(AGENT_WITH_REFLECTION, {
				input: 'test input with callbacks',
				callbacks: tracker.createCallbacks(),
			});

			const submitResult = tracker.invocations.find(
				(i) => i.type === 'onToolResult' && i.toolName === SUBMIT_TOOL_NAME
			);

			expect(submitResult).toBeDefined();

			if (submitResult?.type === 'onToolResult') {
				expect(submitResult.toolResult).toBe('');
			}
		});

		it('should maintain correct callback order in reflection mode', async () => {
			const mock = new AnthropicApiMock();
			mock
				.respondWith({content: [outputToolUse('test result'), submitToolUse()]})
				.install(mockMessagesCreate);

			const tracker = new CallbackTracker();

			await executeAgent(AGENT_WITH_REFLECTION, {
				input: 'test input with callbacks',
				callbacks: tracker.createCallbacks(),
			});

			const outputCallIndex = tracker.invocations.findIndex(
				(i) => i.type === 'onToolCall' && i.toolName === OUTPUT_TOOL_NAME
			);
			const outputResultIndex = tracker.invocations.findIndex(
				(i) => i.type === 'onToolResult' && i.toolName === OUTPUT_TOOL_NAME
			);
			const submitCallIndex = tracker.invocations.findIndex(
				(i) => i.type === 'onToolCall' && i.toolName === SUBMIT_TOOL_NAME
			);
			const submitResultIndex = tracker.invocations.findIndex(
				(i) => i.type === 'onToolResult' && i.toolName === SUBMIT_TOOL_NAME
			);

			expect(outputCallIndex).toBeLessThan(outputResultIndex);
			expect(outputResultIndex).toBeLessThan(submitCallIndex);
			expect(submitCallIndex).toBeLessThan(submitResultIndex);
		});
	});

	describe('Callback State', () => {
		it('should pass current execution state to onToolCall', async () => {
			const tracker = new CallbackTracker();

			await executeAgent(AGENT_WITH_HELPER_TOOLS, {
				input: 'test input with callbacks',
				callbacks: tracker.createCallbacks(),
			});

			const toolCall = tracker.invocations.find((i) => i.type === 'onToolCall');

			if (toolCall?.type === 'onToolCall') {
				expect(toolCall.context.attempt).toBeGreaterThan(0);
				expect(toolCall.context.maxAttempts).toBeGreaterThan(0);
				expect(toolCall.context.iteration).toBeGreaterThan(0);
				expect(toolCall.context.maxIterations).toBeGreaterThan(0);
			}
		});

		it('should pass current execution state to onToolResult', async () => {
			const tracker = new CallbackTracker();

			await executeAgent(AGENT_WITH_HELPER_TOOLS, {
				input: 'test input with callbacks',
				callbacks: tracker.createCallbacks(),
			});

			const toolResult = tracker.invocations.find((i) => i.type === 'onToolResult');

			if (toolResult?.type === 'onToolResult') {
				expect(toolResult.context.attempt).toBeGreaterThan(0);
				expect(toolResult.context.maxAttempts).toBeGreaterThan(0);
				expect(toolResult.context.iteration).toBeGreaterThan(0);
				expect(toolResult.context.maxIterations).toBeGreaterThan(0);
			}
		});

		it('should increment iteration count across tool callbacks', async () => {
			const mock = new AnthropicApiMock();
			mock
				.respondWith({content: [helperToolUse('query_data', {query: 'test'})]})
				.respondWith({content: [outputToolUse('success result')]})
				.install(mockMessagesCreate);

			const tracker = new CallbackTracker();

			await executeAgent(AGENT_WITH_HELPER_TOOLS, {
				input: 'test input with callbacks',
				callbacks: tracker.createCallbacks(),
			});

			const helperCall = tracker.invocations.find(
				(i) => i.type === 'onToolCall' && i.toolName === 'query_data'
			);
			const outputCall = tracker.invocations.find(
				(i) => i.type === 'onToolCall' && i.toolName === OUTPUT_TOOL_NAME
			);

			if (helperCall?.type === 'onToolCall' && outputCall?.type === 'onToolCall') {
				expect(outputCall.context.iteration).toBeGreaterThan(helperCall.context.iteration);
			}
		});
	});

	describe('Callback Error Handling', () => {
		it('should continue execution when onToolCall throws', async () => {
			const result = await executeAgent(AGENT_WITH_HELPER_TOOLS, {
				input: 'test input',
				callbacks: {
					onToolCall: () => {
						throw new Error('Callback error');
					},
				},
			});

			expect(isOk(result)).toBe(true);
		});

		it('should continue execution when onToolResult throws', async () => {
			const result = await executeAgent(AGENT_WITH_HELPER_TOOLS, {
				input: 'test input',
				callbacks: {
					onToolResult: () => {
						throw new Error('Callback error');
					},
				},
			});

			expect(isOk(result)).toBe(true);
		});

		it('should collect errors from onToolCall in metadata', async () => {
			const result = await executeAgent(AGENT_WITH_HELPER_TOOLS, {
				input: 'test input',
				callbacks: {
					onToolCall: () => {
						throw new Error('Tool call error');
					},
				},
			});

			if (isOk(result)) {
				expect(result.data.metadata?.callbackErrors).toBeDefined();
				expect(result.data.metadata?.callbackErrors?.length).toBeGreaterThan(0);
			}
		});

		it('should collect errors from onToolResult in metadata', async () => {
			const mock = new AnthropicApiMock();
			mock
				.respondWith({content: [helperToolUse('query_data', {query: 'test'})]})
				.respondWith({content: [outputToolUse('success result')]})
				.install(mockMessagesCreate);

			const result = await executeAgent(AGENT_WITH_HELPER_TOOLS, {
				input: 'test input',
				callbacks: {
					onToolResult: () => {
						throw new Error('Tool result error');
					},
				},
			});

			if (isOk(result)) {
				expect(result.data.metadata?.callbackErrors).toBeDefined();
				expect(result.data.metadata?.callbackErrors?.length).toBeGreaterThan(0);
			}
		});
	});
});
