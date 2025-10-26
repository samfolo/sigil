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
	VALID_EXECUTE_OPTIONS,
	EXPECTED_SUCCESS,
	isOk,
	isErr,
	AGENT_ERROR_CODES,
} from './executeAgent.common.fixtures';

describe('executeAgent - Basic', () => {
	beforeEach(() => {
		setupExecuteAgentMocks(mockMessagesCreate);
	});

	describe('Type Safety', () => {
		it('should preserve generic type parameters', async () => {
			const result = await executeAgent(
				VALID_MINIMAL_AGENT,
				VALID_EXECUTE_OPTIONS
			);

			// Type narrowing should work correctly with isErr
			if (isErr(result)) {
				// If types are preserved correctly, this should compile without errors
				const failure = result.error;
				const errors = failure.errors;
				const firstError = errors.at(0);

				expect(Array.isArray(errors)).toBe(true);
				expect(firstError).toBeDefined();
			} else {
				// If types are preserved correctly, this should compile without errors
				const output = result.data.output;
				const attempts = result.data.attempts;

				expect(output).toBeDefined();
				expect(typeof attempts).toBe('number');
			}
		});
	});

	describe('Successful execution', () => {
		it('should return success Result on first attempt', async () => {
			const result = await executeAgent(
				VALID_MINIMAL_AGENT,
				VALID_EXECUTE_OPTIONS
			);

			expect(isOk(result)).toBe(true);

			if (isOk(result)) {
				expect(result.data.output).toBeDefined();
				expect(result.data.attempts).toBe(1);
			}
		});

		it('should include output in ExecuteSuccess', async () => {
			const result = await executeAgent(
				VALID_MINIMAL_AGENT,
				VALID_EXECUTE_OPTIONS
			);

			expect(isOk(result)).toBe(true);

			if (isOk(result)) {
				expect(result.data.output).toEqual(EXPECTED_SUCCESS.output);
				expect(result.data.output.result).toBe('success result');
			}
		});

		it('should track attempts correctly', async () => {
			const result = await executeAgent(
				VALID_MINIMAL_AGENT,
				VALID_EXECUTE_OPTIONS
			);

			expect(isOk(result)).toBe(true);

			if (isOk(result)) {
				expect(result.data.attempts).toBe(1);
				expect(result.data.attempts).toBeGreaterThan(0);
				expect(result.data.attempts).toBeLessThanOrEqual(3);
			}
		});

		it('should populate metadata (latency, tokens)', async () => {
			// Use VALID_COMPLETE_AGENT which has observability enabled
			const result = await executeAgent(
				VALID_COMPLETE_AGENT,
				VALID_EXECUTE_OPTIONS
			);

			expect(isOk(result)).toBe(true);

			if (isOk(result)) {
				expect(result.data.metadata).toBeDefined();
				expect(result.data.metadata?.latency).toBeTypeOf('number');
				expect(result.data.metadata?.tokens).toBeDefined();
				expect(result.data.metadata?.tokens?.input).toBeTypeOf('number');
				expect(result.data.metadata?.tokens?.output).toBeTypeOf('number');
			}
		});
	});

	describe('Edge cases', () => {
		it('should handle API errors gracefully', async () => {
			// Mock API error
			mockMessagesCreate.mockRejectedValueOnce(new Error('API connection failed'));

			const result = await executeAgent(
				VALID_MINIMAL_AGENT,
				VALID_EXECUTE_OPTIONS
			);

			expect(isErr(result)).toBe(true);

			if (isErr(result)) {
				const error = result.error.errors.at(0);
				expect(error?.code).toBe(AGENT_ERROR_CODES.API_ERROR);
				expect(error?.category).toBe('model');
			}
		});

		it('should handle missing tool use in response', async () => {
			// Mock response without tool_use
			mockMessagesCreate.mockResolvedValueOnce({
				id: 'msg_test',
				type: 'message',
				role: 'assistant',
				model: 'claude-sonnet-4-5-20250929',
				content: [
					{
						type: 'text',
						text: 'I cannot use the tool',
					},
				],
				stop_reason: 'end_turn',
				stop_sequence: null,
				usage: {
					input_tokens: 100,
					output_tokens: 50,
				},
			});

			const result = await executeAgent(
				VALID_MINIMAL_AGENT,
				VALID_EXECUTE_OPTIONS
			);

			expect(isErr(result)).toBe(true);

			if (isErr(result)) {
				const error = result.error.errors.at(0);
				expect(error?.code).toBe(AGENT_ERROR_CODES.OUTPUT_TOOL_NOT_USED);
				expect(error?.category).toBe('model');
			}
		});

		it('should handle wrong tool name in response', async () => {
			// Mock response with wrong tool name
			mockMessagesCreate.mockResolvedValueOnce({
				id: 'msg_test',
				type: 'message',
				role: 'assistant',
				model: 'claude-sonnet-4-5-20250929',
				content: [
					{
						type: 'tool_use',
						id: 'toolu_test',
						name: 'wrong_tool',
						input: {result: 'test'},
					},
				],
				stop_reason: 'end_turn',
				stop_sequence: null,
				usage: {
					input_tokens: 100,
					output_tokens: 50,
				},
			});

			const result = await executeAgent(
				VALID_MINIMAL_AGENT,
				VALID_EXECUTE_OPTIONS
			);

			expect(isErr(result)).toBe(true);

			if (isErr(result)) {
				const error = result.error.errors.at(0);
				expect(error?.code).toBe(AGENT_ERROR_CODES.OUTPUT_TOOL_NOT_USED);
			}
		});

		it('should include metadata even on failures', async () => {
			// Mock API error
			mockMessagesCreate.mockRejectedValueOnce(new Error('API error'));

			const result = await executeAgent(
				VALID_COMPLETE_AGENT,
				VALID_EXECUTE_OPTIONS
			);

			expect(isErr(result)).toBe(true);

			if (isErr(result)) {
				// Metadata should still be populated for observability
				expect(result.error.metadata).toBeDefined();
				expect(result.error.metadata?.latency).toBeTypeOf('number');
			}
		});
	});
});
