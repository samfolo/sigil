/**
 * Test fixtures for state reducer pattern (embedded handler pattern)
 *
 * Demonstrates the embedded handler pattern where each tool contains its own
 * handler function that receives state and returns {newState, toolResult}.
 *
 * These fixtures test:
 * - State threading through multiple tool calls
 * - Handler isolation and testability
 * - Error handling in handlers
 * - State immutability
 */

import {z} from 'zod';

import type {Result} from '@sigil/src/common/errors';
import {err, ok} from '@sigil/src/common/errors';

import type {AgentDefinition, HelperToolConfig} from '../../defineAgent/defineAgent';
import {agentBuilder} from '../../defineAgent/defineAgent.fixtures';
import type {AgentState, HandlerStateUpdate} from '../../defineAgent/types';

/**
 * Agent input type for testing state threading
 *
 * This is what tests pass to the agent.
 */
export interface StatefulAgentInput {
	data: string;
}

/**
 * Execution state type (persists across retry attempts)
 *
 * Stores expensive computations that should survive validation failures:
 * - rawData: Original input data
 * - parsedData: Parsed data (set by parse_tool, persists across attempts)
 */
export interface ExecutionState {
	rawData: string;
	parsedData?: unknown;
}

/**
 * Attempt state type (resets on validation failure)
 *
 * Stores per-attempt working state that resets on each retry:
 * - callCount: Number of tools called in this attempt
 */
export interface AttemptState {
	callCount: number;
}

/**
 * Tool reducer handler result type
 *
 * Standard return type for tool reducer handlers that update state.
 * Handlers only return run and attempt state - context is automatically managed by framework.
 */
export interface ToolReducerResult {
	newState: HandlerStateUpdate<ExecutionState, AttemptState>;
	toolResult: unknown;
}

/**
 * Test output interface for stateful agent
 */
interface StatefulTestOutput {
	result: string;
	finalCount: number;
}

/**
 * Test output schema
 */
const STATEFUL_TEST_OUTPUT_SCHEMA = z.object({
	result: z.string(),
	finalCount: z.number(),
});

/**
 * Parse tool input schema
 */
const PARSE_TOOL_INPUT_SCHEMA = z.object({
	format: z.enum(['json', 'csv']).optional(),
});

type ParseToolInput = z.infer<typeof PARSE_TOOL_INPUT_SCHEMA>;

/**
 * Query tool input schema
 */
const QUERY_TOOL_INPUT_SCHEMA = z.object({
	query: z.string(),
});

type QueryToolInput = z.infer<typeof QUERY_TOOL_INPUT_SCHEMA>;

/**
 * Transform tool input schema
 */
const TRANSFORM_TOOL_INPUT_SCHEMA = z.object({
	operation: z.enum(['uppercase', 'lowercase', 'reverse']),
});

type TransformToolInput = z.infer<typeof TRANSFORM_TOOL_INPUT_SCHEMA>;

/**
 * Throwing tool input schema
 */
const THROWING_TOOL_INPUT_SCHEMA = z.object({
	shouldThrow: z.boolean().optional(),
	errorMessage: z.string().optional(),
});

type ThrowingToolInput = z.infer<typeof THROWING_TOOL_INPUT_SCHEMA>;

/**
 * Mock parse tool handler
 *
 * Simulates parsing raw data and updating state with the parsed result.
 * Sets parsedData in run state (persists across attempts).
 * Increments callCount in attempt state (resets on retry).
 *
 * PERSISTENCE: Parsed data stored at RUN level (survives retries).
 * Call count stored at ATTEMPT level (resets on retry).
 *
 * @param state - Current agent state
 * @param toolInput - Tool input (format option)
 * @returns Result with updated state and tool result
 */
export const mockParseReducerHandler = (
	state: AgentState<ExecutionState, AttemptState>,
	toolInput: unknown
): Result<ToolReducerResult, string> => {
	// Validate input
	const parsed = PARSE_TOOL_INPUT_SCHEMA.safeParse(toolInput);
	if (!parsed.success) {
		return err(`Invalid parse tool input: ${parsed.error.message}`);
	}

	// Simulate parsing the data field
	const format = parsed.data.format ?? 'json';
	let parsedData: unknown;

	try {
		if (format === 'json') {
			parsedData = JSON.parse(state.run.rawData);
		} else {
			// Simulate CSV parsing
			parsedData = state.run.rawData.split(',').map((item) => item.trim());
		}
	} catch {
		return err(`Failed to parse data as ${format}`);
	}

	// Return new state (immutable update)
	// Context is automatically managed by framework
	return ok({
		newState: {
			run: {...state.run, parsedData},
			attempt: {...state.attempt, callCount: state.attempt.callCount + 1},
		},
		toolResult: {
			status: 'parsed',
			format,
			recordCount: Array.isArray(parsedData) ? parsedData.length : 1,
		},
	});
};

