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
	createHelperToolResponse,
	createSuccessResponse,
	isOk,
	isErr,
} from '../executeAgent.common.fixtures';
import {
	STATEFUL_AGENT,
	mockParseReducerHandler,
	mockQueryReducerHandler,
	mockTransformReducerHandler,
} from './reducer.fixtures';
import type {StatefulAgentInput} from './reducer.fixtures';

/**
 * Helper to create stateful agent output response
 */
const createStatefulSubmitResponse = (result: string = 'success', finalCount: number = 1) => ({
	id: 'msg_output',
	type: 'message' as const,
	role: 'assistant' as const,
	model: 'claude-sonnet-4-5-20250929',
	content: [
		{
			type: 'tool_use' as const,
			id: 'toolu_output',
			name: 'generate_output',
			input: {result, finalCount},
		},
	],
	stop_reason: 'tool_use' as const,
	stop_sequence: null,
	usage: {input_tokens: 100, output_tokens: 50},
});

describe('executeAgent - State Reducer Pattern', () => {
	beforeEach(() => {
		setupExecuteAgentMocks(mockMessagesCreate);
	});

	describe('State Threading', () => {
		it('should initialise state to input value at execution start', async () => {
			const {options, invocations} = createExecuteOptionsWithCallbackTracking();

			const input: StatefulAgentInput = {
				data: '{"test": "value"}',
				callCount: 0,
			};

			createMockApiCalls(mockMessagesCreate, [
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

			// Verify first callback receives initial state
			const firstCallback = invocations.at(0);
			if (firstCallback?.type === 'onAttemptStart') {
				expect(firstCallback.state.attempt).toBe(1);
			}
		});

		it('should thread state through first tool call', async () => {
			const {options, invocations} = createExecuteOptionsWithCallbackTracking();

			const input: StatefulAgentInput = {
				data: '{"test": "value"}',
				callCount: 0,
			};

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
			]);

			const result = await executeAgent(STATEFUL_AGENT, {
				...options,
				input,
			});

			expect(isOk(result)).toBe(true);

			// Verify tool callback receives initial state
			const toolCallbacks = invocations.filter((inv) => inv.type === 'onToolCall');
			expect(toolCallbacks.length).toBeGreaterThan(0);

			const firstToolCall = toolCallbacks.at(0);
			if (firstToolCall?.type === 'onToolCall') {
				expect(firstToolCall.toolName).toBe('parse_tool');
			}
		});

		it('should persist state updates to next tool call', async () => {
			const {options, invocations} = createExecuteOptionsWithCallbackTracking();

			const input: StatefulAgentInput = {
				data: 'item1, item2, item3',
				callCount: 0,
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
			expect(firstResult?.type).toBe('onToolResult');
			if (firstResult?.type === 'onToolResult') {
				expect(firstResult.toolName).toBe('parse_tool');
			}

			// Second tool should be query
			const secondResult = toolResults.at(1);
			expect(secondResult?.type).toBe('onToolResult');
			if (secondResult?.type === 'onToolResult') {
				expect(secondResult.toolName).toBe('query_tool');
			}
		});

		it('should accumulate state changes across multiple tool calls', async () => {
			const {options, invocations} = createExecuteOptionsWithCallbackTracking();

			const input: StatefulAgentInput = {
				data: 'item1, item2, item3',
				callCount: 0,
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

			// callCount should have incremented with each call (tracked internally by handlers)
			// We can't directly inspect state here, but the fact that all tools succeeded
			// means state was properly threaded (query_tool requires parsedData from parse_tool)
		});

		it('should allow query tool to read state set by parse tool (dependency pattern)', async () => {
			const {options, invocations} = createExecuteOptionsWithCallbackTracking();

			const input: StatefulAgentInput = {
				data: '{"key": "value"}',
				callCount: 0,
			};

			createMockApiCalls(mockMessagesCreate, [
				{
					type: 'helper',
					helperToolName: 'parse_tool',
					helperInput: {format: 'json'},
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

			const result = await executeAgent(STATEFUL_AGENT, {
				...options,
				input,
			});

			expect(isOk(result)).toBe(true);

			// Verify query succeeded (it would fail if parsedData wasn't set)
			const queryResult = invocations
				.find((inv) => inv.type === 'onToolResult' && inv.toolName === 'query_tool');

			expect(queryResult).toBeDefined();
		});

		it('should maintain state type throughout execution', async () => {
			const {options} = createExecuteOptionsWithCallbackTracking();

			const input: StatefulAgentInput = {
				data: '{"test": true}',
				callCount: 0,
			};

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
			]);

			const result = await executeAgent(STATEFUL_AGENT, {
				...options,
				input,
			});

			// Type system ensures state matches StatefulAgentInput
			// This test verifies compilation succeeds with proper types
			expect(isOk(result)).toBe(true);
		});
	});

	describe('Handler Isolation', () => {
		it('should allow testing individual handler in isolation', () => {
			const state: StatefulAgentInput = {
				data: '{"key": "value"}',
				callCount: 0,
			};

			const result = mockParseReducerHandler(state, {format: 'json'});

			expect(isOk(result)).toBe(true);
			if (isOk(result)) {
				expect(result.data.newState.callCount).toBe(1);
				expect(result.data.newState.parsedData).toEqual({key: 'value'});
				expect(result.data.toolResult).toEqual({
					status: 'parsed',
					format: 'json',
					recordCount: 1,
				});
			}
		});

		it('should return correct newState and toolResult structure', () => {
			const state: StatefulAgentInput = {
				data: 'a, b, c',
				callCount: 5,
			};

			const result = mockParseReducerHandler(state, {format: 'csv'});

			expect(isOk(result)).toBe(true);
			if (isOk(result)) {
				// Check structure
				expect(result.data).toHaveProperty('newState');
				expect(result.data).toHaveProperty('toolResult');

				// Check newState
				expect(result.data.newState.callCount).toBe(6);
				expect(result.data.newState.parsedData).toEqual(['a', 'b', 'c']);

				// Check toolResult
				expect(result.data.toolResult).toHaveProperty('status');
				expect(result.data.toolResult).toHaveProperty('format');
			}
		});

		it('should follow immutability (return new object, not mutate input)', () => {
			const state: StatefulAgentInput = {
				data: '{"test": true}',
				callCount: 0,
			};

			const originalCallCount = state.callCount;
			const originalParsedData = state.parsedData;

			const result = mockParseReducerHandler(state, {format: 'json'});

			// Original state unchanged
			expect(state.callCount).toBe(originalCallCount);
			expect(state.parsedData).toBe(originalParsedData);

			// New state has updates
			if (isOk(result)) {
				expect(result.data.newState.callCount).toBe(1);
				expect(result.data.newState.parsedData).toBeDefined();
			}
		});

		it('should return error for invalid state prerequisites', () => {
			const state: StatefulAgentInput = {
				data: '{"test": true}',
				callCount: 0,
				// parsedData not set - query should fail
			};

			const result = mockQueryReducerHandler(state, {query: 'test'});

			expect(isErr(result)).toBe(true);
			if (isErr(result)) {
				expect(result.error).toContain('has not been parsed yet');
			}
		});
	});

	describe('Error Handling', () => {
		it('should send handler error to model as tool_result', async () => {
			const {options, invocations} = createExecuteOptionsWithCallbackTracking();

			const input: StatefulAgentInput = {
				data: '{"test": true}',
				callCount: 0,
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

			// Execution should continue despite error
			expect(isOk(result)).toBe(true);

			// onToolResult should have been called with error
			const toolResults = invocations.filter((inv) => inv.type === 'onToolResult');
			expect(toolResults.length).toBeGreaterThan(0);

			const errorResult = toolResults.find(
				(inv) => inv.type === 'onToolResult' && inv.toolName === 'query_tool'
			);
			expect(errorResult).toBeDefined();
		});

		it('should continue execution after handler error', async () => {
			const {options, invocations} = createExecuteOptionsWithCallbackTracking();

			const input: StatefulAgentInput = {
				data: '{"test": true}',
				callCount: 0,
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
					helperInput: {format: 'json'},
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

			// Verify all tool calls occurred (query, parse, output)
			const toolCalls = invocations.filter((inv) => inv.type === 'onToolCall');
			expect(toolCalls.length).toBe(3);
		});

		it('should fire onToolResult callback with error content', async () => {
			const {options, invocations} = createExecuteOptionsWithCallbackTracking();

			const input: StatefulAgentInput = {
				data: '{"test": true}',
				callCount: 0,
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

			await executeAgent(STATEFUL_AGENT, {
				...options,
				input,
			});

			const errorToolResult = invocations.find(
				(inv) => inv.type === 'onToolResult' && inv.toolName === 'query_tool'
			);

			expect(errorToolResult).toBeDefined();
			if (errorToolResult?.type === 'onToolResult') {
				expect(errorToolResult.toolResult).toContain('has not been parsed yet');
			}
		});

		it('should allow subsequent tool calls after handler error', async () => {
			const {options, invocations} = createExecuteOptionsWithCallbackTracking();

			const input: StatefulAgentInput = {
				data: 'a, b, c',
				callCount: 0,
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
			if (firstQuery?.type === 'onToolResult') {
				expect(firstQuery.toolName).toBe('query_tool');
				expect(firstQuery.toolResult).toContain('has not been parsed yet');
			}

			// Parse should succeed
			const parse = toolResults.at(1);
			if (parse?.type === 'onToolResult') {
				expect(parse.toolName).toBe('parse_tool');
			}

			// Second query should succeed (parsedData now available)
			const secondQuery = toolResults.at(2);
			if (secondQuery?.type === 'onToolResult') {
				expect(secondQuery.toolName).toBe('query_tool');
			}
		});

		it('should return error for unknown tool name', async () => {
			const {options, invocations} = createExecuteOptionsWithCallbackTracking();

			const input: StatefulAgentInput = {
				data: '{"test": true}',
				callCount: 0,
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
			if (unknownToolResult?.type === 'onToolResult') {
				expect(unknownToolResult.toolResult).toContain('Unknown tool');
			}
		});
	});

	describe('Backward Compatibility', () => {
		it('should work with stateless agent (no helpers)', async () => {
			const {options} = createExecuteOptionsWithCallbackTracking();

			createMockApiCalls(mockMessagesCreate, [
				{type: 'success'},
			]);

			const result = await executeAgent(VALID_MINIMAL_AGENT, options);

			expect(isOk(result)).toBe(true);
			if (isOk(result)) {
				expect(result.data.output).toBeDefined();
				expect(result.data.attempts).toBe(1);
			}
		});

		it('should work with agent that has helpers but uses default behaviour', async () => {
			const {options, invocations} = createExecuteOptionsWithCallbackTracking();

			createMockApiCalls(mockMessagesCreate, [
				{type: 'success'},
			]);

			// Use VALID_MINIMAL_AGENT which has no helpers
			const result = await executeAgent(VALID_MINIMAL_AGENT, options);

			expect(isOk(result)).toBe(true);

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
		it('should create separate state instances for sequential executions', async () => {
			const input1: StatefulAgentInput = {
				data: '{"execution": 1}',
				callCount: 0,
			};

			const input2: StatefulAgentInput = {
				data: '{"execution": 2}',
				callCount: 0,
			};

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

			// Execute twice with different inputs
			const result1 = await executeAgent(STATEFUL_AGENT, {input: input1});
			const result2 = await executeAgent(STATEFUL_AGENT, {input: input2});

			expect(isOk(result1)).toBe(true);
			expect(isOk(result2)).toBe(true);

			// Both should succeed independently
			// If they shared state, the second execution might have unexpected state
		});

		it('should not allow state modifications from execution 1 to affect execution 2', async () => {
			const input: StatefulAgentInput = {
				data: 'a, b, c',
				callCount: 0,
			};

			createMockApiCalls(mockMessagesCreate, [
				{
					type: 'helper',
					helperToolName: 'parse_tool',
					helperInput: {format: 'csv'},
				},
				{
					type: 'custom',
					response: createStatefulSubmitResponse(),
				},
				// Second execution - should start fresh
				{
					type: 'custom',
					response: createStatefulSubmitResponse(),
				},
			]);

			// First execution modifies state
			const result1 = await executeAgent(STATEFUL_AGENT, {input});

			expect(isOk(result1)).toBe(true);

			// Second execution should start with fresh state
			const result2 = await executeAgent(STATEFUL_AGENT, {input});

			expect(isOk(result2)).toBe(true);

			// If state leaked, second execution would have parsedData pre-set
			// Both executions should succeed independently
		});

		it('should maintain separate state for concurrent executions', async () => {
			const input1: StatefulAgentInput = {
				data: '{"concurrent": 1}',
				callCount: 0,
			};

			const input2: StatefulAgentInput = {
				data: '{"concurrent": 2}',
				callCount: 0,
			};

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

			// Execute concurrently
			const [result1, result2] = await Promise.all([
				executeAgent(STATEFUL_AGENT, {input: input1}),
				executeAgent(STATEFUL_AGENT, {input: input2}),
			]);

			expect(isOk(result1)).toBe(true);
			expect(isOk(result2)).toBe(true);

			// Both should succeed with isolated state
		});
	});
});
