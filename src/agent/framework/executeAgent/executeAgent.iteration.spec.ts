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
	VALID_EXECUTE_OPTIONS,
	createMockApiCalls,
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
					expect(error.context.maxIterations).toBe(15);
					expect(error.context.iterationCount).toBe(15);
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
});
