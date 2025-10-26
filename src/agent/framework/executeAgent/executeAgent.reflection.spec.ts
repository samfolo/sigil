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
	VALID_EXECUTE_OPTIONS,
	createMockApiCalls,
	createOutputThenSubmitResponse,
	createSubmitBeforeOutputResponse,
	isOk,
	isErr,
	AGENT_ERROR_CODES,
} from './executeAgent.common.fixtures';

describe('executeAgent - Reflection Mode', () => {
	beforeEach(() => {
		setupExecuteAgentMocks(mockMessagesCreate);
	});

	it('should execute reflection handler when output tool is called', async () => {
		createMockApiCalls(mockMessagesCreate, [
			{type: 'success'},
			{type: 'submit'},
		]);

		const result = await executeAgent(AGENT_WITH_REFLECTION, VALID_EXECUTE_OPTIONS);

		expect(isOk(result)).toBe(true);
	});

	it('should allow output tool to be called multiple times before submit', async () => {
		createMockApiCalls(mockMessagesCreate, [
			{type: 'success', result: 'first draft'},
			{type: 'success', result: 'second draft'},
			{type: 'success', result: 'final draft'},
			{type: 'custom', response: createOutputThenSubmitResponse('final draft')},
		]);

		const result = await executeAgent(AGENT_WITH_REFLECTION, VALID_EXECUTE_OPTIONS);

		expect(isOk(result)).toBe(true);

		if (isOk(result)) {
			// Should use the last output before submit
			expect(result.data.output.result).toBe('final draft');
		}
	});

	it('should return SUBMIT_BEFORE_OUTPUT error when submit called without output', async () => {
		mockMessagesCreate.mockResolvedValue(createSubmitBeforeOutputResponse());

		const result = await executeAgent(AGENT_WITH_REFLECTION, VALID_EXECUTE_OPTIONS);

		expect(isErr(result)).toBe(true);

		if (isErr(result)) {
			const error = result.error.errors.at(0);
			expect(error?.code).toBe(AGENT_ERROR_CODES.SUBMIT_BEFORE_OUTPUT);
			expect(error?.category).toBe('model');
		}
	});

	it('should pass output to reflection handler for formatting', async () => {
		createMockApiCalls(mockMessagesCreate, [
			{type: 'custom', response: createOutputThenSubmitResponse('test result')},
		]);

		const result = await executeAgent(AGENT_WITH_REFLECTION, VALID_EXECUTE_OPTIONS);

		expect(isOk(result)).toBe(true);
	});

	it('should handle reflection handler returning error', async () => {
		// Output is too short (< 20 chars), should get error from reflection handler
		createMockApiCalls(mockMessagesCreate, [
			{type: 'success', result: 'short'},
			{type: 'custom', response: createOutputThenSubmitResponse('longer result that meets requirements')},
		]);

		const result = await executeAgent(AGENT_WITH_REJECTING_REFLECTION, VALID_EXECUTE_OPTIONS);

		expect(isOk(result)).toBe(true);

		if (isOk(result)) {
			expect(result.data.output.result).toBe('longer result that meets requirements');
		}
	});

	it('should terminate iteration when submit is called', async () => {
		createMockApiCalls(mockMessagesCreate, [
			{type: 'custom', response: createOutputThenSubmitResponse('success result')},
		]);

		const result = await executeAgent(AGENT_WITH_REFLECTION, VALID_EXECUTE_OPTIONS);

		expect(isOk(result)).toBe(true);

		// Verify only one API call was made (output + submit in one response)
		expect(mockMessagesCreate).toHaveBeenCalledTimes(1);
	});

	it('should accumulate tokens across reflection iterations', async () => {
		createMockApiCalls(mockMessagesCreate, [
			{type: 'success', result: 'draft 1', inputTokens: 100, outputTokens: 50},
			{type: 'success', result: 'draft 2', inputTokens: 150, outputTokens: 75},
			{type: 'custom', response: createOutputThenSubmitResponse('final draft', 200, 100)},
		]);

		const result = await executeAgent(AGENT_WITH_REFLECTION, VALID_EXECUTE_OPTIONS);

		expect(isOk(result)).toBe(true);

		if (isOk(result)) {
			expect(result.data.metadata?.tokens?.input).toBe(450);
			expect(result.data.metadata?.tokens?.output).toBe(225);
		}
	});

	it('should bypass reflection handler in non-reflection mode', async () => {
		// VALID_MINIMAL_AGENT doesn't have reflectionHandler
		createMockApiCalls(mockMessagesCreate, [
			{type: 'success'},
		]);

		const result = await executeAgent(VALID_MINIMAL_AGENT, VALID_EXECUTE_OPTIONS);

		expect(isOk(result)).toBe(true);

		// Should have called API only once (no reflection iteration)
		expect(mockMessagesCreate).toHaveBeenCalledTimes(1);
	});

	it('should not inject submit tool in non-reflection mode', async () => {
		createMockApiCalls(mockMessagesCreate, [
			{type: 'success'},
		]);

		await executeAgent(VALID_MINIMAL_AGENT, VALID_EXECUTE_OPTIONS);

		// Check that tools array doesn't include submit
		const firstCall = mockMessagesCreate.mock.calls.at(0);
		const tools = firstCall?.at(0)?.tools;

		expect(tools).toBeDefined();
		expect(tools?.some((tool: {name: string}) => tool.name === 'submit')).toBe(false);
	});

	it('should inject submit tool in reflection mode', async () => {
		mockMessagesCreate.mockResolvedValue(createOutputThenSubmitResponse());

		await executeAgent(AGENT_WITH_REFLECTION, VALID_EXECUTE_OPTIONS);

		// Check that tools array includes submit
		const firstCall = mockMessagesCreate.mock.calls.at(0);
		const tools = firstCall?.at(0)?.tools;

		expect(tools).toBeDefined();
		expect(tools?.some((tool: {name: string}) => tool.name === 'submit')).toBe(true);
	});
});
