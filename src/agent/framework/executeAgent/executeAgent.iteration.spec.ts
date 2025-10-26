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
	DEFAULT_MAX_ITERATIONS,
	VALID_MINIMAL_AGENT,
	VALID_COMPLETE_AGENT,
	AGENT_WITH_HELPER_TOOLS,
	AGENT_WITH_THROWING_HELPER,
	AGENT_WITH_DEFAULT_ITERATION_LIMIT,
	VALID_EXECUTE_OPTIONS,
	createMockApiCalls,
	createExecuteOptionsWithCallbackTracking,
	createMixedToolResponse,
	isOk,
	isErr,
	AGENT_ERROR_CODES,
} from './executeAgent.common.fixtures';

describe('executeAgent - Iteration Loop', () => {
	beforeEach(() => {
		setupExecuteAgentMocks(mockMessagesCreate);
	});

	describe('Helper Tools', () => {
		it('should execute single helper tool and then output tool', async () => {
			createMockApiCalls(mockMessagesCreate, [
				{type: 'helper'},
				{type: 'success'},
			]);

			const result = await executeAgent(AGENT_WITH_HELPER_TOOLS, VALID_EXECUTE_OPTIONS);

			expect(isOk(result)).toBe(true);
		});

		it('should execute multiple helper tools in sequence', async () => {
			createMockApiCalls(mockMessagesCreate, [
				{type: 'helper', helperToolName: 'query_data', helperInput: {query: 'first'}},
				{type: 'helper', helperToolName: 'query_data', helperInput: {query: 'second'}},
				{type: 'success'},
			]);

			const result = await executeAgent(AGENT_WITH_HELPER_TOOLS, VALID_EXECUTE_OPTIONS);

			expect(isOk(result)).toBe(true);
		});

		it('should handle helper tool returning error Result', async () => {
			createMockApiCalls(mockMessagesCreate, [
				{type: 'helper'},
				{type: 'success'},
			]);

			const result = await executeAgent(AGENT_WITH_HELPER_TOOLS, VALID_EXECUTE_OPTIONS);

			// Should still succeed - helper errors don't crash execution
			expect(isOk(result)).toBe(true);
		});

		it('should handle unknown tool gracefully', async () => {
			createMockApiCalls(mockMessagesCreate, [
				{type: 'helper', helperToolName: 'unknown_tool'},
				{type: 'success'},
			]);

			const result = await executeAgent(AGENT_WITH_HELPER_TOOLS, VALID_EXECUTE_OPTIONS);

			// Should still succeed - unknown tools return error result
			expect(isOk(result)).toBe(true);
		});

		it('should accumulate tokens across helper tool iterations', async () => {
			createMockApiCalls(mockMessagesCreate, [
				{type: 'helper', inputTokens: 100, outputTokens: 50},
				{type: 'helper', inputTokens: 120, outputTokens: 60},
				{type: 'success', inputTokens: 150, outputTokens: 75},
			]);

			const result = await executeAgent(VALID_COMPLETE_AGENT, VALID_EXECUTE_OPTIONS);

			if (isOk(result)) {
				expect(result.data.metadata?.tokens?.input).toBe(370);
				expect(result.data.metadata?.tokens?.output).toBe(185);
			}
		});
	});

	describe('Error Cases', () => {
		it('should use default iteration limit of 15 when not specified', async () => {
			createMockApiCalls(mockMessagesCreate, [
				{type: 'helper'},
			]);

			const result = await executeAgent(AGENT_WITH_DEFAULT_ITERATION_LIMIT, VALID_EXECUTE_OPTIONS);

			expect(isErr(result)).toBe(true);

			if (isErr(result)) {
				const error = result.error.errors.at(0);
				expect(error?.code).toBe(AGENT_ERROR_CODES.MAX_ITERATIONS_EXCEEDED);
				if (error?.code === AGENT_ERROR_CODES.MAX_ITERATIONS_EXCEEDED) {
					expect(error.context.maxIterations).toBe(DEFAULT_MAX_ITERATIONS);
					expect(error.context.iterationCount).toBe(DEFAULT_MAX_ITERATIONS);
				}
			}
		});

		it('should return MAX_ITERATIONS_EXCEEDED when iteration limit reached', async () => {
			createMockApiCalls(mockMessagesCreate, [
				{type: 'helper'},
			]);

			const result = await executeAgent(AGENT_WITH_HELPER_TOOLS, VALID_EXECUTE_OPTIONS);

			expect(isErr(result)).toBe(true);

			if (isErr(result)) {
				const error = result.error.errors.at(0);
				expect(error?.code).toBe(AGENT_ERROR_CODES.MAX_ITERATIONS_EXCEEDED);
				expect(error?.category).toBe('execution');
				if (error?.code === AGENT_ERROR_CODES.MAX_ITERATIONS_EXCEEDED) {
					expect(error.context.maxIterations).toBe(DEFAULT_MAX_ITERATIONS);
					expect(error.context.iterationCount).toBe(DEFAULT_MAX_ITERATIONS);
				}
			}
		});

		it('should return OUTPUT_TOOL_NOT_USED when loop exits without output', async () => {
			// Helper tool, then stop_reason: 'end_turn' (not 'tool_use')
			createMockApiCalls(mockMessagesCreate, [
				{type: 'helper'},
				{
					type: 'custom',
					response: {
						id: 'msg_no_output',
						type: 'message',
						role: 'assistant',
						model: 'claude-sonnet-4-5-20250929',
						content: [{type: 'text', text: 'I cannot complete this task'}],
						stop_reason: 'end_turn',
						stop_sequence: null,
						usage: {input_tokens: 100, output_tokens: 50},
					},
				},
			]);

			const result = await executeAgent(VALID_MINIMAL_AGENT, VALID_EXECUTE_OPTIONS);

			expect(isErr(result)).toBe(true);

			if (isErr(result)) {
				const error = result.error.errors.at(0);
				expect(error?.code).toBe(AGENT_ERROR_CODES.OUTPUT_TOOL_NOT_USED);
				expect(error?.category).toBe('model');
				if (error?.code === AGENT_ERROR_CODES.OUTPUT_TOOL_NOT_USED) {
					expect(error.context.iterationCount).toBeGreaterThan(0);
					expect(error.context.expectedTool).toBe('generate_output');
				}
			}
		});
	});

	describe('Handler Exception Safety', () => {
		it('should handle helper handler that throws exception', async () => {
			createMockApiCalls(mockMessagesCreate, [
				{type: 'helper', helperToolName: 'throwing_tool'},
				{type: 'success'},
			]);

			const result = await executeAgent(AGENT_WITH_THROWING_HELPER, VALID_EXECUTE_OPTIONS);

			// Should still succeed - exception caught and returned as error tool result
			expect(isOk(result)).toBe(true);
		});

		it('should pass error message to model when helper handler throws', async () => {
			createMockApiCalls(mockMessagesCreate, [
				{type: 'helper', helperToolName: 'throwing_tool'},
				{type: 'success'},
			]);

			await executeAgent(AGENT_WITH_THROWING_HELPER, VALID_EXECUTE_OPTIONS);

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
					expect(toolResult.content).toContain('Handler threw exception');
				}
			}
		});

		it('should mark tool result as error when helper handler throws', async () => {
			createMockApiCalls(mockMessagesCreate, [
				{type: 'helper', helperToolName: 'throwing_tool'},
				{type: 'success'},
			]);

			await executeAgent(AGENT_WITH_THROWING_HELPER, VALID_EXECUTE_OPTIONS);

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

		it('should invoke onToolResult callback when helper handler throws', async () => {
			createMockApiCalls(mockMessagesCreate, [
				{type: 'helper', helperToolName: 'throwing_tool'},
				{type: 'success'},
			]);

			const {options, invocations} = createExecuteOptionsWithCallbackTracking();

			await executeAgent(AGENT_WITH_THROWING_HELPER, options);

			// Should have called onToolResult with error
			const toolResults = invocations.filter((i) => i.type === 'onToolResult');
			expect(toolResults.length).toBeGreaterThan(0);

			const helperResult = toolResults.find((result) => {
				if (result.type === 'onToolResult') {
					return result.toolName === 'throwing_tool';
				}
				return false;
			});

			if (helperResult?.type === 'onToolResult') {
				expect(helperResult.toolResult).toContain('Error:');
				expect(helperResult.toolResult).toContain('Handler threw exception');
			}
		});
	});

	describe('Mixed Tool Uses', () => {
		it('should process helper + output + helper in single response', async () => {
			createMockApiCalls(mockMessagesCreate, [
				{type: 'custom', response: createMixedToolResponse('test result')},
			]);

			const result = await executeAgent(AGENT_WITH_HELPER_TOOLS, VALID_EXECUTE_OPTIONS);

			expect(isOk(result)).toBe(true);

			if (isOk(result)) {
				expect(result.data.output.result).toBe('test result');
			}
		});

		it('should execute all tool handlers in mixed response', async () => {
			createMockApiCalls(mockMessagesCreate, [
				{type: 'custom', response: createMixedToolResponse('test result')},
			]);

			const {options, invocations} = createExecuteOptionsWithCallbackTracking();

			await executeAgent(AGENT_WITH_HELPER_TOOLS, options);

			// Should have called both helper tools and output tool
			const toolCalls = invocations.filter((i) => i.type === 'onToolCall');

			const helper1 = toolCalls.find((call) => {
				if (call.type === 'onToolCall' && call.toolName === 'query_data') {
					return call.toolInput && typeof call.toolInput === 'object' && 'query' in call.toolInput && call.toolInput.query === 'first query';
				}
				return false;
			});

			const outputCall = toolCalls.find((call) => {
				if (call.type === 'onToolCall') {
					return call.toolName === 'generate_output';
				}
				return false;
			});

			const helper2 = toolCalls.find((call) => {
				if (call.type === 'onToolCall' && call.toolName === 'query_data') {
					return call.toolInput && typeof call.toolInput === 'object' && 'query' in call.toolInput && call.toolInput.query === 'second query';
				}
				return false;
			});

			expect(helper1).toBeDefined();
			expect(outputCall).toBeDefined();
			expect(helper2).toBeDefined();
		});

		it('should terminate after processing all tools when output is present', async () => {
			createMockApiCalls(mockMessagesCreate, [
				{type: 'custom', response: createMixedToolResponse('test result')},
			]);

			const result = await executeAgent(AGENT_WITH_HELPER_TOOLS, VALID_EXECUTE_OPTIONS);

			expect(isOk(result)).toBe(true);

			// Should only make one API call - iteration terminates after output tool
			expect(mockMessagesCreate).toHaveBeenCalledTimes(1);
		});
	});
});