/**
 * Mock query tool handler
 *
 * Simulates querying parsed data. Requires parsedData to be set by parse tool.
 * Only increments callCount (doesn't modify run state).
 *
 * PERSISTENCE: Reads parsedData from RUN level. Only updates ATTEMPT level callCount.
 *
 * @param state - Current agent state
 * @param toolInput - Tool input (query string)
 * @returns Result with updated state and tool result
 */
export const mockQueryReducerHandler = (
	state: AgentState<ExecutionState, AttemptState>,
	toolInput: unknown
): Result<ToolReducerResult, string> => {
	// Validate input
	const parsed = QUERY_TOOL_INPUT_SCHEMA.safeParse(toolInput);
	if (!parsed.success) {
		return err(`Invalid query tool input: ${parsed.error.message}`);
	}

	// Check prerequisite: parsedData must exist
	if (!state.run.parsedData) {
		return err('Cannot query: data has not been parsed yet. Call parse_tool first.');
	}

	// Simulate querying
	const queryResult = {
		query: parsed.data.query,
		matches: 3,
		results: ['item1', 'item2', 'item3'],
	};

	// Return new state (only increment callCount)
	// Context is automatically managed by framework
	return ok({
		newState: {
			run: state.run,
			attempt: {...state.attempt, callCount: state.attempt.callCount + 1},
		},
		toolResult: queryResult,
	});
};

/**
 * Mock transform tool handler
 *
 * Simulates transforming data. Requires parsedData to be set.
 * Modifies parsedData in run state (persists across attempts).
 * Increments callCount in attempt state (resets on retry).
 *
 * PERSISTENCE: Transformed data updates RUN level parsedData (survives retries).
 * Call count stored at ATTEMPT level (resets on retry).
 *
 * @param state - Current agent state
 * @param toolInput - Tool input (operation)
 * @returns Result with updated state and tool result
 */
export const mockTransformReducerHandler = (
	state: AgentState<ExecutionState, AttemptState>,
	toolInput: unknown
): Result<ToolReducerResult, string> => {
	// Validate input
	const parsed = TRANSFORM_TOOL_INPUT_SCHEMA.safeParse(toolInput);
	if (!parsed.success) {
		return err(`Invalid transform tool input: ${parsed.error.message}`);
	}

	// Check prerequisite: parsedData must exist
	if (!state.run.parsedData) {
		return err('Cannot transform: data has not been parsed yet. Call parse_tool first.');
	}

	// Simulate transformation
	const operation = parsed.data.operation;
	let transformedData: unknown = state.run.parsedData;

	if (Array.isArray(state.run.parsedData)) {
		if (operation === 'uppercase') {
			transformedData = state.run.parsedData.map((item) =>
				typeof item === 'string' ? item.toUpperCase() : item
			);
		} else if (operation === 'lowercase') {
			transformedData = state.run.parsedData.map((item) =>
				typeof item === 'string' ? item.toLowerCase() : item
			);
		} else if (operation === 'reverse') {
			transformedData = state.run.parsedData.toReversed();
		}
	}

	// Return new state with transformed data
	// Context is automatically managed by framework
	return ok({
		newState: {
			run: {...state.run, parsedData: transformedData},
			attempt: {...state.attempt, callCount: state.attempt.callCount + 1},
		},
		toolResult: {
			operation,
			status: 'transformed',
		},
	});
};

/**
 * Mock parse tool definition with embedded handler
 *
 * Demonstrates the embedded handler pattern where the handler is colocated
 * with the tool definition.
 *
 * PERSISTENCE: Sets parsedData at RUN level (persists across attempts).
 */
export const MOCK_PARSE_TOOL: HelperToolConfig<'parse_tool', ExecutionState, AttemptState, ParseToolInput> = {
	name: 'parse_tool',
	description: 'Parses raw data into structured format. PERSISTENCE: Parsed data stored at RUN level (survives retries).',
	inputSchema: PARSE_TOOL_INPUT_SCHEMA,
	handler: mockParseReducerHandler,
};

/**
 * Mock query tool definition with embedded handler
 *
 * Requires parsedData to be set before calling. Returns error if called
 * before parse_tool.
 *
 * PERSISTENCE: Reads parsedData from RUN level.
 */
export const MOCK_QUERY_TOOL: HelperToolConfig<'query_tool', ExecutionState, AttemptState, QueryToolInput> = {
	name: 'query_tool',
	description: 'Queries parsed data. PERSISTENCE: Reads parsedData from RUN level.',
	inputSchema: QUERY_TOOL_INPUT_SCHEMA,
	handler: mockQueryReducerHandler,
};

/**
 * Mock transform tool definition with embedded handler
 *
 * Transforms parsed data using various operations.
 *
 * PERSISTENCE: Updates parsedData at RUN level (persists across attempts).
 */
export const MOCK_TRANSFORM_TOOL: HelperToolConfig<'transform_tool', ExecutionState, AttemptState, TransformToolInput> = {
	name: 'transform_tool',
	description: 'Transforms parsed data. PERSISTENCE: Transformed data updates RUN level (survives retries).',
	inputSchema: TRANSFORM_TOOL_INPUT_SCHEMA,
	handler: mockTransformReducerHandler,
};

