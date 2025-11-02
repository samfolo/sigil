import {describe, expect, it} from 'vitest';

import {JSONPATH_PREFIX} from '@sigil/src/agent/definitions/analyser/tools/explore/common';
import type {ParserState} from '@sigil/src/agent/definitions/analyser/tools/parsers/common';
import type {AgentState} from '@sigil/src/agent/framework/defineAgent';
import {isErr, isOk} from '@sigil/src/common/errors';
import type {EmptyObject} from '@sigil/src/common/types';

import {QUERY_JSON_PATH_TOOL} from './queryJSONPath.tool';
import type {QueryJSONPathResult} from './types';

const isQueryJSONPathResult = (value: unknown): value is QueryJSONPathResult =>
	typeof value === 'object' &&
	value !== null &&
	'matches' in value &&
	'metadata' in value;

const VALID_INPUT = {
	path: '$.users[*].name',
};

const createState = (parsedData: unknown): AgentState<ParserState, EmptyObject> => ({
	context: {
		attempt: 1,
		maxAttempts: 3,
		iteration: 1,
		maxIterations: 10,
	},
	run: {
		rawData: '',
		parsedData,
	},
	attempt: {},
});

describe('QUERY_JSON_PATH_TOOL', () => {
	describe('handler', () => {
		it('returns error when parsedData is undefined', () => {
			const state: AgentState<ParserState, EmptyObject> = {
				context: {
					attempt: 1,
					maxAttempts: 3,
					iteration: 1,
					maxIterations: 10,
				},
				run: {
					rawData: '',
				},
				attempt: {},
			};

			const result = QUERY_JSON_PATH_TOOL.handler(state, VALID_INPUT);

			expect(isErr(result)).toBe(true);
			if (!isErr(result)) {
				return;
			}

			expect(result.error).toContain('No parsed data available');
		});

		it('returns error when path does not start with $', () => {
			const state = createState({users: [{name: 'Alice'}]});

			const result = QUERY_JSON_PATH_TOOL.handler(state, {path: 'users[*].name'});

			expect(isErr(result)).toBe(true);
			if (!isErr(result)) {
				return;
			}

			expect(result.error).toContain(`must start with ${JSONPATH_PREFIX}`);
		});

		it('returns error for path shorter than minimum length', () => {
			const state = createState({users: [{name: 'Alice'}]});

			const result = QUERY_JSON_PATH_TOOL.handler(state, {path: ''});

			expect(isErr(result)).toBe(true);
			if (!isErr(result)) {
				return;
			}

			expect(result.error).toContain('Invalid input');
		});

		it('returns error for missing path parameter', () => {
			const state = createState({users: [{name: 'Alice'}]});

			const result = QUERY_JSON_PATH_TOOL.handler(state, {});

			expect(isErr(result)).toBe(true);
			if (!isErr(result)) {
				return;
			}

			expect(result.error).toContain('Invalid input');
		});

		it('returns unchanged state with query result', () => {
			const parsedData = {
				users: [
					{name: 'Alice'},
					{name: 'Bob'},
				],
			};
			const state = createState(parsedData);

			const result = QUERY_JSON_PATH_TOOL.handler(state, {path: '$.users[*].name'});

			expect(isOk(result)).toBe(true);
			if (!isOk(result)) {
				return;
			}

			// State should be unchanged (only run and attempt, context managed by framework)
			expect(result.data.newState.run).toEqual(state.run);
			expect(result.data.newState.attempt).toEqual(state.attempt);

			// Tool result should contain query data
			const toolResult = result.data.toolResult;
			expect(isQueryJSONPathResult(toolResult)).toBe(true);
			if (!isQueryJSONPathResult(toolResult)) {
				return;
			}

			expect(toolResult.matches.value).toHaveLength(2);
			expect(toolResult.matches.value.at(0)?.preview).toBe('"Alice"');
			expect(toolResult.matches.value.at(1)?.preview).toBe('"Bob"');
			expect(toolResult.metadata.query).toBe('$.users[*].name');
			expect(toolResult.metadata.totalMatches).toBe(2);
		});

		it('handles simple property paths', () => {
			const parsedData = {
				user: {name: 'Alice'},
			};
			const state = createState(parsedData);

			const result = QUERY_JSON_PATH_TOOL.handler(state, {path: '$.user.name'});

			expect(isOk(result)).toBe(true);
			if (!isOk(result)) {
				return;
			}

			const toolResult = result.data.toolResult;
			expect(isQueryJSONPathResult(toolResult)).toBe(true);
			if (!isQueryJSONPathResult(toolResult)) {
				return;
			}

			expect(toolResult.matches.value).toHaveLength(1);
			expect(toolResult.matches.value.at(0)?.path).toBe('$.user.name');
			expect(toolResult.matches.value.at(0)?.preview).toBe('"Alice"');
		});

		it('handles root path query', () => {
			const parsedData = 'hello world';
			const state = createState(parsedData);

			const result = QUERY_JSON_PATH_TOOL.handler(state, {path: '$'});

			expect(isOk(result)).toBe(true);
			if (!isOk(result)) {
				return;
			}

			const toolResult = result.data.toolResult;
			expect(isQueryJSONPathResult(toolResult)).toBe(true);
			if (!isQueryJSONPathResult(toolResult)) {
				return;
			}

			expect(toolResult.matches.value).toHaveLength(1);
			expect(toolResult.matches.value.at(0)?.preview).toBe('"hello world"');
		});

		it('handles empty results when path matches nothing', () => {
			const parsedData = {user: {name: 'Alice'}};
			const state = createState(parsedData);

			const result = QUERY_JSON_PATH_TOOL.handler(state, {path: '$.nonexistent'});

			expect(isOk(result)).toBe(true);
			if (!isOk(result)) {
				return;
			}

			const toolResult = result.data.toolResult;
			expect(isQueryJSONPathResult(toolResult)).toBe(true);
			if (!isQueryJSONPathResult(toolResult)) {
				return;
			}

			expect(toolResult.matches.value).toHaveLength(0);
			expect(toolResult.matches.exact).toBe(true);
			expect(toolResult.metadata.totalMatches).toBe(0);
		});

		it('forwards implementation errors for invalid JSONPath syntax', () => {
			const state = createState({items: [{id: 1}, {id: 2}]});

			const result = QUERY_JSON_PATH_TOOL.handler(state, {path: '$..[?('});

			expect(isErr(result)).toBe(true);
			if (!isErr(result)) {
				return;
			}

			expect(result.error).toContain('JSONPath query failed');
		});

		it('handles nested wildcard queries', () => {
			const parsedData = {
				departments: [
					{employees: [{name: 'Alice'}, {name: 'Bob'}]},
					{employees: [{name: 'Charlie'}]},
				],
			};
			const state = createState(parsedData);

			const result = QUERY_JSON_PATH_TOOL.handler(state, {path: '$.departments[*].employees[*].name'});

			expect(isOk(result)).toBe(true);
			if (!isOk(result)) {
				return;
			}

			const toolResult = result.data.toolResult;
			expect(isQueryJSONPathResult(toolResult)).toBe(true);
			if (!isQueryJSONPathResult(toolResult)) {
				return;
			}

			expect(toolResult.matches.value).toHaveLength(3);
			expect(toolResult.matches.exact).toBe(true);
			expect(toolResult.metadata.totalMatches).toBe(3);
		});

		it('handles queries returning various value types', () => {
			const parsedData = {
				string: 'text',
				number: 42,
				boolean: true,
				nil: null,
				array: [1, 2, 3],
				object: {key: 'value'},
			};
			const state = createState(parsedData);

			const result = QUERY_JSON_PATH_TOOL.handler(state, {path: '$.number'});

			expect(isOk(result)).toBe(true);
			if (!isOk(result)) {
				return;
			}

			const toolResult = result.data.toolResult;
			expect(isQueryJSONPathResult(toolResult)).toBe(true);
			if (!isQueryJSONPathResult(toolResult)) {
				return;
			}

			expect(toolResult.matches.value.at(0)?.preview).toBe('42');
		});
	});
});
