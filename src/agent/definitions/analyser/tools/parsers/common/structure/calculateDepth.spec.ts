import {describe, expect, it} from 'vitest';

import {calculateDepth} from './calculateDepth';

const MAX_DEPTH = 20;

describe('calculateDepth', () => {
	describe('primitives', () => {
		it('returns 0 for string', () => {
			expect(calculateDepth('hello', MAX_DEPTH)).toBe(0);
		});

		it('returns 0 for number', () => {
			expect(calculateDepth(42, MAX_DEPTH)).toBe(0);
		});

		it('returns 0 for boolean', () => {
			expect(calculateDepth(true, MAX_DEPTH)).toBe(0);
		});

		it('returns 0 for null', () => {
			expect(calculateDepth(null, MAX_DEPTH)).toBe(0);
		});
	});

	describe('arrays', () => {
		it('returns 1 for empty array', () => {
			expect(calculateDepth([], MAX_DEPTH)).toBe(1);
		});

		it('returns 1 for flat array', () => {
			expect(calculateDepth([1, 2, 3], MAX_DEPTH)).toBe(1);
		});

		it('returns 2 for nested array (1 level)', () => {
			expect(calculateDepth([[1, 2], [3, 4]], MAX_DEPTH)).toBe(2);
		});

		it('returns 3 for nested array (2 levels)', () => {
			expect(calculateDepth([[[1, 2]]], MAX_DEPTH)).toBe(3);
		});

		it('calculates max depth across mixed nesting', () => {
			expect(calculateDepth([1, [2, [3, [4]]]], MAX_DEPTH)).toBe(4);
		});

		it('returns 1 for array of primitives', () => {
			expect(calculateDepth(['a', 'b', 'c'], MAX_DEPTH)).toBe(1);
		});
	});

	describe('objects', () => {
		it('returns 1 for empty object', () => {
			expect(calculateDepth({}, MAX_DEPTH)).toBe(1);
		});

		it('returns 1 for flat object', () => {
			expect(calculateDepth({a: 1, b: 2}, MAX_DEPTH)).toBe(1);
		});

		it('returns 2 for nested object (1 level)', () => {
			expect(calculateDepth({a: {b: 1}}, MAX_DEPTH)).toBe(2);
		});

		it('returns 3 for nested object (2 levels)', () => {
			expect(calculateDepth({a: {b: {c: 1}}}, MAX_DEPTH)).toBe(3);
		});

		it('calculates max depth across mixed nesting', () => {
			expect(calculateDepth({
				shallow: 1,
				deep: {level2: {level3: {level4: 'value'}}},
			}, MAX_DEPTH)).toBe(4);
		});
	});

	describe('mixed structures', () => {
		it('handles arrays within objects', () => {
			expect(calculateDepth({items: [1, 2, 3]}, MAX_DEPTH)).toBe(2);
		});

		it('handles objects within arrays', () => {
			expect(calculateDepth([{a: 1}, {b: 2}], MAX_DEPTH)).toBe(2);
		});

		it('handles complex nested structures', () => {
			expect(calculateDepth({
				users: [
					{name: 'Alice', tags: ['admin', 'user']},
					{name: 'Bob', tags: ['user']},
				],
			}, MAX_DEPTH)).toBe(4);
		});
	});

	describe('depth capping', () => {
		it('caps depth at maxDepth for deeply nested arrays', () => {
			// Create array nested exactly 20 levels
			let nested: unknown = 'value';
			for (let i = 0; i < 20; i++) {
				nested = [nested];
			}

			expect(calculateDepth(nested, MAX_DEPTH)).toBe(20);
		});

		it('returns maxDepth + 1 when depth exceeds cap', () => {
			// Create array nested 25 levels (exceeds cap)
			let nested: unknown = 'value';
			for (let i = 0; i < 25; i++) {
				nested = [nested];
			}

			expect(calculateDepth(nested, MAX_DEPTH)).toBe(MAX_DEPTH + 1);
		});

		it('caps depth at maxDepth for deeply nested objects', () => {
			// Create object nested exactly 20 levels
			let nested: unknown = 'value';
			for (let i = 0; i < 20; i++) {
				nested = {key: nested};
			}

			expect(calculateDepth(nested, MAX_DEPTH)).toBe(20);
		});

		it('returns maxDepth + 1 when object depth exceeds cap', () => {
			// Create object nested 25 levels (exceeds cap)
			let nested: unknown = 'value';
			for (let i = 0; i < 25; i++) {
				nested = {key: nested};
			}

			expect(calculateDepth(nested, MAX_DEPTH)).toBe(MAX_DEPTH + 1);
		});

		it('returns maxDepth for empty array at depth limit', () => {
			// Create nested structure ending in empty array at depth 20
			let nested: unknown = [];
			for (let i = 0; i < 19; i++) {
				nested = [nested];
			}

			expect(calculateDepth(nested, MAX_DEPTH)).toBe(20);
		});

		it('returns maxDepth for empty object at depth limit', () => {
			// Create nested structure ending in empty object at depth 20
			let nested: unknown = {};
			for (let i = 0; i < 19; i++) {
				nested = {key: nested};
			}

			expect(calculateDepth(nested, MAX_DEPTH)).toBe(20);
		});

		it('respects custom maxDepth parameter', () => {
			// Create array nested 10 levels
			let nested: unknown = 'value';
			for (let i = 0; i < 10; i++) {
				nested = [nested];
			}

			// With maxDepth of 5, should return 6 (exceeded)
			expect(calculateDepth(nested, 5)).toBe(6);

			// With maxDepth of 15, should return exact depth of 10
			expect(calculateDepth(nested, 15)).toBe(10);
		});
	});

	describe('edge cases', () => {
		it('handles array with single element', () => {
			expect(calculateDepth([42], MAX_DEPTH)).toBe(1);
		});

		it('handles object with single property', () => {
			expect(calculateDepth({key: 'value'}, MAX_DEPTH)).toBe(1);
		});

		it('handles array of empty arrays', () => {
			expect(calculateDepth([[], [], []], MAX_DEPTH)).toBe(2);
		});

		it('handles object with empty object values', () => {
			expect(calculateDepth({a: {}, b: {}, c: {}}, MAX_DEPTH)).toBe(2);
		});
	});
});