/**
 * Mock throwing tool handler
 *
 * Simulates a tool that throws an exception during execution.
 * Used to test exception safety and state preservation.
 *
 * PERSISTENCE: Only updates ATTEMPT level callCount when not throwing.
 *
 * @param state - Current agent state
 * @param toolInput - Tool input (shouldThrow flag and error message)
 * @returns Never returns on throw, otherwise returns updated state
 */
export const mockThrowingReducerHandler = (
	state: AgentState<ExecutionState, AttemptState>,
	toolInput: unknown
): Result<ToolReducerResult, string> => {
	// Validate input
	const parsed = THROWING_TOOL_INPUT_SCHEMA.safeParse(toolInput);
	if (!parsed.success) {
		return err(`Invalid throwing tool input: ${parsed.error.message}`);
	}

	const shouldThrow = parsed.data.shouldThrow ?? true;
	const errorMessage = parsed.data.errorMessage ?? 'Tool execution failed';

	if (shouldThrow) {
		throw new Error(errorMessage);
	}

	// If not throwing, just increment call count
	// Context is automatically managed by framework
	return ok({
		newState: {
			run: state.run,
			attempt: {...state.attempt, callCount: state.attempt.callCount + 1},
		},
		toolResult: {
			status: 'success',
			didNotThrow: true,
		},
	});
};

/**
 * Mock throwing tool definition with embedded handler
 *
 * Throws an exception during execution to test error handling.
 *
 * PERSISTENCE: Only updates ATTEMPT level when not throwing.
 */
export const MOCK_THROWING_TOOL: HelperToolConfig<'throwing_tool', ExecutionState, AttemptState, ThrowingToolInput> = {
	name: 'throwing_tool',
	description: 'Tool that throws exceptions for testing. PERSISTENCE: Only updates ATTEMPT level.',
	inputSchema: THROWING_TOOL_INPUT_SCHEMA,
	handler: mockThrowingReducerHandler,
};

/**
 * Base stateful agent for testing
 */
const BASE_STATEFUL_AGENT: AgentDefinition<StatefulAgentInput, StatefulTestOutput, ExecutionState, AttemptState> = {
	name: 'StatefulTestAgent',
	description: 'Test agent with stateful helper tools',
	model: {
		provider: 'anthropic',
		name: 'claude-sonnet-4-5-20250929',
		temperature: 0.7,
		maxTokens: 1024,
	},
	prompts: {
		system: async (input: StatefulAgentInput, context) =>
			`You are a test agent processing data: ${input.data}. Use the tools to parse, query, and transform. Attempt ${context.attempt}/${context.maxAttempts}.`,
		user: async (input: StatefulAgentInput) =>
			`Process this data: ${input.data}`,
		error: async (errorMessage: string, context) =>
			`Attempt ${context.attempt}/${context.maxAttempts} failed: ${errorMessage}. Please retry.`,
	},
	tools: {
		output: {
			name: 'generate_output',
			description: 'Generate final result',
		},
	},
	validation: {
		outputSchema: STATEFUL_TEST_OUTPUT_SCHEMA,
		customValidators: [],
		maxAttempts: 3,
		maxIterationsPerAttempt: 10,
	},
	initialRunState: (input) => ({rawData: input.data, parsedData: undefined}),
	initialAttemptState: (_input, _run, _context) => ({callCount: 0}),
	observability: {
		trackCost: false,
		trackLatency: false,
		trackAttempts: false,
		trackTokens: false,
	},
};

/**
 * Test agent with stateful reducer pattern
 *
 * Demonstrates a complete agent with multiple helper tools that share state.
 * The state threads through tool calls:
 * 1. parse_tool: Sets parsedData in RUN state (persists across attempts), increments callCount in ATTEMPT state
 * 2. query_tool: Reads parsedData from RUN state, increments callCount in ATTEMPT state
 * 3. transform_tool: Modifies parsedData in RUN state (persists across attempts), increments callCount in ATTEMPT state
 */
export const STATEFUL_AGENT: AgentDefinition<StatefulAgentInput, StatefulTestOutput, ExecutionState, AttemptState> =
	agentBuilder(BASE_STATEFUL_AGENT)
		.withHelpers({
			parse_tool: MOCK_PARSE_TOOL,
			query_tool: MOCK_QUERY_TOOL,
			transform_tool: MOCK_TRANSFORM_TOOL,
		})
		.build();

/**
 * Helper to create stateful agent output response
 *
 * Creates a mock API response for the output tool (generate_output).
 * Used in tests to simulate successful agent completion.
 *
 * @returns Mock message response with output tool use
 */
export const createStatefulSubmitResponse = () => ({
	id: 'msg_output',
	type: 'message' as const,
	role: 'assistant' as const,
	model: 'claude-sonnet-4-5-20250929',
	content: [
		{
			type: 'tool_use' as const,
			id: 'toolu_output',
			name: 'generate_output',
			input: {result: 'success', finalCount: 1},
		},
	],
	stop_reason: 'tool_use' as const,
	stop_sequence: null,
	usage: {input_tokens: 100, output_tokens: 50},
});
