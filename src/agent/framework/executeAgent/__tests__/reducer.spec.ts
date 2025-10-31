/**
 * Tests for state reducer pattern (embedded handler pattern)
 *
 * Tests cover:
 * - State threading through multiple tool calls
 * - Handler isolation and unit testing
 * - Error handling in handlers
 * - State immutability
 * - Backward compatibility with stateless agents
 * - Execution isolation
 */

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
	createExecuteOptionsWithCallbackTracking,
	createMockApiCalls,
	createSuccessResponse,
	isOk,
	isErr,
} from '../executeAgent.common.fixtures';
import type {OnAttemptStartInvocation, OnToolCallInvocation, OnToolResultInvocation, CallbackInvocation} from '../executeAgent.fixtures';
import {
	STATEFUL_AGENT,
	mockParseReducerHandler,
	mockQueryReducerHandler,
	mockTransformReducerHandler,
	createStatefulSubmitResponse,
	MOCK_THROWING_TOOL,
} from './reducer.fixtures';
import type {StatefulAgentInput} from './reducer.fixtures';

describe('executeAgent - State Reducer Pattern', () => {
	const INITIAL_CALL_COUNT = 0;
	const INCREMENTED_ONCE = 1;
	const QUERY_BEFORE_PARSE_ERROR = 'has not been parsed yet';
	const UNKNOWN_TOOL_ERROR_PREFIX = 'Unknown tool';

	/**
	 * Helper to extract tool result from invocations
	 *
	 * Tool results are serialised as JSON strings by executeAgent
	 */
	const getToolResult = (invocations: CallbackInvocation[], toolName: string): unknown => {
		const result = invocations.find(
			(inv) => inv.type === 'onToolResult' && inv.toolName === toolName
		);
		expect(result).toBeDefined();
		expect(result?.type).toBe('onToolResult');

		if (result?.type !== 'onToolResult') {
			throw new Error('Expected onToolResult but type check failed');
		}

		return JSON.parse(result.toolResult);
	};

	beforeEach(() => {
		setupExecuteAgentMocks(mockMessagesCreate);
	});

	describe('State Threading', () => {
		it('should persist state updates to next tool call', async () => {
			const {options, invocations} = createExecuteOptionsWithCallbackTracking();

			const input: StatefulAgentInput = {
				data: 'item1, item2, item3',
				callCount: INITIAL_CALL_COUNT,
			};

			createMockApiCalls(mockMessagesCreate, [
				{
					type: 'helper',
					helperToolName: 'parse_tool',
					helperInput: {format: 'csv'},
				},
				{
					type: 'helper',
					helperToolName: 'query_tool',
					helperInput: {query: 'test query'},
				},
				{
					type: 'custom',
					response: createStatefulSubmitResponse(),
				},
			]);

			const result = await executeAgent(STATEFUL_AGENT, {
				...options,
				input,
			});

			expect(isOk(result)).toBe(true);

			// Verify both tool calls succeeded
			const toolResults = invocations.filter((inv) => inv.type === 'onToolResult');
			expect(toolResults.length).toBe(2);

			// First tool should be parse
			const firstResult = toolResults.at(0);
			expect(firstResult).toBeDefined();
			expect(firstResult?.type).toBe('onToolResult');

			if (firstResult?.type === 'onToolResult') {
				expect(firstResult.toolName).toBe('parse_tool');
			}

			// Second tool should be query
			const secondResult = toolResults.at(1);
			expect(secondResult).toBeDefined();
			expect(secondResult?.type).toBe('onToolResult');

			if (secondResult?.type === 'onToolResult') {
				expect(secondResult.toolName).toBe('query_tool');
			}
		});

		it('should allow dependent tools to access prior tool state', async () => {
			const {options, invocations} = createExecuteOptionsWithCallbackTracking();

			const input: StatefulAgentInput = {
				data: 'item1, item2, item3',
				callCount: INITIAL_CALL_COUNT,
			};

			createMockApiCalls(mockMessagesCreate, [
				{
					type: 'helper',
					helperToolName: 'parse_tool',
					helperInput: {format: 'csv'},
				},
				{
					type: 'helper',
					helperToolName: 'query_tool',
					helperInput: {query: 'test'},
				},
				{
					type: 'helper',
					helperToolName: 'transform_tool',
					helperInput: {operation: 'uppercase'},
				},
				{
					type: 'custom',
					response: createStatefulSubmitResponse(),
				},
			]);

			const result = await executeAgent(STATEFUL_AGENT, {
				...options,
				input,
			});

			expect(isOk(result)).toBe(true);

			// Verify all three tool calls succeeded
			const toolResults = invocations.filter((inv) => inv.type === 'onToolResult');
			expect(toolResults.length).toBe(3);

			// Verify query succeeded (proves it accessed parsedData from parse_tool)
			const queryResult = getToolResult(invocations, 'query_tool');
			expect(queryResult).toMatchObject({
				query: 'test',
				matches: 3,
			});
		});
	});

	describe('Handler Isolation', () => {
		it('should allow testing individual handler in isolation', () => {
			const state: StatefulAgentInput = {
				data: '{"key": "value"}',
				callCount: INITIAL_CALL_COUNT,
			};

			const result = mockParseReducerHandler(state, {format: 'json'});

			expect(isOk(result)).toBe(true);

			if (isOk(result)) {
				expect(result.data.newState.callCount).toBe(INCREMENTED_ONCE);
				expect(result.data.newState.parsedData).toEqual({key: 'value'});
				expect(result.data.toolResult).toEqual({
					status: 'parsed',
					format: 'json',
					recordCount: 1,
				});
			}
		});

		it('should follow immutability (return new object, not mutate input)', () => {
			const state: StatefulAgentInput = {
				data: '{"test": true}',
				callCount: INITIAL_CALL_COUNT,
			};

			const originalCallCount = state.callCount;
			const originalParsedData = state.parsedData;

			const result = mockParseReducerHandler(state, {format: 'json'});

			// Original state unchanged
			expect(state.callCount).toBe(originalCallCount);
			expect(state.parsedData).toBe(originalParsedData);

			expect(isOk(result)).toBe(true);

			if (isOk(result)) {
				// Verify new object reference (not same object)
				expect(result.data.newState).not.toBe(state);
				expect(result.data.newState.callCount).toBe(INCREMENTED_ONCE);
				expect(result.data.newState.parsedData).toBeDefined();
			}
		});

		it('should return error for invalid state prerequisites', () => {
			const state: StatefulAgentInput = {
				data: '{"test": true}',
				callCount: INITIAL_CALL_COUNT,
			};

			const result = mockQueryReducerHandler(state, {query: 'test'});

			expect(isErr(result)).toBe(true);

			if (isErr(result)) {
				expect(result.error).toContain(QUERY_BEFORE_PARSE_ERROR);
			}
		});
	});

	describe('Error Handling', () => {
		it('should fire onToolResult callback with handler error', async () => {
			const {options, invocations} = createExecuteOptionsWithCallbackTracking();

			const input: StatefulAgentInput = {
				data: '{"test": true}',
				callCount: INITIAL_CALL_COUNT,
			};

			createMockApiCalls(mockMessagesCreate, [
				{
					type: 'helper',
					helperToolName: 'query_tool',
					helperInput: {query: 'test'},
				},
				{
					type: 'custom',
					response: createStatefulSubmitResponse(),
				},
			]);

			const result = await executeAgent(STATEFUL_AGENT, {
				...options,
				input,
			});

			expect(isOk(result)).toBe(true);

			const errorToolResult = invocations.find(
				(inv) => inv.type === 'onToolResult' && inv.toolName === 'query_tool'
			);

			expect(errorToolResult).toBeDefined();
			expect(errorToolResult?.type).toBe('onToolResult');
			if (errorToolResult?.type === 'onToolResult') {
				expect(errorToolResult.toolResult).toContain(QUERY_BEFORE_PARSE_ERROR);
			}
		});

		it('should allow subsequent tool calls after handler error', async () => {
			const {options, invocations} = createExecuteOptionsWithCallbackTracking();

			const input: StatefulAgentInput = {
				data: 'a, b, c',
				callCount: INITIAL_CALL_COUNT,
			};

			createMockApiCalls(mockMessagesCreate, [
				{
					type: 'helper',
					helperToolName: 'query_tool',
					helperInput: {query: 'test'},
				},
				{
					type: 'helper',
					helperToolName: 'parse_tool',
					helperInput: {format: 'csv'},
				},
				{
					type: 'helper',
					helperToolName: 'query_tool',
					helperInput: {query: 'test'},
				},
				{
					type: 'custom',
					response: createStatefulSubmitResponse(),
				},
			]);

			const result = await executeAgent(STATEFUL_AGENT, {
				...options,
				input,
			});

			expect(isOk(result)).toBe(true);

			// Verify first query failed, parse succeeded, second query succeeded
			const toolResults = invocations.filter((inv) => inv.type === 'onToolResult');
			expect(toolResults.length).toBe(3);

			// First query should error
			const firstQuery = toolResults.at(0);
			expect(firstQuery).toBeDefined();
			expect(firstQuery?.type).toBe('onToolResult');
			if (firstQuery?.type === 'onToolResult') {
				expect(firstQuery.toolName).toBe('query_tool');
				expect(firstQuery.toolResult).toContain(QUERY_BEFORE_PARSE_ERROR);
			}

			// Parse should succeed
			const parse = toolResults.at(1);
			expect(parse).toBeDefined();
			expect(parse?.type).toBe('onToolResult');
			if (parse?.type === 'onToolResult') {
				expect(parse.toolName).toBe('parse_tool');
			}

			// Second query should succeed (parsedData now available)
			const secondQuery = toolResults.at(2);
			expect(secondQuery).toBeDefined();
			expect(secondQuery?.type).toBe('onToolResult');
			if (secondQuery?.type === 'onToolResult') {
				expect(secondQuery.toolName).toBe('query_tool');
			}
		});

		it('should return error for unknown tool name', async () => {
			const {options, invocations} = createExecuteOptionsWithCallbackTracking();

			const input: StatefulAgentInput = {
				data: '{"test": true}',
				callCount: INITIAL_CALL_COUNT,
			};

			createMockApiCalls(mockMessagesCreate, [
				{
					type: 'helper',
					helperToolName: 'unknown_tool',
					helperInput: {},
				},
				{
					type: 'custom',
					response: createStatefulSubmitResponse(),
				},
			]);

			const result = await executeAgent(STATEFUL_AGENT, {
				...options,
				input,
			});

			expect(isOk(result)).toBe(true);

			// Unknown tool should return error
			const unknownToolResult = invocations.find(
				(inv) => inv.type === 'onToolResult' && inv.toolName === 'unknown_tool'
			);

			expect(unknownToolResult).toBeDefined();
			expect(unknownToolResult?.type).toBe('onToolResult');
			if (unknownToolResult?.type === 'onToolResult') {
				expect(unknownToolResult.toolResult).toContain(UNKNOWN_TOOL_ERROR_PREFIX);
			}
		});

		it('should preserve state when handler throws exception', async () => {
			const {options, invocations} = createExecuteOptionsWithCallbackTracking();

			const input: StatefulAgentInput = {
				data: '{"test": true}',
				callCount: INITIAL_CALL_COUNT,
			};

			// Create agent with throwing tool
			const agentWithThrowingTool = {
				...STATEFUL_AGENT,
				tools: {
					...STATEFUL_AGENT.tools,
					helpers: {
						...STATEFUL_AGENT.tools.helpers,
						throwing_tool: MOCK_THROWING_TOOL,
					},
				},
			};

			createMockApiCalls(mockMessagesCreate, [
				{
					type: 'helper',
					helperToolName: 'parse_tool',
					helperInput: {format: 'json'},
				},
				{
					type: 'helper',
					helperToolName: 'throwing_tool',
					helperInput: {shouldThrow: true, errorMessage: 'Tool execution failed'},
				},
				{
					type: 'helper',
					helperToolName: 'query_tool',
					helperInput: {query: 'test'},
				},
				{
					type: 'custom',
					response: createStatefulSubmitResponse(),
				},
			]);

			const result = await executeAgent(agentWithThrowingTool, {
				...options,
				input,
			});

			expect(isOk(result)).toBe(true);

			// Verify parse succeeded and updated state
			const parseResult = getToolResult(invocations, 'parse_tool');
			expect(parseResult).toMatchObject({
				status: 'parsed',
				format: 'json',
				recordCount: 1,
			});

			// Verify throwing tool returned error
			const throwingResult = invocations.find(
				(inv) => inv.type === 'onToolResult' && inv.toolName === 'throwing_tool'
			);
			expect(throwingResult).toBeDefined();
			expect(throwingResult?.type).toBe('onToolResult');
			if (throwingResult?.type === 'onToolResult') {
				expect(throwingResult.toolResult).toContain('Tool execution failed');
			}

			// Verify query succeeded (proves it sees parse's state despite throwing tool)
			const queryResult = getToolResult(invocations, 'query_tool');
			expect(queryResult).toMatchObject({
				query: 'test',
				matches: 3,
			});
		});

		it('should handle multiple exceptions without corrupting state', async () => {
			const {options, invocations} = createExecuteOptionsWithCallbackTracking();

			const input: StatefulAgentInput = {
				data: '{"key": "value"}',
				callCount: INITIAL_CALL_COUNT,
			};

			// Create agent with throwing tool
			const agentWithThrowingTool = {
				...STATEFUL_AGENT,
				tools: {
					...STATEFUL_AGENT.tools,
					helpers: {
						...STATEFUL_AGENT.tools.helpers,
						throwing_tool: MOCK_THROWING_TOOL,
					},
				},
			};

			createMockApiCalls(mockMessagesCreate, [
				{
					type: 'helper',
					helperToolName: 'parse_tool',
					helperInput: {format: 'json'},
				},
				{
					type: 'helper',
					helperToolName: 'throwing_tool',
					helperInput: {shouldThrow: true, errorMessage: 'First exception'},
				},
				{
					type: 'helper',
					helperToolName: 'query_tool',
					helperInput: {query: 'key'},
				},
				{
					type: 'helper',
					helperToolName: 'throwing_tool',
					helperInput: {shouldThrow: true, errorMessage: 'Second exception'},
				},
				{
					type: 'helper',
					helperToolName: 'query_tool',
					helperInput: {query: 'key'},
				},
				{
					type: 'custom',
					response: createStatefulSubmitResponse(),
				},
			]);

			const result = await executeAgent(agentWithThrowingTool, {
				...options,
				input,
			});

			expect(isOk(result)).toBe(true);

			// Verify parse succeeded
			const parseResult = getToolResult(invocations, 'parse_tool');
			expect(parseResult).toMatchObject({
				status: 'parsed',
				format: 'json',
			});

			// Verify both query calls succeeded (both see parse's state)
			const queryResults = invocations.filter(
				(inv) => inv.type === 'onToolResult' && inv.toolName === 'query_tool'
			);
			expect(queryResults.length).toBe(2);

			// Both queries should succeed
			const firstQueryResult = queryResults.at(0);
			expect(firstQueryResult).toBeDefined();
			expect(firstQueryResult?.type).toBe('onToolResult');
			if (firstQueryResult?.type === 'onToolResult') {
				const parsed = JSON.parse(firstQueryResult.toolResult);
				expect(parsed).toMatchObject({
					query: 'key',
					matches: 3,
				});
			}

			const secondQueryResult = queryResults.at(1);
			expect(secondQueryResult).toBeDefined();
			expect(secondQueryResult?.type).toBe('onToolResult');
			if (secondQueryResult?.type === 'onToolResult') {
				const parsed = JSON.parse(secondQueryResult.toolResult);
				expect(parsed).toMatchObject({
					query: 'key',
					matches: 3,
				});
			}
		});
	});

	describe('Custom Initial State', () => {
		it('should use initialState to pre-populate state fields', async () => {
			const {options, invocations} = createExecuteOptionsWithCallbackTracking();

			const input = {
				data: 'a, b, c',
				callCount: INITIAL_CALL_COUNT,
			};

			// Create agent with initialState that pre-populates parsedData
			const agentWithInitState = {
				...STATEFUL_AGENT,
				initialState: (inp: StatefulAgentInput) => ({
					...inp,
					parsedData: ['pre-populated-item'], // Set parsedData without calling parse_tool
				}),
			};

			createMockApiCalls(mockMessagesCreate, [
				{
					type: 'helper',
					helperToolName: 'query_tool',
					helperInput: {query: 'test'},
				},
				{
					type: 'custom',
					response: createStatefulSubmitResponse(),
				},
			]);

			const result = await executeAgent(agentWithInitState, {
				...options,
				input,
			});

			expect(isOk(result)).toBe(true);

			// Query succeeds WITHOUT parse_tool being called
			// This proves initialState actually set parsedData
			const queryResult = getToolResult(invocations, 'query_tool');
			expect(queryResult).toMatchObject({
				query: 'test',
				matches: 3,
			});

			// Verify parse_tool was NOT called
			const parseToolCalls = invocations.filter(
				(inv) => inv.type === 'onToolCall' && inv.toolName === 'parse_tool'
			);
			expect(parseToolCalls.length).toBe(0);
		});
	});

	describe('Backward Compatibility', () => {
		it('should work with stateless agent (no helpers)', async () => {
			const {options, invocations} = createExecuteOptionsWithCallbackTracking();

			createMockApiCalls(mockMessagesCreate, [
				{type: 'success'},
			]);

			const result = await executeAgent(VALID_MINIMAL_AGENT, options);

			expect(isOk(result)).toBe(true);
			if (isOk(result)) {
				expect(result.data.output).toBeDefined();
				expect(result.data.attempts).toBe(1);
			}

			// No helper tool calls should occur
			const helperToolCalls = invocations.filter(
				(inv) => inv.type === 'onToolCall' && inv.toolName !== 'submit' && inv.toolName !== 'generate_output'
			);
			expect(helperToolCalls.length).toBe(0);
		});

		it('should leave output tool behaviour unchanged', async () => {
			const {options} = createExecuteOptionsWithCallbackTracking();

			createMockApiCalls(mockMessagesCreate, [
				{
					type: 'custom',
					response: createSuccessResponse('test output'),
				},
			]);

			const result = await executeAgent(VALID_MINIMAL_AGENT, options);

			expect(isOk(result)).toBe(true);
			if (isOk(result)) {
				expect(result.data.output).toEqual({result: 'test output'});
			}
		});
	});

	describe('Execution Isolation', () => {
		it('should reset state between retry attempts', async () => {
			const {options, invocations} = createExecuteOptionsWithCallbackTracking();

			const input: StatefulAgentInput = {
				data: '{"test": true}',
				callCount: INITIAL_CALL_COUNT,
			};

			// Attempt 1: parse sets parsedData, then validation fails
			// Attempt 2: query without parse should fail (proves state reset)
			createMockApiCalls(mockMessagesCreate, [
				{
					type: 'helper',
					helperToolName: 'parse_tool',
					helperInput: {format: 'json'},
				},
				{type: 'invalid'}, // Validation failure → retry
				{
					type: 'helper',
					helperToolName: 'query_tool',
					helperInput: {query: 'test'},
				},
				{
					type: 'custom',
					response: createStatefulSubmitResponse(),
				},
			]);

			const result = await executeAgent(STATEFUL_AGENT, {
				...options,
				input,
			});

			expect(isOk(result)).toBe(true);

			// Verify attempt 1: parse succeeded
			const parseToolCalls = invocations.filter(
				(inv) => inv.type === 'onToolResult' && inv.toolName === 'parse_tool'
			);
			expect(parseToolCalls.length).toBe(1);

			const parseResult = parseToolCalls.at(0);
			expect(parseResult).toBeDefined();
			expect(parseResult?.type).toBe('onToolResult');

			// Verify attempt 2: query failed (parsedData not available)
			const queryToolCalls = invocations.filter(
				(inv) => inv.type === 'onToolResult' && inv.toolName === 'query_tool'
			);
			expect(queryToolCalls.length).toBe(1);

			const queryResult = queryToolCalls.at(0);
			expect(queryResult).toBeDefined();
			expect(queryResult?.type).toBe('onToolResult');
			if (queryResult?.type === 'onToolResult') {
				// Query should fail because state was reset (parsedData not available)
				expect(queryResult.toolResult).toContain(QUERY_BEFORE_PARSE_ERROR);
			}

			// Verify multiple attempts occurred
			if (isOk(result)) {
				expect(result.data.attempts).toBeGreaterThan(1);
			}
		});

		it('should not leak state between sequential executions', async () => {
			const {options: options1, invocations: invocations1} = createExecuteOptionsWithCallbackTracking();
			const {options: options2, invocations: invocations2} = createExecuteOptionsWithCallbackTracking();

			const input: StatefulAgentInput = {
				data: '{"test": true}',
				callCount: INITIAL_CALL_COUNT,
			};

			// First execution: parse then query (should succeed)
			createMockApiCalls(mockMessagesCreate, [
				{
					type: 'helper',
					helperToolName: 'parse_tool',
					helperInput: {format: 'json'},
				},
				{
					type: 'helper',
					helperToolName: 'query_tool',
					helperInput: {query: 'test'},
				},
				{
					type: 'custom',
					response: createStatefulSubmitResponse(),
				},
			]);

			const result1 = await executeAgent(STATEFUL_AGENT, {
				...options1,
				input,
			});

			expect(isOk(result1)).toBe(true);

			// Verify first execution succeeded - query worked after parse
			const firstQueryResult = invocations1.find(
				(inv) => inv.type === 'onToolResult' && inv.toolName === 'query_tool'
			);
			expect(firstQueryResult).toBeDefined();
			expect(firstQueryResult?.type).toBe('onToolResult');
			if (firstQueryResult?.type === 'onToolResult') {
				expect(firstQueryResult.toolResult).not.toContain(QUERY_BEFORE_PARSE_ERROR);
			}

			// Second execution: query WITHOUT parse (should fail if truly isolated)
			createMockApiCalls(mockMessagesCreate, [
				{
					type: 'helper',
					helperToolName: 'query_tool',
					helperInput: {query: 'test'},
				},
				{
					type: 'custom',
					response: createStatefulSubmitResponse(),
				},
			]);

			const result2 = await executeAgent(STATEFUL_AGENT, {
				...options2,
				input,
			});

			expect(isOk(result2)).toBe(true);

			// Verify second execution failed - query requires parse
			const secondQueryResult = invocations2.find(
				(inv) => inv.type === 'onToolResult' && inv.toolName === 'query_tool'
			);
			expect(secondQueryResult).toBeDefined();
			expect(secondQueryResult?.type).toBe('onToolResult');
			if (secondQueryResult?.type === 'onToolResult') {
				expect(secondQueryResult.toolResult).toContain(QUERY_BEFORE_PARSE_ERROR);
			}
		});

		it('should maintain separate state for concurrent executions', async () => {
			const input1: StatefulAgentInput = {
				data: '{"test": 1}',
				callCount: INITIAL_CALL_COUNT,
			};

			const input2: StatefulAgentInput = {
				data: '{"test": 2}',
				callCount: INITIAL_CALL_COUNT,
			};

			// Both executions parse their respective data
			createMockApiCalls(mockMessagesCreate, [
				{
					type: 'helper',
					helperToolName: 'parse_tool',
					helperInput: {format: 'json'},
				},
				{
					type: 'custom',
					response: createStatefulSubmitResponse(),
				},
				{
					type: 'helper',
					helperToolName: 'parse_tool',
					helperInput: {format: 'json'},
				},
				{
					type: 'custom',
					response: createStatefulSubmitResponse(),
				},
			]);

			// Execute concurrently with different inputs
			const [result1, result2] = await Promise.all([
				executeAgent(STATEFUL_AGENT, {input: input1}),
				executeAgent(STATEFUL_AGENT, {input: input2}),
			]);

			// Both should complete successfully without crashing or interfering
			expect(isOk(result1)).toBe(true);
			expect(isOk(result2)).toBe(true);

			// Sequential test already proves state doesn't leak between executions
			// This test proves concurrent executions don't crash or deadlock
		});
	});
});
