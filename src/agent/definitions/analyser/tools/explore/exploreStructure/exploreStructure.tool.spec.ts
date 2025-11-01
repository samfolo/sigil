import {describe, expect, it} from 'vitest';

import type {ParserState} from '@sigil/src/agent/definitions/analyser/tools/parsers/common';
import {isErr, isOk} from '@sigil/src/common/errors';

import {EXPLORE_STRUCTURE_TOOL, MAX_DEPTH, MIN_DEPTH} from './exploreStructure.tool';

const VALID_INPUT = {
	maxDepth: 5,
};

const createState = (parsedData: unknown): ParserState => ({
	run: {
		parsedData,
	},
	attempt: {},
});

describe('EXPLORE_STRUCTURE_TOOL', () => {
	describe('handler', () => {
		it('returns error when parsedData is undefined', () => {
			const state: ParserState = {
				run: {},
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

			// State should be unchanged
			expect(result.data.newState).toEqual(state);

			// Tool result should contain exploration data
			expect(result.data.toolResult.paths.value).toContain('$.user.age');
			expect(result.data.toolResult.paths.value).toContain('$.user.name');
			expect(result.data.toolResult.metadata.totalPathsReturned).toBe(2);
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

			// All paths should start with prefix
			const paths = result.data.toolResult.paths.value;
			expect(paths.every((p) => p.startsWith('$.users'))).toBe(true);
			expect(result.data.toolResult.metadata.prefix).toBe('$.users');
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
