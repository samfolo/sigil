import {describe, expect, it} from 'vitest';

import {MAX_JSON_DEPTH} from '../types';

import {calculateDepth} from './calculateDepth';

describe('calculateDepth', () => {
	describe('primitives', () => {
		it('returns 0 for string', () => {
			expect(calculateDepth('hello')).toBe(0);
		});

		it('returns 0 for number', () => {
			expect(calculateDepth(42)).toBe(0);
		});

		it('returns 0 for boolean', () => {
			expect(calculateDepth(true)).toBe(0);
		});

		it('returns 0 for null', () => {
			expect(calculateDepth(null)).toBe(0);
		});
	});

	describe('arrays', () => {
		it('returns 1 for empty array', () => {
			expect(calculateDepth([])).toBe(1);
		});

		it('returns 1 for flat array', () => {
			expect(calculateDepth([1, 2, 3])).toBe(1);
		});

		it('returns 2 for nested array (1 level)', () => {
			expect(calculateDepth([[1, 2], [3, 4]])).toBe(2);
		});

		it('returns 3 for nested array (2 levels)', () => {
			expect(calculateDepth([[[1, 2]]])).toBe(3);
		});

		it('calculates max depth across mixed nesting', () => {
			expect(calculateDepth([1, [2, [3, [4]]]])).toBe(4);
		});

		it('returns 1 for array of primitives', () => {
			expect(calculateDepth(['a', 'b', 'c'])).toBe(1);
		});
	});

	describe('objects', () => {
		it('returns 1 for empty object', () => {
			expect(calculateDepth({})).toBe(1);
		});

		it('returns 1 for flat object', () => {
			expect(calculateDepth({a: 1, b: 2})).toBe(1);
		});

		it('returns 2 for nested object (1 level)', () => {
			expect(calculateDepth({a: {b: 1}})).toBe(2);
		});

		it('returns 3 for nested object (2 levels)', () => {
			expect(calculateDepth({a: {b: {c: 1}}})).toBe(3);
		});

		it('calculates max depth across mixed nesting', () => {
			expect(calculateDepth({
				shallow: 1,
				deep: {level2: {level3: {level4: 'value'}}},
			})).toBe(4);
		});
	});

	describe('mixed structures', () => {
		it('handles arrays within objects', () => {
			expect(calculateDepth({items: [1, 2, 3]})).toBe(2);
		});

		it('handles objects within arrays', () => {
			expect(calculateDepth([{a: 1}, {b: 2}])).toBe(2);
		});

		it('handles complex nested structures', () => {
			expect(calculateDepth({
				users: [
					{name: 'Alice', tags: ['admin', 'user']},
					{name: 'Bob', tags: ['user']},
				],
			})).toBe(4);
		});
	});

	describe('depth capping', () => {
		it('caps depth at MAX_JSON_DEPTH for deeply nested arrays', () => {
			// Create array nested exactly 20 levels
			let nested: unknown = 'value';
			for (let i = 0; i < 20; i++) {
				nested = [nested];
			}

			expect(calculateDepth(nested)).toBe(20);
		});

		it('returns MAX_JSON_DEPTH + 1 when depth exceeds cap', () => {
			// Create array nested 25 levels (exceeds cap)
			let nested: unknown = 'value';
			for (let i = 0; i < 25; i++) {
				nested = [nested];
			}

			expect(calculateDepth(nested)).toBe(MAX_JSON_DEPTH + 1);
		});

		it('caps depth at MAX_JSON_DEPTH for deeply nested objects', () => {
			// Create object nested exactly 20 levels
			let nested: unknown = 'value';
			for (let i = 0; i < 20; i++) {
				nested = {key: nested};
			}

			expect(calculateDepth(nested)).toBe(20);
		});

		it('returns MAX_JSON_DEPTH + 1 when object depth exceeds cap', () => {
			// Create object nested 25 levels (exceeds cap)
			let nested: unknown = 'value';
			for (let i = 0; i < 25; i++) {
				nested = {key: nested};
			}

			expect(calculateDepth(nested)).toBe(MAX_JSON_DEPTH + 1);
		});

		it('returns MAX_JSON_DEPTH for empty array at depth limit', () => {
			// Create nested structure ending in empty array at depth 20
			let nested: unknown = [];
			for (let i = 0; i < 19; i++) {
				nested = [nested];
			}

			expect(calculateDepth(nested)).toBe(20);
		});

		it('returns MAX_JSON_DEPTH for empty object at depth limit', () => {
			// Create nested structure ending in empty object at depth 20
			let nested: unknown = {};
			for (let i = 0; i < 19; i++) {
				nested = {key: nested};
			}

			expect(calculateDepth(nested)).toBe(20);
		});
	});

	describe('edge cases', () => {
		it('handles array with single element', () => {
			expect(calculateDepth([42])).toBe(1);
		});

		it('handles object with single property', () => {
			expect(calculateDepth({key: 'value'})).toBe(1);
		});

		it('handles array of empty arrays', () => {
			expect(calculateDepth([[], [], []])).toBe(2);
		});

		it('handles object with empty object values', () => {
			expect(calculateDepth({a: {}, b: {}, c: {}})).toBe(2);
		});
	});
});
