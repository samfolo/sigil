import {describe, expect, it} from 'vitest';

import type {ParserState} from '@sigil/src/agent/definitions/analyser/tools/parsers/common';
import type {AgentState} from '@sigil/src/agent/framework/defineAgent';
import {isErr, isOk} from '@sigil/src/common/errors';
import type {EmptyObject} from '@sigil/src/common/types';

import {EXPLORE_STRUCTURE_TOOL, MAX_DEPTH, MIN_DEPTH} from './exploreStructure.tool';
import type {ExploreStructureResult} from './types';

const isExploreStructureResult = (value: unknown): value is ExploreStructureResult =>
	typeof value === 'object' &&
	value !== null &&
	'paths' in value &&
	'metadata' in value;

const VALID_INPUT = {
	maxDepth: 5,
};

const createState = (parsedData: unknown): AgentState<ParserState, EmptyObject> => ({
	context: {
		attempt: 1,
		maxAttempts: 3,
		iteration: 1,
		maxIterations: 10,
	},
	run: {
		raw: '',
		parsedData,
	},
	attempt: {},
});

describe('EXPLORE_STRUCTURE_TOOL', () => {
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
					raw: '',
				},
				attempt: {},
			};

			const result = EXPLORE_STRUCTURE_TOOL.handler(state, VALID_INPUT);

			expect(isErr(result)).toBe(true);
			if (!isErr(result)) {
				return;
			}

			expect(result.error).toContain('No parsed data available');
		});

		it('returns error for invalid maxDepth below minimum', () => {
			const state = createState({a: 'value'});

			const result = EXPLORE_STRUCTURE_TOOL.handler(state, {maxDepth: MIN_DEPTH - 1});

			expect(isErr(result)).toBe(true);
			if (!isErr(result)) {
				return;
			}

			expect(result.error).toContain('Invalid input');
		});

		it('returns error for invalid maxDepth above maximum', () => {
			const state = createState({a: 'value'});

			const result = EXPLORE_STRUCTURE_TOOL.handler(state, {maxDepth: MAX_DEPTH + 1});

			expect(isErr(result)).toBe(true);
			if (!isErr(result)) {
				return;
			}

			expect(result.error).toContain('Invalid input');
		});

		it('returns error for non-integer maxDepth', () => {
			const state = createState({a: 'value'});

			const result = EXPLORE_STRUCTURE_TOOL.handler(state, {maxDepth: 5.5});

			expect(isErr(result)).toBe(true);
			if (!isErr(result)) {
				return;
			}

			expect(result.error).toContain('Invalid input');
		});

		it('returns unchanged state with exploration result', () => {
			const parsedData = {
				user: {
					name: 'Alice',
					age: 30,
				},
			};
			const state = createState(parsedData);

			const result = EXPLORE_STRUCTURE_TOOL.handler(state, {maxDepth: 3});

			expect(isOk(result)).toBe(true);
			if (!isOk(result)) {
				return;
			}

			// State should be unchanged (only run and attempt, context managed by framework)
			expect(result.data.newState.run).toEqual(state.run);
			expect(result.data.newState.attempt).toEqual(state.attempt);

			// Tool result should contain exploration data
			const toolResult = result.data.toolResult;
			expect(isExploreStructureResult(toolResult)).toBe(true);
			if (!isExploreStructureResult(toolResult)) {
				return;
			}

			expect(toolResult.paths.value).toContain('$.user.age');
			expect(toolResult.paths.value).toContain('$.user.name');
			expect(toolResult.metadata.totalPathsReturned).toBe(2);
		});

		it('passes prefix option to implementation', () => {
			const parsedData = {
				users: [
					{name: 'Alice'},
					{name: 'Bob'},
				],
				settings: {
					theme: 'dark',
				},
			};
			const state = createState(parsedData);

			const result = EXPLORE_STRUCTURE_TOOL.handler(state, {
				maxDepth: 3,
				prefix: '$.users',
			});

			expect(isOk(result)).toBe(true);
			if (!isOk(result)) {
				return;
			}

			const toolResult = result.data.toolResult;
			expect(isExploreStructureResult(toolResult)).toBe(true);
			if (!isExploreStructureResult(toolResult)) {
				return;
			}

			// All paths should start with prefix
			expect(toolResult.paths.value.every((p: string) => p.startsWith('$.users'))).toBe(true);
			expect(toolResult.metadata.prefix).toBe('$.users');
		});

		it('forwards implementation errors', () => {
			const state = createState({items: [{id: 1}, {id: 2}]});

			const result = EXPLORE_STRUCTURE_TOOL.handler(state, {
				maxDepth: 3,
				prefix: '$.items[*]',
			});

			expect(isErr(result)).toBe(true);
			if (!isErr(result)) {
				return;
			}

			expect(result.error).toContain('multiple values');
		});
	});
});
