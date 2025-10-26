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
	AGENT_WITH_HELPER_TOOLS,
	AGENT_WITH_REFLECTION,
	createExecuteOptionsWithCallbackTracking,
	createMockApiCalls,
	createOutputThenSubmitResponse,
	isOk,
} from '../executeAgent.common.fixtures';

describe('executeAgent - Callbacks', () => {
	beforeEach(() => {
		setupExecuteAgentMocks(mockMessagesCreate);
	});

	describe('Helper Tool Callbacks', () => {
		it('should invoke onToolCall when helper tool is called', async () => {
			createMockApiCalls(mockMessagesCreate, [
				{type: 'helper', helperToolName: 'query_data'},
				{type: 'success'},
			]);

			const {options, invocations} =
        createExecuteOptionsWithCallbackTracking();

			await executeAgent(AGENT_WITH_HELPER_TOOLS, options);

			const toolCalls = invocations.filter((i) => i.type === 'onToolCall');

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
			createMockApiCalls(mockMessagesCreate, [
				{type: 'helper', helperToolName: 'query_data'},
				{type: 'success'},
			]);

			const {options, invocations} =
        createExecuteOptionsWithCallbackTracking();

			await executeAgent(AGENT_WITH_HELPER_TOOLS, options);

			const toolResults = invocations.filter((i) => i.type === 'onToolResult');

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
			createMockApiCalls(mockMessagesCreate, [
				{type: 'helper', helperToolName: 'query_data'},
				{type: 'success'},
			]);

			const {options, invocations} =
        createExecuteOptionsWithCallbackTracking();

			await executeAgent(AGENT_WITH_HELPER_TOOLS, options);

			const helperCallIndex = invocations.findIndex(
				(i) => i.type === 'onToolCall' && i.toolName === 'query_data'
			);
			const helperResultIndex = invocations.findIndex(
				(i) => i.type === 'onToolResult' && i.toolName === 'query_data'
			);

			expect(helperCallIndex).toBeGreaterThan(-1);
			expect(helperResultIndex).toBeGreaterThan(-1);
			expect(helperCallIndex).toBeLessThan(helperResultIndex);
		});

		it('should pass correct tool input to onToolCall', async () => {
			createMockApiCalls(mockMessagesCreate, [
				{type: 'helper', helperToolName: 'query_data', helperInput: {query: 'test query'}},
				{type: 'success'},
			]);

			const {options, invocations} =
        createExecuteOptionsWithCallbackTracking();

			await executeAgent(AGENT_WITH_HELPER_TOOLS, options);

			const helperCall = invocations.find(
				(i) => i.type === 'onToolCall' && i.toolName === 'query_data'
			);

			if (helperCall?.type === 'onToolCall') {
				expect(helperCall.toolInput).toEqual({query: 'test query'});
			}
		});

		it('should pass tool result string to onToolResult', async () => {
			createMockApiCalls(mockMessagesCreate, [
				{type: 'helper', helperToolName: 'query_data'},
				{type: 'success'},
			]);

			const {options, invocations} =
        createExecuteOptionsWithCallbackTracking();

			await executeAgent(AGENT_WITH_HELPER_TOOLS, options);

			const helperResult = invocations.find(
				(i) => i.type === 'onToolResult' && i.toolName === 'query_data'
			);

			if (helperResult?.type === 'onToolResult') {
				expect(typeof helperResult.toolResult).toBe('string');
				expect(helperResult.toolResult.length).toBeGreaterThan(0);
			}
		});

		it('should invoke callbacks for multiple helper tool calls', async () => {
			createMockApiCalls(mockMessagesCreate, [
				{type: 'helper', helperToolName: 'query_data', helperInput: {query: 'first'}},
				{type: 'helper', helperToolName: 'query_data', helperInput: {query: 'second'}},
				{type: 'success'},
			]);

			const {options, invocations} =
        createExecuteOptionsWithCallbackTracking();

			await executeAgent(AGENT_WITH_HELPER_TOOLS, options);

			const toolCalls = invocations.filter(
				(i) => i.type === 'onToolCall' && i.toolName === 'query_data'
			);
			const toolResults = invocations.filter(
				(i) => i.type === 'onToolResult' && i.toolName === 'query_data'
			);

			expect(toolCalls.length).toBe(2);
			expect(toolResults.length).toBe(2);
		});
	});

	describe('Output Tool Callbacks', () => {
		it('should invoke onToolCall when output tool is called in reflection mode', async () => {
			createMockApiCalls(mockMessagesCreate, [
				{type: 'custom', response: createOutputThenSubmitResponse('test result')},
			]);

			const {options, invocations} =
        createExecuteOptionsWithCallbackTracking();

			await executeAgent(AGENT_WITH_REFLECTION, options);

			const outputCall = invocations.find(
				(i) => i.type === 'onToolCall' && i.toolName === 'generate_output'
			);

			expect(outputCall).toBeDefined();
		});

		it('should invoke onToolResult after output tool executes in reflection mode', async () => {
			createMockApiCalls(mockMessagesCreate, [
				{type: 'custom', response: createOutputThenSubmitResponse('test result')},
			]);

			const {options, invocations} =
        createExecuteOptionsWithCallbackTracking();

			await executeAgent(AGENT_WITH_REFLECTION, options);

			const outputResult = invocations.find(
				(i) => i.type === 'onToolResult' && i.toolName === 'generate_output'
			);

			expect(outputResult).toBeDefined();
		});

		it('should invoke callbacks in correct order for output tool in reflection mode', async () => {
			createMockApiCalls(mockMessagesCreate, [
				{type: 'custom', response: createOutputThenSubmitResponse('test result')},
			]);

			const {options, invocations} =
        createExecuteOptionsWithCallbackTracking();

			await executeAgent(AGENT_WITH_REFLECTION, options);

			const outputCallIndex = invocations.findIndex(
				(i) => i.type === 'onToolCall' && i.toolName === 'generate_output'
			);
			const outputResultIndex = invocations.findIndex(
				(i) => i.type === 'onToolResult' && i.toolName === 'generate_output'
			);

			expect(outputCallIndex).toBeGreaterThan(-1);
			expect(outputResultIndex).toBeGreaterThan(-1);
			expect(outputCallIndex).toBeLessThan(outputResultIndex);
		});
	});

	describe('Reflection Mode Callbacks', () => {
		it('should invoke onToolCall for output in reflection mode', async () => {
			createMockApiCalls(mockMessagesCreate, [
				{type: 'custom', response: createOutputThenSubmitResponse('test result')},
			]);

			const {options, invocations} =
        createExecuteOptionsWithCallbackTracking();

			await executeAgent(AGENT_WITH_REFLECTION, options);

			const outputCall = invocations.find(
				(i) => i.type === 'onToolCall' && i.toolName === 'generate_output'
			);

			expect(outputCall).toBeDefined();
		});

		it('should invoke onToolResult for output in reflection mode', async () => {
			createMockApiCalls(mockMessagesCreate, [
				{type: 'custom', response: createOutputThenSubmitResponse('test result')},
			]);

			const {options, invocations} =
        createExecuteOptionsWithCallbackTracking();

			await executeAgent(AGENT_WITH_REFLECTION, options);

			const outputResult = invocations.find(
				(i) => i.type === 'onToolResult' && i.toolName === 'generate_output'
			);

			expect(outputResult).toBeDefined();

			if (outputResult?.type === 'onToolResult') {
				expect(outputResult.toolResult).toContain('Preview:');
			}
		});

		it('should invoke onToolCall for submit in reflection mode', async () => {
			createMockApiCalls(mockMessagesCreate, [
				{type: 'custom', response: createOutputThenSubmitResponse('test result')},
			]);

			const {options, invocations} =
        createExecuteOptionsWithCallbackTracking();

			await executeAgent(AGENT_WITH_REFLECTION, options);

			const submitCall = invocations.find(
				(i) => i.type === 'onToolCall' && i.toolName === 'submit'
			);

			expect(submitCall).toBeDefined();
		});

		it('should invoke onToolResult for submit in reflection mode', async () => {
			createMockApiCalls(mockMessagesCreate, [
				{type: 'custom', response: createOutputThenSubmitResponse('test result')},
			]);

			const {options, invocations} =
        createExecuteOptionsWithCallbackTracking();

			await executeAgent(AGENT_WITH_REFLECTION, options);

			const submitResult = invocations.find(
				(i) => i.type === 'onToolResult' && i.toolName === 'submit'
			);

			expect(submitResult).toBeDefined();

			if (submitResult?.type === 'onToolResult') {
				expect(submitResult.toolResult).toBe('');
			}
		});

		it('should maintain correct callback order in reflection mode', async () => {
			createMockApiCalls(mockMessagesCreate, [
				{type: 'custom', response: createOutputThenSubmitResponse('test result')},
			]);

			const {options, invocations} =
        createExecuteOptionsWithCallbackTracking();

			await executeAgent(AGENT_WITH_REFLECTION, options);

			const outputCallIndex = invocations.findIndex(
				(i) => i.type === 'onToolCall' && i.toolName === 'generate_output'
			);
			const outputResultIndex = invocations.findIndex(
				(i) => i.type === 'onToolResult' && i.toolName === 'generate_output'
			);
			const submitCallIndex = invocations.findIndex(
				(i) => i.type === 'onToolCall' && i.toolName === 'submit'
			);
			const submitResultIndex = invocations.findIndex(
				(i) => i.type === 'onToolResult' && i.toolName === 'submit'
			);

			expect(outputCallIndex).toBeLessThan(outputResultIndex);
			expect(outputResultIndex).toBeLessThan(submitCallIndex);
			expect(submitCallIndex).toBeLessThan(submitResultIndex);
		});
	});

	describe('Callback State', () => {
		it('should pass current execution state to onToolCall', async () => {
			const {options, invocations} =
        createExecuteOptionsWithCallbackTracking();

			await executeAgent(AGENT_WITH_HELPER_TOOLS, options);

			const toolCall = invocations.find((i) => i.type === 'onToolCall');

			if (toolCall?.type === 'onToolCall') {
				expect(toolCall.state.attempt).toBeGreaterThan(0);
				expect(toolCall.state.maxAttempts).toBeGreaterThan(0);
				expect(toolCall.state.iteration).toBeGreaterThan(0);
				expect(toolCall.state.maxIterations).toBeGreaterThan(0);
			}
		});

		it('should pass current execution state to onToolResult', async () => {
			const {options, invocations} =
        createExecuteOptionsWithCallbackTracking();

			await executeAgent(AGENT_WITH_HELPER_TOOLS, options);

			const toolResult = invocations.find((i) => i.type === 'onToolResult');

			if (toolResult?.type === 'onToolResult') {
				expect(toolResult.state.attempt).toBeGreaterThan(0);
				expect(toolResult.state.maxAttempts).toBeGreaterThan(0);
				expect(toolResult.state.iteration).toBeGreaterThan(0);
				expect(toolResult.state.maxIterations).toBeGreaterThan(0);
			}
		});

		it('should increment iteration count across tool callbacks', async () => {
			createMockApiCalls(mockMessagesCreate, [
				{type: 'helper', helperToolName: 'query_data'},
				{type: 'success'},
			]);

			const {options, invocations} =
        createExecuteOptionsWithCallbackTracking();

			await executeAgent(AGENT_WITH_HELPER_TOOLS, options);

			const helperCall = invocations.find(
				(i) => i.type === 'onToolCall' && i.toolName === 'query_data'
			);
			const outputCall = invocations.find(
				(i) => i.type === 'onToolCall' && i.toolName === 'generate_output'
			);

			if (helperCall?.type === 'onToolCall' && outputCall?.type === 'onToolCall') {
				expect(outputCall.state.iteration).toBeGreaterThan(helperCall.state.iteration);
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
			createMockApiCalls(mockMessagesCreate, [
				{type: 'helper', helperToolName: 'query_data'},
				{type: 'success'},
			]);

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
