import {describe, expect, it} from 'vitest';

import {isErr, isOk} from '@sigil/src/common/errors/result';

import {queryJSONPath} from './queryJSONPath';

describe('queryJSONPath', () => {
	describe('simple paths', () => {
		const data = {
			name: 'Alice',
			age: 30,
			active: true,
		};

		it('should query simple string field', () => {
			const result = queryJSONPath(data, '$.name');
			expect(isOk(result)).toBe(true);
			if (isOk(result)) {
				expect(result.data).toBe('Alice');
			}
		});

		it('should query simple number field', () => {
			const result = queryJSONPath(data, '$.age');
			expect(isOk(result)).toBe(true);
			if (isOk(result)) {
				expect(result.data).toBe(30);
			}
		});

		it('should query simple boolean field', () => {
			const result = queryJSONPath(data, '$.active');
			expect(isOk(result)).toBe(true);
			if (isOk(result)) {
				expect(result.data).toBe(true);
			}
		});

		it('should return undefined for missing field', () => {
			const result = queryJSONPath(data, '$.missing');
			expect(isOk(result)).toBe(true);
			if (isOk(result)) {
				expect(result.data).toBeUndefined();
			}
		});
	});

	describe('nested paths', () => {
		const data = {
			user: {
				profile: {
					email: 'alice@example.com',
					location: {
						city: 'London',
						postcode: 'SW1A 1AA',
					},
				},
				settings: {
					theme: 'dark',
				},
			},
		};

		it('should query nested field (2 levels)', () => {
			const result = queryJSONPath(data, '$.user.settings.theme');
			expect(isOk(result)).toBe(true);
			if (isOk(result)) {
				expect(result.data).toBe('dark');
			}
		});

		it('should query nested field (3 levels)', () => {
			const result = queryJSONPath(data, '$.user.profile.email');
			expect(isOk(result)).toBe(true);
			if (isOk(result)) {
				expect(result.data).toBe('alice@example.com');
			}
		});

		it('should query deeply nested field (4 levels)', () => {
			const result = queryJSONPath(data, '$.user.profile.location.city');
			expect(isOk(result)).toBe(true);
			if (isOk(result)) {
				expect(result.data).toBe('London');
			}
		});

		it('should return undefined for missing nested field', () => {
			const result = queryJSONPath(data, '$.user.profile.missing');
			expect(isOk(result)).toBe(true);
			if (isOk(result)) {
				expect(result.data).toBeUndefined();
			}
		});
	});

	describe('array indexing', () => {
		const data = {
			items: ['apple', 'banana', 'cherry'],
			users: [
				{name: 'Alice', age: 30},
				{name: 'Bob', age: 25},
				{name: 'Charlie', age: 35},
			],
		};

		it('should query array element by index', () => {
			const result = queryJSONPath(data, '$.items[0]');
			expect(isOk(result)).toBe(true);
			if (isOk(result)) {
				expect(result.data).toBe('apple');
			}
		});

		it('should query last array element', () => {
			const result = queryJSONPath(data, '$.items[2]');
			expect(isOk(result)).toBe(true);
			if (isOk(result)) {
				expect(result.data).toBe('cherry');
			}
		});

		it('should query nested field in array element', () => {
			const result = queryJSONPath(data, '$.users[1].name');
			expect(isOk(result)).toBe(true);
			if (isOk(result)) {
				expect(result.data).toBe('Bob');
			}
		});

		it('should return undefined for out-of-bounds index', () => {
			const result = queryJSONPath(data, '$.items[99]');
			expect(isOk(result)).toBe(true);
			if (isOk(result)) {
				expect(result.data).toBeUndefined();
			}
		});
	});

	describe('wildcards', () => {
		const data = {
			store: {
				book: [
					{title: 'Book A', price: 10},
					{title: 'Book B', price: 20},
					{title: 'Book C', price: 15},
				],
			},
		};

		it('should query all elements with wildcard', () => {
			const result = queryJSONPath(data, '$.store.book[*].title');
			expect(isOk(result)).toBe(true);
			if (isOk(result)) {
				expect(result.data).toEqual(['Book A', 'Book B', 'Book C']);
			}
		});

		it('should query all prices with wildcard', () => {
			const result = queryJSONPath(data, '$.store.book[*].price');
			expect(isOk(result)).toBe(true);
			if (isOk(result)) {
				expect(result.data).toEqual([10, 20, 15]);
			}
		});
	});

	describe('filters', () => {
		const data = {
			products: [
				{name: 'Laptop', price: 1000, inStock: true},
				{name: 'Mouse', price: 25, inStock: false},
				{name: 'Keyboard', price: 75, inStock: true},
				{name: 'Monitor', price: 300, inStock: true},
			],
		};

		it('should filter by numeric comparison', () => {
			const result = queryJSONPath(data, '$.products[?(@.price < 100)]');
			expect(isOk(result)).toBe(true);
			if (isOk(result)) {
				expect(result.data).toEqual([
					{name: 'Mouse', price: 25, inStock: false},
					{name: 'Keyboard', price: 75, inStock: true},
				]);
			}
		});

		it('should filter by boolean value', () => {
			const result = queryJSONPath(data, '$.products[?(@.inStock === true)]');
			expect(isOk(result)).toBe(true);
			if (isOk(result)) {
				const items = result.data as Array<{name: string}>;
				expect(items).toHaveLength(3);
				expect(items.map((item) => item.name)).toEqual(['Laptop', 'Keyboard', 'Monitor']);
			}
		});
	});

	describe('recursive descent', () => {
		const data = {
			level1: {
				title: 'Level 1',
				level2: {
					title: 'Level 2',
					level3: {
						title: 'Level 3',
					},
				},
			},
			other: {
				title: 'Other',
			},
		};

		it('should find all fields recursively', () => {
			const result = queryJSONPath(data, '$..title');
			expect(isOk(result)).toBe(true);
			if (isOk(result)) {
				expect(result.data).toEqual(['Level 1', 'Level 2', 'Level 3', 'Other']);
			}
		});
	});

	describe('error handling', () => {
		const data = {name: 'Alice'};

		it('should return error for accessor without $ prefix', () => {
			const result = queryJSONPath(data, 'name');
			expect(isErr(result)).toBe(true);
			if (isErr(result)) {
				expect(result.error).toBe('invalid_accessor');
			}
		});

		it('should handle malformed accessor gracefully', () => {
			// jsonpath-plus returns undefined for malformed syntax rather than throwing
			const result = queryJSONPath(data, '$[invalid');
			expect(isOk(result)).toBe(true);
			if (isOk(result)) {
				expect(result.data).toBeUndefined();
			}
		});
	});

	describe('edge cases', () => {
		it('should handle null data', () => {
			const result = queryJSONPath(null, '$.field');
			expect(isOk(result)).toBe(true);
			if (isOk(result)) {
				expect(result.data).toBeUndefined();
			}
		});

		it('should handle empty object', () => {
			const result = queryJSONPath({}, '$.field');
			expect(isOk(result)).toBe(true);
			if (isOk(result)) {
				expect(result.data).toBeUndefined();
			}
		});

		it('should handle array as root', () => {
			const data = [1, 2, 3];
			const result = queryJSONPath(data, '$[0]');
			expect(isOk(result)).toBe(true);
			if (isOk(result)) {
				expect(result.data).toBe(1);
			}
		});

		it('should handle null values in data', () => {
			const data = {value: null};
			const result = queryJSONPath(data, '$.value');
			expect(isOk(result)).toBe(true);
			if (isOk(result)) {
				expect(result.data).toBeNull();
			}
		});
	});
});
