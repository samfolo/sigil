import {describe, expect, it} from 'vitest';

import {ERROR_CODES} from '@sigil/src/common/errors';
import {isErr, isOk} from '@sigil/src/common/errors/result';

import {queryJSONPath, queryMultipleValues, querySingleValue} from './queryJSONPath';

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
			const accessor = 'name';
			const result = queryJSONPath(data, accessor);
			expect(isErr(result)).toBe(true);
			if (isErr(result)) {
				expect(Array.isArray(result.error)).toBe(true);
				expect(result.error).toHaveLength(1);
				expect(result.error.at(0)?.code).toBe(ERROR_CODES.INVALID_ACCESSOR);
				expect(result.error.at(0)?.severity).toBe('error');
				expect(result.error.at(0)?.category).toBe('data');
				expect(result.error.at(0)?.path).toBe(accessor);
				expect(result.error.at(0)?.context).toEqual({
					accessor,
					reason: 'JSONPath must start with $',
				});
				expect(result.error.at(0)?.suggestion).toContain('prepend');
				expect(result.error.at(0)?.suggestion).toContain('$');
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
		it('should error for null data', () => {
			const accessor = '$.field';
			const result = queryJSONPath(null, accessor);
			expect(isErr(result)).toBe(true);
			if (isErr(result)) {
				expect(Array.isArray(result.error)).toBe(true);
				expect(result.error).toHaveLength(1);
				expect(result.error.at(0)?.code).toBe(ERROR_CODES.QUERY_ERROR);
				expect(result.error.at(0)?.severity).toBe('error');
				expect(result.error.at(0)?.category).toBe('data');
				expect(result.error.at(0)?.path).toBe('$');
				expect(result.error.at(0)?.context).toHaveProperty('jsonPath', accessor);
				expect(result.error.at(0)?.context).toHaveProperty('reason');
				expect(result.error.at(0)?.context).toHaveProperty('dataType', 'object');
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

	describe('querySingleValue', () => {
		describe('valid single value queries', () => {
			it('should return single value for simple path', () => {
				const data = {name: 'Alice', age: 30};
				const result = querySingleValue(data, '$.name');
				expect(isOk(result)).toBe(true);
				if (isOk(result)) {
					expect(result.data).toBe('Alice');
				}
			});

			it('should return single value for nested path', () => {
				const data = {user: {profile: {email: 'alice@example.com'}}};
				const result = querySingleValue(data, '$.user.profile.email');
				expect(isOk(result)).toBe(true);
				if (isOk(result)) {
					expect(result.data).toBe('alice@example.com');
				}
			});

			it('should return single value for array indexing', () => {
				const data = {items: ['apple', 'banana', 'cherry']};
				const result = querySingleValue(data, '$.items[0]');
				expect(isOk(result)).toBe(true);
				if (isOk(result)) {
					expect(result.data).toBe('apple');
				}
			});

			it('should return undefined for missing field', () => {
				const data = {name: 'Alice'};
				const result = querySingleValue(data, '$.missing');
				expect(isOk(result)).toBe(true);
				if (isOk(result)) {
					expect(result.data).toBeUndefined();
				}
			});

			it('should return null for null value', () => {
				const data = {value: null};
				const result = querySingleValue(data, '$.value');
				expect(isOk(result)).toBe(true);
				if (isOk(result)) {
					expect(result.data).toBeNull();
				}
			});
		});

		describe('array results should error', () => {
			it('should error for wildcard query (returns array)', () => {
				const data = {
					store: {
						book: [
							{title: 'Book A', price: 10},
							{title: 'Book B', price: 20},
						],
					},
				};
				const accessor = '$.store.book[*].title';
				const result = querySingleValue(data, accessor);
				expect(isErr(result)).toBe(true);
				if (isErr(result)) {
					expect(Array.isArray(result.error)).toBe(true);
					expect(result.error).toHaveLength(1);
					expect(result.error.at(0)?.code).toBe(ERROR_CODES.EXPECTED_SINGLE_VALUE);
					expect(result.error.at(0)?.severity).toBe('error');
					expect(result.error.at(0)?.category).toBe('data');
					expect(result.error.at(0)?.path).toBe(accessor);
					expect(result.error.at(0)?.context).toEqual({
						accessor,
						resultCount: 2,
					});
					expect(result.error.at(0)?.suggestion).toContain('wildcard');
					expect(result.error.at(0)?.suggestion).toContain('[*]');
					expect(result.error.at(0)?.suggestion).toContain('[0]');
				}
			});

			it('should error for filter query (returns array)', () => {
				const data = {
					products: [
						{name: 'Laptop', price: 1000},
						{name: 'Mouse', price: 25},
						{name: 'Keyboard', price: 75},
					],
				};
				const accessor = '$.products[?(@.price < 100)]';
				const result = querySingleValue(data, accessor);
				expect(isErr(result)).toBe(true);
				if (isErr(result)) {
					expect(Array.isArray(result.error)).toBe(true);
					expect(result.error).toHaveLength(1);
					expect(result.error.at(0)?.code).toBe(ERROR_CODES.EXPECTED_SINGLE_VALUE);
					expect(result.error.at(0)?.severity).toBe('error');
					expect(result.error.at(0)?.category).toBe('data');
					expect(result.error.at(0)?.path).toBe(accessor);
					expect(result.error.at(0)?.context).toEqual({
						accessor,
						resultCount: 2,
					});
					// Filter queries don't contain [*] or .., so use default suggestion
					expect(result.error.at(0)?.suggestion).toContain('specific index');
					expect(result.error.at(0)?.suggestion).toContain('[0]');
				}
			});

			it('should error for recursive descent (returns array)', () => {
				const data = {
					level1: {
						title: 'Level 1',
						level2: {
							title: 'Level 2',
						},
					},
					other: {
						title: 'Other',
					},
				};
				const accessor = '$..title';
				const result = querySingleValue(data, accessor);
				expect(isErr(result)).toBe(true);
				if (isErr(result)) {
					expect(Array.isArray(result.error)).toBe(true);
					expect(result.error).toHaveLength(1);
					expect(result.error.at(0)?.code).toBe(ERROR_CODES.EXPECTED_SINGLE_VALUE);
					expect(result.error.at(0)?.severity).toBe('error');
					expect(result.error.at(0)?.category).toBe('data');
					expect(result.error.at(0)?.path).toBe(accessor);
					expect(result.error.at(0)?.context).toEqual({
						accessor,
						resultCount: 3,
					});
					expect(result.error.at(0)?.suggestion).toContain('recursive descent');
					expect(result.error.at(0)?.suggestion).toContain('..');
					expect(result.error.at(0)?.suggestion).toContain('specific');
				}
			});
		});

		describe('error handling', () => {
			it('should error for invalid accessor (no $ prefix)', () => {
				const data = {name: 'Alice'};
				const accessor = 'name';
				const result = querySingleValue(data, accessor);
				expect(isErr(result)).toBe(true);
				if (isErr(result)) {
					expect(Array.isArray(result.error)).toBe(true);
					expect(result.error).toHaveLength(1);
					expect(result.error.at(0)?.code).toBe(ERROR_CODES.INVALID_ACCESSOR);
					expect(result.error.at(0)?.severity).toBe('error');
					expect(result.error.at(0)?.category).toBe('data');
				}
			});
		});
	});

	describe('queryMultipleValues', () => {
		describe('array results', () => {
			it('should return array for wildcard query', () => {
				const data = {
					store: {
						book: [
							{title: 'Book A', price: 10},
							{title: 'Book B', price: 20},
							{title: 'Book C', price: 15},
						],
					},
				};
				const result = queryMultipleValues(data, '$.store.book[*].title');
				expect(isOk(result)).toBe(true);
				if (isOk(result)) {
					expect(result.data).toEqual(['Book A', 'Book B', 'Book C']);
				}
			});

			it('should return array for filter query', () => {
				const data = {
					products: [
						{name: 'Laptop', price: 1000},
						{name: 'Mouse', price: 25},
						{name: 'Keyboard', price: 75},
					],
				};
				const result = queryMultipleValues(data, '$.products[?(@.price < 100)]');
				expect(isOk(result)).toBe(true);
				if (isOk(result)) {
					expect(result.data).toHaveLength(2);
					expect(result.data).toEqual([
						{name: 'Mouse', price: 25},
						{name: 'Keyboard', price: 75},
					]);
				}
			});

			it('should return array for recursive descent', () => {
				const data = {
					level1: {
						title: 'Level 1',
						level2: {
							title: 'Level 2',
						},
					},
					other: {
						title: 'Other',
					},
				};
				const result = queryMultipleValues(data, '$..title');
				expect(isOk(result)).toBe(true);
				if (isOk(result)) {
					expect(result.data).toEqual(['Level 1', 'Level 2', 'Other']);
				}
			});
		});

		describe('single values (lenient wrapping)', () => {
			it('should wrap single value in array', () => {
				const data = {name: 'Alice'};
				const result = queryMultipleValues(data, '$.name');
				expect(isOk(result)).toBe(true);
				if (isOk(result)) {
					expect(result.data).toEqual(['Alice']);
				}
			});

			it('should wrap nested single value in array', () => {
				const data = {user: {profile: {email: 'alice@example.com'}}};
				const result = queryMultipleValues(data, '$.user.profile.email');
				expect(isOk(result)).toBe(true);
				if (isOk(result)) {
					expect(result.data).toEqual(['alice@example.com']);
				}
			});

			it('should wrap array-indexed single value in array', () => {
				const data = {items: ['apple', 'banana', 'cherry']};
				const result = queryMultipleValues(data, '$.items[0]');
				expect(isOk(result)).toBe(true);
				if (isOk(result)) {
					expect(result.data).toEqual(['apple']);
				}
			});
		});

		describe('missing values', () => {
			it('should return empty array for missing field', () => {
				const data = {name: 'Alice'};
				const result = queryMultipleValues(data, '$.missing');
				expect(isOk(result)).toBe(true);
				if (isOk(result)) {
					expect(result.data).toEqual([]);
				}
			});

			it('should return empty array for undefined', () => {
				const data = {value: undefined};
				const result = queryMultipleValues(data, '$.value');
				expect(isOk(result)).toBe(true);
				if (isOk(result)) {
					expect(result.data).toEqual([]);
				}
			});
		});

		describe('null handling', () => {
			it('should wrap null value in array', () => {
				const data = {value: null};
				const result = queryMultipleValues(data, '$.value');
				expect(isOk(result)).toBe(true);
				if (isOk(result)) {
					expect(result.data).toEqual([null]);
				}
			});
		});

		describe('error handling', () => {
			it('should error for invalid accessor (no $ prefix)', () => {
				const data = {name: 'Alice'};
				const accessor = 'name';
				const result = queryMultipleValues(data, accessor);
				expect(isErr(result)).toBe(true);
				if (isErr(result)) {
					expect(Array.isArray(result.error)).toBe(true);
					expect(result.error).toHaveLength(1);
					expect(result.error.at(0)?.code).toBe(ERROR_CODES.INVALID_ACCESSOR);
					expect(result.error.at(0)?.severity).toBe('error');
					expect(result.error.at(0)?.category).toBe('data');
				}
			});
		});
	});
});
