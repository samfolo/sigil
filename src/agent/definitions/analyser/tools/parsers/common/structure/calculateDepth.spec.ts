import {describe, expect, it} from 'vitest';

import {calculateDepth} from './calculateDepth';
import {MAX_STRUCTURE_PROBING_DEPTH} from './constants';

describe('calculateDepth', () => {
	describe('primitives', () => {
		it('returns 0 for string', () => {
			expect(calculateDepth('hello', MAX_STRUCTURE_PROBING_DEPTH)).toBe(0);
		});

		it('returns 0 for number', () => {
			expect(calculateDepth(42, MAX_STRUCTURE_PROBING_DEPTH)).toBe(0);
		});

		it('returns 0 for boolean', () => {
			expect(calculateDepth(true, MAX_STRUCTURE_PROBING_DEPTH)).toBe(0);
		});

		it('returns 0 for null', () => {
			expect(calculateDepth(null, MAX_STRUCTURE_PROBING_DEPTH)).toBe(0);
		});
	});

	describe('arrays', () => {
		it('returns 1 for empty array', () => {
			expect(calculateDepth([], MAX_STRUCTURE_PROBING_DEPTH)).toBe(1);
		});

		it('returns 1 for flat array', () => {
			expect(calculateDepth([1, 2, 3], MAX_STRUCTURE_PROBING_DEPTH)).toBe(1);
		});

		it('returns 2 for nested array (1 level)', () => {
			expect(calculateDepth([[1, 2], [3, 4]], MAX_STRUCTURE_PROBING_DEPTH)).toBe(2);
		});

		it('returns 3 for nested array (2 levels)', () => {
			expect(calculateDepth([[[1, 2]]], MAX_STRUCTURE_PROBING_DEPTH)).toBe(3);
		});

		it('calculates max depth across mixed nesting', () => {
			expect(calculateDepth([1, [2, [3, [4]]]], MAX_STRUCTURE_PROBING_DEPTH)).toBe(4);
		});

		it('returns 1 for array of primitives', () => {
			expect(calculateDepth(['a', 'b', 'c'], MAX_STRUCTURE_PROBING_DEPTH)).toBe(1);
		});
	});

	describe('objects', () => {
		it('returns 1 for empty object', () => {
			expect(calculateDepth({}, MAX_STRUCTURE_PROBING_DEPTH)).toBe(1);
		});

		it('returns 1 for flat object', () => {
			expect(calculateDepth({a: 1, b: 2}, MAX_STRUCTURE_PROBING_DEPTH)).toBe(1);
		});

		it('returns 2 for nested object (1 level)', () => {
			expect(calculateDepth({a: {b: 1}}, MAX_STRUCTURE_PROBING_DEPTH)).toBe(2);
		});

		it('returns 3 for nested object (2 levels)', () => {
			expect(calculateDepth({a: {b: {c: 1}}}, MAX_STRUCTURE_PROBING_DEPTH)).toBe(3);
		});

		it('calculates max depth across mixed nesting', () => {
			expect(calculateDepth({
				shallow: 1,
				deep: {level2: {level3: {level4: 'value'}}},
			}, MAX_STRUCTURE_PROBING_DEPTH)).toBe(4);
		});
	});

	describe('mixed structures', () => {
		it('handles arrays within objects', () => {
			expect(calculateDepth({items: [1, 2, 3]}, MAX_STRUCTURE_PROBING_DEPTH)).toBe(2);
		});

		it('handles objects within arrays', () => {
			expect(calculateDepth([{a: 1}, {b: 2}], MAX_STRUCTURE_PROBING_DEPTH)).toBe(2);
		});

		it('handles complex nested structures', () => {
			expect(calculateDepth({
				users: [
					{name: 'Alice', tags: ['admin', 'user']},
					{name: 'Bob', tags: ['user']},
				],
			}, MAX_STRUCTURE_PROBING_DEPTH)).toBe(4);
		});
	});

	describe('depth capping', () => {
		it('caps depth at maxDepth for deeply nested arrays', () => {
			// Create array nested exactly at max depth
			let nested: unknown = 'value';
			for (let i = 0; i < MAX_STRUCTURE_PROBING_DEPTH; i++) {
				nested = [nested];
			}

			expect(calculateDepth(nested, MAX_STRUCTURE_PROBING_DEPTH)).toBe(MAX_STRUCTURE_PROBING_DEPTH);
		});

		it('returns maxDepth + 1 when depth exceeds cap', () => {
			// Create array nested beyond max depth
			let nested: unknown = 'value';
			for (let i = 0; i < MAX_STRUCTURE_PROBING_DEPTH + 5; i++) {
				nested = [nested];
			}

			expect(calculateDepth(nested, MAX_STRUCTURE_PROBING_DEPTH)).toBe(MAX_STRUCTURE_PROBING_DEPTH + 1);
		});

		it('caps depth at maxDepth for deeply nested objects', () => {
			// Create object nested exactly at max depth
			let nested: unknown = 'value';
			for (let i = 0; i < MAX_STRUCTURE_PROBING_DEPTH; i++) {
				nested = {key: nested};
			}

			expect(calculateDepth(nested, MAX_STRUCTURE_PROBING_DEPTH)).toBe(MAX_STRUCTURE_PROBING_DEPTH);
		});

		it('returns maxDepth + 1 when object depth exceeds cap', () => {
			// Create object nested beyond max depth
			let nested: unknown = 'value';
			for (let i = 0; i < MAX_STRUCTURE_PROBING_DEPTH + 5; i++) {
				nested = {key: nested};
			}

			expect(calculateDepth(nested, MAX_STRUCTURE_PROBING_DEPTH)).toBe(MAX_STRUCTURE_PROBING_DEPTH + 1);
		});

		it('returns maxDepth for empty array at depth limit', () => {
			// Create nested structure ending in empty array at max depth
			let nested: unknown = [];
			for (let i = 0; i < MAX_STRUCTURE_PROBING_DEPTH - 1; i++) {
				nested = [nested];
			}

			expect(calculateDepth(nested, MAX_STRUCTURE_PROBING_DEPTH)).toBe(MAX_STRUCTURE_PROBING_DEPTH);
		});

		it('returns maxDepth for empty object at depth limit', () => {
			// Create nested structure ending in empty object at max depth
			let nested: unknown = {};
			for (let i = 0; i < MAX_STRUCTURE_PROBING_DEPTH - 1; i++) {
				nested = {key: nested};
			}

			expect(calculateDepth(nested, MAX_STRUCTURE_PROBING_DEPTH)).toBe(MAX_STRUCTURE_PROBING_DEPTH);
		});

		it('respects custom maxDepth parameter', () => {
			const customDepth = 10;
			const smallMaxDepth = 5;
			const largeMaxDepth = 15;

			// Create array nested customDepth levels
			let nested: unknown = 'value';
			for (let i = 0; i < customDepth; i++) {
				nested = [nested];
			}

			// With maxDepth of 5, should return 6 (exceeded)
			expect(calculateDepth(nested, smallMaxDepth)).toBe(smallMaxDepth + 1);

			// With maxDepth of 15, should return exact depth
			expect(calculateDepth(nested, largeMaxDepth)).toBe(customDepth);
		});
	});

	describe('edge cases', () => {
		it('handles array with single element', () => {
			expect(calculateDepth([42], MAX_STRUCTURE_PROBING_DEPTH)).toBe(1);
		});

		it('handles object with single property', () => {
			expect(calculateDepth({key: 'value'}, MAX_STRUCTURE_PROBING_DEPTH)).toBe(1);
		});

		it('handles array of empty arrays', () => {
			expect(calculateDepth([[], [], []], MAX_STRUCTURE_PROBING_DEPTH)).toBe(2);
		});

		it('handles object with empty object values', () => {
			expect(calculateDepth({a: {}, b: {}, c: {}}, MAX_STRUCTURE_PROBING_DEPTH)).toBe(2);
		});
	});
});
