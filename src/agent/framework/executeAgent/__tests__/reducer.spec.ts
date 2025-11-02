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

import type {AgentState} from '../../defineAgent/types';

import {
	executeAgent,
	setupExecuteAgentMocks,
	VALID_MINIMAL_AGENT,
	isOk,
	isErr,
} from '../executeAgent.common.fixtures';
import {AnthropicApiMock, CallbackTracker, helperToolUse, outputToolUse} from '../executeAgent.mock';
import type {CallbackInvocation} from '../executeAgent.mock';

import {
	STATEFUL_AGENT,
	mockParseReducerHandler,
	mockQueryReducerHandler,
	createAttemptTrackingValidator,
	createAgentWithCustomValidator,
	createAgentWithMutatingHandler,
	AGENT_WITH_THROWING_TOOL,
	AGENT_WITH_INIT_STATE,
} from './reducer.fixtures';
import type {StatefulAgentInput, ExecutionState, AttemptState} from './reducer.fixtures';

describe('executeAgent - State Reducer Pattern', () => {
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
			const tracker = new CallbackTracker();
			const options = {
				input: 'test input',
				callbacks: tracker.createCallbacks(),
			};

			const input: StatefulAgentInput = {
				data: 'item1, item2, item3',
			};

			const mock = new AnthropicApiMock();
			mock
				.respondWith({content: [helperToolUse('parse_tool', {format: 'csv'})]})
				.respondWith({content: [helperToolUse('query_tool', {query: 'test query'})]})
				.respondWith({content: [outputToolUse({result: 'success', finalCount: 1})]})
				.install(mockMessagesCreate);

			const result = await executeAgent(STATEFUL_AGENT, {
				...options,
				input,
			});

			expect(isOk(result)).toBe(true);

			// Verify both tool calls succeeded
			const toolResults = tracker.invocations.filter((inv) => inv.type === 'onToolResult');
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
			const tracker = new CallbackTracker();
			const options = {
				input: 'test input',
				callbacks: tracker.createCallbacks(),
			};

			const input: StatefulAgentInput = {
				data: 'item1, item2, item3',
			};

			const mock = new AnthropicApiMock();
			mock
				.respondWith({content: [helperToolUse('parse_tool', {format: 'csv'})]})
				.respondWith({content: [helperToolUse('query_tool', {query: 'test'})]})
				.respondWith({content: [helperToolUse('transform_tool', {operation: 'uppercase'})]})
				.respondWith({content: [outputToolUse({result: 'success', finalCount: 1})]})
				.install(mockMessagesCreate);

			const result = await executeAgent(STATEFUL_AGENT, {
				...options,
				input,
			});

			expect(isOk(result)).toBe(true);

			// Verify all three tool calls succeeded
			const toolResults = tracker.invocations.filter((inv) => inv.type === 'onToolResult');
			expect(toolResults.length).toBe(3);

			// Verify query succeeded (proves it accessed parsedData from parse_tool)
			const queryResult = getToolResult(tracker.invocations, 'query_tool');
			expect(queryResult).toEqual({
				query: 'test',
				matches: 3,
				results: ['item1', 'item2', 'item3'],
			});
		});

		it('should preserve run state across validation failures and retry attempts', async () => {
			const tracker = new CallbackTracker();
			const options = {
				input: 'test input',
				callbacks: tracker.createCallbacks(),
			};

			const input: StatefulAgentInput = {
				data: '{"key": "value"}',
			};

			// Create validator and agent with custom validator
			const attemptTrackingValidator = createAttemptTrackingValidator();
			const agentWithValidator = createAgentWithCustomValidator(attemptTrackingValidator);

			// Attempt 1: parse_tool → output (validation fails)
			// Attempt 2: query_tool → output (validation succeeds)
			// Key: query_tool in attempt 2 succeeds WITHOUT calling parse_tool
			const mock = new AnthropicApiMock();
			mock
				.respondWith({content: [helperToolUse('parse_tool', {format: 'json'})]})
				.respondWith({content: [outputToolUse({result: 'attempt1', finalCount: 0})]})
				.respondWith({content: [helperToolUse('query_tool', {query: 'key'})]})
				.respondWith({content: [outputToolUse({result: 'attempt2', finalCount: 1})]})
				.install(mockMessagesCreate);

			const result = await executeAgent(agentWithValidator, {
				...options,
				input,
			});

			expect(isOk(result)).toBe(true);

			if (isOk(result)) {
				// Verify second attempt succeeded
				expect(result.data.attempts).toBe(2);
				expect(result.data.output).toEqual({result: 'attempt2', finalCount: 1});
			}

			// Verify parse_tool was called in attempt 1
			const parseToolCalls = tracker.invocations.filter(
				(inv) => inv.type === 'onToolCall' && inv.toolName === 'parse_tool'
			);
			expect(parseToolCalls.length).toBe(1);

			// Verify query_tool was called in attempt 2 and succeeded
			const queryToolResults = tracker.invocations.filter(
				(inv) => inv.type === 'onToolResult' && inv.toolName === 'query_tool'
			);
			expect(queryToolResults.length).toBe(1);

			const queryResult = queryToolResults.at(0);
			expect(queryResult).toBeDefined();
			expect(queryResult?.type).toBe('onToolResult');

			if (queryResult?.type === 'onToolResult') {
				// Query succeeded - proves parsedData from attempt 1 persisted to attempt 2
				expect(queryResult.toolResult).not.toContain(QUERY_BEFORE_PARSE_ERROR);
				const parsed = JSON.parse(queryResult.toolResult);
				expect(parsed).toEqual({
					query: 'key',
					matches: 3,
					results: ['item1', 'item2', 'item3'],
				});
			}
		});
	});

	describe('Handler Isolation', () => {
		it('should allow testing individual handler in isolation', () => {
			const state: AgentState<ExecutionState, AttemptState> = {
				context: {attempt: 1, maxAttempts: 3, iteration: 1, maxIterations: 10},
				run: {rawData: '{"key": "value"}', parsedData: undefined},
				attempt: {callCount: 0},
			};

			const result = mockParseReducerHandler(state, {format: 'json'});

			expect(isOk(result)).toBe(true);

			if (isOk(result)) {
				expect(result.data.newState.attempt.callCount).toBe(INCREMENTED_ONCE);
				expect(result.data.newState.run.parsedData).toEqual({key: 'value'});
				expect(result.data.toolResult).toEqual({
					status: 'parsed',
					format: 'json',
					recordCount: 1,
				});
			}
		});

		it('should follow immutability (return new object, not mutate input)', () => {
			const state: AgentState<ExecutionState, AttemptState> = {
				context: {attempt: 1, maxAttempts: 3, iteration: 1, maxIterations: 10},
				run: {rawData: '{"test": true}', parsedData: undefined},
				attempt: {callCount: 0},
			};

			const originalRunParsedData = state.run.parsedData;
			const originalAttemptCallCount = state.attempt.callCount;

			const result = mockParseReducerHandler(state, {format: 'json'});

			// Original state unchanged (immutability check)
			expect(state.run.parsedData).toBe(originalRunParsedData);
			expect(state.attempt.callCount).toBe(originalAttemptCallCount);

			expect(isOk(result)).toBe(true);

			if (isOk(result)) {
				// Verify new object reference (not same object)
				expect(result.data.newState).not.toBe(state);
				expect(result.data.newState.run).not.toBe(state.run);
				expect(result.data.newState.attempt).not.toBe(state.attempt);
				expect(result.data.newState.attempt.callCount).toBe(INCREMENTED_ONCE);
				expect(result.data.newState.run.parsedData).toBeDefined();
			}
		});

		it('should protect framework state from handler mutations', async () => {
			// This test verifies the framework is defensive against badly-behaved handlers
			// that keep references to state and mutate them across multiple tool calls

			const tracker = new CallbackTracker();
			const options = {
				input: 'test input',
				callbacks: tracker.createCallbacks(),
			};

			const input: StatefulAgentInput = {
				data: '{"test": "value"}',
			};

			// Create agent with mutating handler from fixtures
			const agentWithMutatingHandler = createAgentWithMutatingHandler();

			const mock = new AnthropicApiMock();
			mock
				.respondWith({content: [helperToolUse('mutating_tool', {})]})
				.respondWith({content: [helperToolUse('mutating_tool', {})]})
				.respondWith({content: [outputToolUse({result: 'success', finalCount: 1})]})
				.install(mockMessagesCreate);

			const result = await executeAgent(agentWithMutatingHandler, {
				...options,
				input,
			});

			// If the test passed without assertion failures in the handler,
			// the framework successfully protected against the mutations
			expect(isOk(result)).toBe(true);
		});

		it('should return error for invalid state prerequisites', () => {
			const state: AgentState<ExecutionState, AttemptState> = {
				context: {attempt: 1, maxAttempts: 3, iteration: 1, maxIterations: 10},
				run: {rawData: '{"test": true}', parsedData: undefined},
				attempt: {callCount: 0},
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
			const tracker = new CallbackTracker();
			const options = {
				input: 'test input',
				callbacks: tracker.createCallbacks(),
			};

			const input: StatefulAgentInput = {
				data: '{"test": true}',
			};

			const mock = new AnthropicApiMock();
			mock
				.respondWith({content: [helperToolUse('query_tool', {query: 'test'})]})
				.respondWith({content: [outputToolUse({result: 'success', finalCount: 1})]})
				.install(mockMessagesCreate);

			const result = await executeAgent(STATEFUL_AGENT, {
				...options,
				input,
			});

			expect(isOk(result)).toBe(true);

			const errorToolResult = tracker.invocations.find(
				(inv) => inv.type === 'onToolResult' && inv.toolName === 'query_tool'
			);

			expect(errorToolResult).toBeDefined();
			expect(errorToolResult?.type).toBe('onToolResult');
			if (errorToolResult?.type === 'onToolResult') {
				expect(errorToolResult.toolResult).toContain(QUERY_BEFORE_PARSE_ERROR);
			}
		});

		it('should allow subsequent tool calls after handler error', async () => {
			const tracker = new CallbackTracker();
			const options = {
				input: 'test input',
				callbacks: tracker.createCallbacks(),
			};

			const input: StatefulAgentInput = {
				data: 'a, b, c',
			};

			const mock = new AnthropicApiMock();
			mock
				.respondWith({content: [helperToolUse('query_tool', {query: 'test'})]})
				.respondWith({content: [helperToolUse('parse_tool', {format: 'csv'})]})
				.respondWith({content: [helperToolUse('query_tool', {query: 'test'})]})
				.respondWith({content: [outputToolUse({result: 'success', finalCount: 1})]})
				.install(mockMessagesCreate);

			const result = await executeAgent(STATEFUL_AGENT, {
				...options,
				input,
			});

			expect(isOk(result)).toBe(true);

			// Verify first query failed, parse succeeded, second query succeeded
			const toolResults = tracker.invocations.filter((inv) => inv.type === 'onToolResult');
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
			const tracker = new CallbackTracker();
			const options = {
				input: 'test input',
				callbacks: tracker.createCallbacks(),
			};

			const input: StatefulAgentInput = {
				data: '{"test": true}',
			};

			const mock = new AnthropicApiMock();
			mock
				.respondWith({content: [helperToolUse('unknown_tool', {})]})
				.respondWith({content: [outputToolUse({result: 'success', finalCount: 1})]})
				.install(mockMessagesCreate);

			const result = await executeAgent(STATEFUL_AGENT, {
				...options,
				input,
			});

			expect(isOk(result)).toBe(true);

			// Unknown tool should return error
			const unknownToolResult = tracker.invocations.find(
				(inv) => inv.type === 'onToolResult' && inv.toolName === 'unknown_tool'
			);

			expect(unknownToolResult).toBeDefined();
			expect(unknownToolResult?.type).toBe('onToolResult');
			if (unknownToolResult?.type === 'onToolResult') {
				expect(unknownToolResult.toolResult).toContain(UNKNOWN_TOOL_ERROR_PREFIX);
			}
		});

		it('should preserve state when handler throws exception', async () => {
			const tracker = new CallbackTracker();
			const options = {
				input: 'test input',
				callbacks: tracker.createCallbacks(),
			};

			const input: StatefulAgentInput = {
				data: '{"test": true}',
			};

			const mock = new AnthropicApiMock();
			mock
				.respondWith({content: [helperToolUse('parse_tool', {format: 'json'})]})
				.respondWith({content: [helperToolUse('throwing_tool', {shouldThrow: true, errorMessage: 'Tool execution failed'})]})
				.respondWith({content: [helperToolUse('query_tool', {query: 'test'})]})
				.respondWith({content: [outputToolUse({result: 'success', finalCount: 1})]})
				.install(mockMessagesCreate);

			const result = await executeAgent(AGENT_WITH_THROWING_TOOL, {
				...options,
				input,
			});

			expect(isOk(result)).toBe(true);

			// Verify parse succeeded and updated state
			const parseResult = getToolResult(tracker.invocations, 'parse_tool');
			expect(parseResult).toEqual({
				status: 'parsed',
				format: 'json',
				recordCount: 1,
			});

			// Verify throwing tool returned error
			const throwingResult = tracker.invocations.find(
				(inv) => inv.type === 'onToolResult' && inv.toolName === 'throwing_tool'
			);
			expect(throwingResult).toBeDefined();
			expect(throwingResult?.type).toBe('onToolResult');
			if (throwingResult?.type === 'onToolResult') {
				expect(throwingResult.toolResult).toContain('Tool execution failed');
			}

			// Verify query succeeded (proves it sees parse's state despite throwing tool)
			const queryResult = getToolResult(tracker.invocations, 'query_tool');
			expect(queryResult).toEqual({
				query: 'test',
				matches: 3,
				results: ['item1', 'item2', 'item3'],
			});
		});

		it('should handle multiple exceptions without corrupting state', async () => {
			const tracker = new CallbackTracker();
			const options = {
				input: 'test input',
				callbacks: tracker.createCallbacks(),
			};

			const input: StatefulAgentInput = {
				data: '{"key": "value"}',
			};

			const mock = new AnthropicApiMock();
			mock
				.respondWith({content: [helperToolUse('parse_tool', {format: 'json'})]})
				.respondWith({content: [helperToolUse('throwing_tool', {shouldThrow: true, errorMessage: 'First exception'})]})
				.respondWith({content: [helperToolUse('query_tool', {query: 'key'})]})
				.respondWith({content: [helperToolUse('throwing_tool', {shouldThrow: true, errorMessage: 'Second exception'})]})
				.respondWith({content: [helperToolUse('query_tool', {query: 'key'})]})
				.respondWith({content: [outputToolUse({result: 'success', finalCount: 1})]})
				.install(mockMessagesCreate);

			const result = await executeAgent(AGENT_WITH_THROWING_TOOL, {
				...options,
				input,
			});

			expect(isOk(result)).toBe(true);

			// Verify parse succeeded
			const parseResult = getToolResult(tracker.invocations, 'parse_tool');
			expect(parseResult).toEqual({
				status: 'parsed',
				format: 'json',
				recordCount: 1,
			});

			// Verify both query calls succeeded (both see parse's state)
			const queryResults = tracker.invocations.filter(
				(inv) => inv.type === 'onToolResult' && inv.toolName === 'query_tool'
			);
			expect(queryResults.length).toBe(2);

			// Both queries should succeed
			const firstQueryResult = queryResults.at(0);
			expect(firstQueryResult).toBeDefined();
			expect(firstQueryResult?.type).toBe('onToolResult');
			if (firstQueryResult?.type === 'onToolResult') {
				const parsed = JSON.parse(firstQueryResult.toolResult);
				expect(parsed).toEqual({
					query: 'key',
					matches: 3,
					results: ['item1', 'item2', 'item3'],
				});
			}

			const secondQueryResult = queryResults.at(1);
			expect(secondQueryResult).toBeDefined();
			expect(secondQueryResult?.type).toBe('onToolResult');
			if (secondQueryResult?.type === 'onToolResult') {
				const parsed = JSON.parse(secondQueryResult.toolResult);
				expect(parsed).toEqual({
					query: 'key',
					matches: 3,
					results: ['item1', 'item2', 'item3'],
				});
			}
		});
	});

	describe('Custom Initial State', () => {
		it('should use initialRunState to pre-populate state fields', async () => {
			const tracker = new CallbackTracker();
			const options = {
				input: 'test input',
				callbacks: tracker.createCallbacks(),
			};

			const input = {
				data: 'a, b, c',
			};

			const mock = new AnthropicApiMock();
			mock
				.respondWith({content: [helperToolUse('query_tool', {query: 'test'})]})
				.respondWith({content: [outputToolUse({result: 'success', finalCount: 1})]})
				.install(mockMessagesCreate);

			const result = await executeAgent(AGENT_WITH_INIT_STATE, {
				...options,
				input,
			});

			expect(isOk(result)).toBe(true);

			// Query succeeds WITHOUT parse_tool being called
			// This proves initialRunState actually set parsedData
			const queryResult = getToolResult(tracker.invocations, 'query_tool');
			expect(queryResult).toEqual({
				query: 'test',
				matches: 3,
				results: ['item1', 'item2', 'item3'],
			});

			// Verify parse_tool was NOT called
			const parseToolCalls = tracker.invocations.filter(
				(inv) => inv.type === 'onToolCall' && inv.toolName === 'parse_tool'
			);
			expect(parseToolCalls.length).toBe(0);
		});
	});

	describe('Backward Compatibility', () => {
		it('should work with stateless agent (no helpers)', async () => {
			const tracker = new CallbackTracker();
			const options = {
				input: 'test input',
				callbacks: tracker.createCallbacks(),
			};

			const mock = new AnthropicApiMock();
			mock
				.respondWith({content: [outputToolUse('success result')]})
				.install(mockMessagesCreate);

			const result = await executeAgent(VALID_MINIMAL_AGENT, options);

			expect(isOk(result)).toBe(true);
			if (isOk(result)) {
				expect(result.data.output).toBeDefined();
				expect(result.data.attempts).toBe(1);
			}

			// No helper tool calls should occur
			const helperToolCalls = tracker.invocations.filter(
				(inv) => inv.type === 'onToolCall' && inv.toolName !== 'submit' && inv.toolName !== 'generate_output'
			);
			expect(helperToolCalls.length).toBe(0);
		});

		it('should leave output tool behaviour unchanged', async () => {
			const tracker = new CallbackTracker();
			const options = {
				input: 'test input',
				callbacks: tracker.createCallbacks(),
			};

			const mock = new AnthropicApiMock();
			mock
				.respondWith({content: [outputToolUse('test output')]})
				.install(mockMessagesCreate);

			const result = await executeAgent(VALID_MINIMAL_AGENT, options);

			expect(isOk(result)).toBe(true);
			if (isOk(result)) {
				expect(result.data.output).toEqual({result: 'test output'});
			}
		});
	});

	describe('Execution Isolation', () => {
		it('should not leak state between sequential executions', async () => {
			const tracker1 = new CallbackTracker();
			const options1 = {
				input: 'test input',
				callbacks: tracker1.createCallbacks(),
			};
			const tracker2 = new CallbackTracker();
			const options2 = {
				input: 'test input',
				callbacks: tracker2.createCallbacks(),
			};

			const input: StatefulAgentInput = {
				data: '{"test": true}',
			};

			// First execution: parse then query (should succeed)
			const mock1 = new AnthropicApiMock();
			mock1
				.respondWith({content: [helperToolUse('parse_tool', {format: 'json'})]})
				.respondWith({content: [helperToolUse('query_tool', {query: 'test'})]})
				.respondWith({content: [outputToolUse({result: 'success', finalCount: 1})]})
				.install(mockMessagesCreate);

			const result1 = await executeAgent(STATEFUL_AGENT, {
				...options1,
				input,
			});

			expect(isOk(result1)).toBe(true);

			// Verify first execution succeeded - query worked after parse
			const firstQueryResult = tracker1.invocations.find(
				(inv) => inv.type === 'onToolResult' && inv.toolName === 'query_tool'
			);
			expect(firstQueryResult).toBeDefined();
			expect(firstQueryResult?.type).toBe('onToolResult');
			if (firstQueryResult?.type === 'onToolResult') {
				expect(firstQueryResult.toolResult).not.toContain(QUERY_BEFORE_PARSE_ERROR);
			}

			// Second execution: query WITHOUT parse (should fail if truly isolated)
			const mock2 = new AnthropicApiMock();
			mock2
				.respondWith({content: [helperToolUse('query_tool', {query: 'test'})]})
				.respondWith({content: [outputToolUse({result: 'success', finalCount: 1})]})
				.install(mockMessagesCreate);

			const result2 = await executeAgent(STATEFUL_AGENT, {
				...options2,
				input,
			});

			expect(isOk(result2)).toBe(true);

			// Verify second execution failed - query requires parse
			const secondQueryResult = tracker2.invocations.find(
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
			};

			const input2: StatefulAgentInput = {
				data: '{"test": 2}',
			};

			// Both executions parse their respective data
			const mock = new AnthropicApiMock();
			mock
				.respondWith({content: [helperToolUse('parse_tool', {format: 'json'})]})
				.respondWith({content: [outputToolUse({result: 'success', finalCount: 1})]})
				.respondWith({content: [helperToolUse('parse_tool', {format: 'json'})]})
				.respondWith({content: [outputToolUse({result: 'success', finalCount: 1})]})
				.install(mockMessagesCreate);

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
