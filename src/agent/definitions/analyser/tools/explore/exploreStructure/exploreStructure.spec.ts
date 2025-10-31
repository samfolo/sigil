import {describe, expect, it} from 'vitest';

import {isErr, isOk} from '@sigil/src/common/errors';

import {exploreStructure} from './exploreStructure';

const MAX_TOTAL_PATHS = 100;

describe('exploreStructure', () => {
	describe('primitives', () => {
		it.each([
			{description: 'string primitive', value: 'hello'},
			{description: 'number primitive', value: 42},
			{description: 'boolean primitive', value: true},
			{description: 'null', value: null},
		])('returns single leaf path for $description', ({value}) => {
			const result = exploreStructure(value, {maxDepth: 5});

			expect(isOk(result)).toBe(true);
			if (!isOk(result)) {
				return;
			}

			expect(result.data.paths.value).toEqual(['$']);
			expect(result.data.paths.exact).toBe(true);
			expect(result.data.metadata.totalPathsReturned).toBe(1);
		});
	});

	describe('empty structures', () => {
		it('treats empty array as leaf node', () => {
			const result = exploreStructure([], {maxDepth: 5});

			expect(isOk(result)).toBe(true);
			if (!isOk(result)) {
				return;
			}

			expect(result.data.paths.value).toEqual(['$']);
			expect(result.data.paths.exact).toBe(true);
		});

		it('treats empty object as leaf node', () => {
			const result = exploreStructure({}, {maxDepth: 5});

			expect(isOk(result)).toBe(true);
			if (!isOk(result)) {
				return;
			}

			expect(result.data.paths.value).toEqual(['$']);
			expect(result.data.paths.exact).toBe(true);
		});
	});

	describe('homogeneous arrays', () => {
		it('returns consistent structure across array indices', () => {
			const data = [
				{name: 'Alice', age: 30},
				{name: 'Bob', age: 25},
				{name: 'Charlie', age: 35},
			];

			const result = exploreStructure(data, {maxDepth: 3});

			expect(isOk(result)).toBe(true);
			if (!isOk(result)) {
				return;
			}

			// Should show same keys for each index (limited to first 5 elements)
			const paths = result.data.paths.value;
			expect(paths).toContain('$[0].age');
			expect(paths).toContain('$[0].name');
			expect(paths).toContain('$[1].age');
			expect(paths).toContain('$[1].name');
			expect(paths).toContain('$[2].age');
			expect(paths).toContain('$[2].name');
		});
	});

	describe('heterogeneous arrays', () => {
		it('shows different keys at each index', () => {
			const data = [
				{name: 'Alice'},
				{age: 25},
				{city: 'London'},
			];

			const result = exploreStructure(data, {maxDepth: 3});

			expect(isOk(result)).toBe(true);
			if (!isOk(result)) {
				return;
			}

			const paths = result.data.paths.value;
			expect(paths).toContain('$[0].name');
			expect(paths).toContain('$[1].age');
			expect(paths).toContain('$[2].city');
		});
	});

	describe('nested objects', () => {
		it('tracks depth correctly for nested objects', () => {
			const data = {
				level1: {
					level2: {
						level3: 'value',
					},
				},
			};

			const result = exploreStructure(data, {maxDepth: 5});

			expect(isOk(result)).toBe(true);
			if (!isOk(result)) {
				return;
			}

			const paths = result.data.paths.value;
			expect(paths).toContain('$.level1.level2.level3');
		});
	});

	describe('depth sorting', () => {
		it('places deepest paths first', () => {
			const data = {
				shallow: 'value',
				deep: {
					nested: {
						value: 'deep',
					},
				},
			};

			const result = exploreStructure(data, {maxDepth: 5});

			expect(isOk(result)).toBe(true);
			if (!isOk(result)) {
				return;
			}

			const paths = result.data.paths.value;
			expect(paths).toEqual(['$.deep.nested.value', '$.shallow']);
		});
	});

	describe('alphabetical sorting', () => {
		it('sorts alphabetically within same depth', () => {
			const data = {
				zebra: 'value',
				apple: 'value',
				monkey: 'value',
			};

			const result = exploreStructure(data, {maxDepth: 5});

			expect(isOk(result)).toBe(true);
			if (!isOk(result)) {
				return;
			}

			const paths = result.data.paths.value;
			expect(paths).toEqual(['$.apple', '$.monkey', '$.zebra']);
		});
	});

	describe('capping at maximum paths', () => {
		it('sets exact false when exceeding maximum paths', () => {
			// Create structure with more than MAX_TOTAL_PATHS leaf paths
			// Use nested structure to exceed both object key limit and total path limit
			const data: Record<string, Record<string, string>> = {};
			for (let i = 0; i < 30; i++) {
				const nested: Record<string, string> = {};
				for (let j = 0; j < 10; j++) {
					nested[`nested${j}`] = 'value';
				}
				data[`key${i.toString().padStart(3, '0')}`] = nested;
			}

			const result = exploreStructure(data, {maxDepth: 5});

			expect(isOk(result)).toBe(true);
			if (!isOk(result)) {
				return;
			}

			expect(result.data.paths.value.length).toBe(MAX_TOTAL_PATHS);
			expect(result.data.paths.exact).toBe(false);
		});

		it('sets exact true when under maximum paths', () => {
			const data = {
				a: 'value',
				b: 'value',
				c: 'value',
			};

			const result = exploreStructure(data, {maxDepth: 2});

			expect(isOk(result)).toBe(true);
			if (!isOk(result)) {
				return;
			}

			expect(result.data.paths.value.length).toBe(3);
			expect(result.data.paths.exact).toBe(true);
		});
	});

	describe('prefix scoping', () => {
		it('starts traversal from prefix location', () => {
			const data = {
				users: [
					{name: 'Alice', age: 30},
					{name: 'Bob', age: 25},
				],
				settings: {
					theme: 'dark',
				},
			};

			const result = exploreStructure(data, {
				maxDepth: 3,
				prefix: '$.users',
			});

			expect(isOk(result)).toBe(true);
			if (!isOk(result)) {
				return;
			}

			const paths = result.data.paths.value;
			// All paths should start with $.users prefix
			expect(paths.every((p) => p.startsWith('$.users'))).toBe(true);
			expect(paths).not.toContain('$.settings.theme');
			expect(result.data.metadata.prefix).toBe('$.users');
		});

		it('treats empty string as no prefix', () => {
			const data = {a: 'value'};

			const result = exploreStructure(data, {
				maxDepth: 2,
				prefix: '',
			});

			expect(isOk(result)).toBe(true);
			if (!isOk(result)) {
				return;
			}

			expect(result.data.paths.value).toContain('$.a');
			expect(result.data.metadata.prefix).toBeUndefined();
		});

		it('treats single dollar as no prefix', () => {
			const data = {a: 'value'};

			const result = exploreStructure(data, {
				maxDepth: 2,
				prefix: '$',
			});

			expect(isOk(result)).toBe(true);
			if (!isOk(result)) {
				return;
			}

			expect(result.data.paths.value).toContain('$.a');
			expect(result.data.metadata.prefix).toBeUndefined();
		});

		it('returns empty result when prefix resolves to zero matches', () => {
			const data = {a: 'value'};

			const result = exploreStructure(data, {
				maxDepth: 2,
				prefix: '$.nonexistent',
			});

			expect(isOk(result)).toBe(true);
			if (!isOk(result)) {
				return;
			}

			expect(result.data.paths.value).toEqual([]);
			expect(result.data.paths.exact).toBe(true);
			expect(result.data.metadata.totalPathsReturned).toBe(0);
			expect(result.data.metadata.prefix).toBe('$.nonexistent');
		});

		it('returns error when prefix resolves to multiple values', () => {
			const data = {
				items: [
					{id: 1},
					{id: 2},
				],
			};

			const result = exploreStructure(data, {
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

	describe('leaf detection', () => {
		it('returns only leaf nodes, not branch nodes', () => {
			const data = {
				user: {
					name: 'Alice',
					address: {
						city: 'London',
					},
				},
			};

			const result = exploreStructure(data, {maxDepth: 5});

			expect(isOk(result)).toBe(true);
			if (!isOk(result)) {
				return;
			}

			const paths = result.data.paths.value;
			// Should include leaf nodes
			expect(paths).toContain('$.user.name');
			expect(paths).toContain('$.user.address.city');
			// Should NOT include branch nodes
			expect(paths).not.toContain('$.user');
			expect(paths).not.toContain('$.user.address');
		});

		it('treats nodes at maxDepth as leaves even if they have children', () => {
			const data = {
				level1: {
					level2: {
						level3: 'value',
					},
				},
			};

			const result = exploreStructure(data, {maxDepth: 2});

			expect(isOk(result)).toBe(true);
			if (!isOk(result)) {
				return;
			}

			const paths = result.data.paths.value;
			// At maxDepth 2, level2 is a leaf even though it has children
			expect(paths).toContain('$.level1.level2');
			expect(paths).not.toContain('$.level1.level2.level3');
		});
	});

	describe('mixed structures', () => {
		it('handles arrays within objects', () => {
			const data = {
				users: [
					{name: 'Alice'},
					{name: 'Bob'},
				],
			};

			const result = exploreStructure(data, {maxDepth: 4});

			expect(isOk(result)).toBe(true);
			if (!isOk(result)) {
				return;
			}

			const paths = result.data.paths.value;
			expect(paths).toContain('$.users[0].name');
			expect(paths).toContain('$.users[1].name');
		});

		it('handles objects within arrays', () => {
			const data = [
				{nested: {value: 'test'}},
			];

			const result = exploreStructure(data, {maxDepth: 4});

			expect(isOk(result)).toBe(true);
			if (!isOk(result)) {
				return;
			}

			const paths = result.data.paths.value;
			expect(paths).toContain('$[0].nested.value');
		});

		it('handles nested arrays', () => {
			const data = [
				['a', 'b'],
				['c', 'd'],
			];

			const result = exploreStructure(data, {maxDepth: 4});

			expect(isOk(result)).toBe(true);
			if (!isOk(result)) {
				return;
			}

			const paths = result.data.paths.value;
			expect(paths).toContain('$[0][0]');
			expect(paths).toContain('$[0][1]');
			expect(paths).toContain('$[1][0]');
			expect(paths).toContain('$[1][1]');
		});
	});

	describe('depth limit enforcement', () => {
		it('stops at maxDepth and treats node as leaf', () => {
			// Create deeply nested structure beyond maxDepth
			const data = {
				a: {
					b: {
						c: {
							d: {
								e: 'unreachable',
							},
						},
					},
				},
			};

			const result = exploreStructure(data, {maxDepth: 3});

			expect(isOk(result)).toBe(true);
			if (!isOk(result)) {
				return;
			}

			const paths = result.data.paths.value;
			// At depth 3, should stop at $.a.b.c (even though it has children)
			expect(paths).toContain('$.a.b.c');
			// Should NOT traverse beyond maxDepth
			expect(paths).not.toContain('$.a.b.c.d');
			expect(paths).not.toContain('$.a.b.c.d.e');
		});
	});
});
