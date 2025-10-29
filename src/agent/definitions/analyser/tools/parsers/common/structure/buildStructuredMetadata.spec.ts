import {describe, expect, it} from 'vitest';

import type {SizeMetrics} from '@sigil/src/agent/definitions/analyser/tools/common';

import {buildStructuredMetadata} from './buildStructuredMetadata';
import {MAX_STRUCTURE_EXTRACTED_ITEMS, MAX_STRUCTURE_PROBING_DEPTH, MAX_STRUCTURE_VALUE_LENGTH} from './constants';

const MOCK_SIZE: SizeMetrics = {
	bytes: 100,
	characters: 100,
	lines: 1,
};

describe('buildStructuredMetadata', () => {
	describe('primitives', () => {
		it('identifies null', () => {
			const metadata = buildStructuredMetadata(null, MOCK_SIZE);

			expect(metadata.structure).toBe('null');
			expect(metadata.size).toEqual(MOCK_SIZE);
		});

		it('identifies string', () => {
			const metadata = buildStructuredMetadata('hello', MOCK_SIZE);

			expect(metadata.structure).toBe('string');
			expect(metadata.size).toEqual(MOCK_SIZE);
		});

		it('identifies number', () => {
			const metadata = buildStructuredMetadata(42, MOCK_SIZE);

			expect(metadata.structure).toBe('number');
			expect(metadata.size).toEqual(MOCK_SIZE);
		});

		it('identifies boolean', () => {
			const metadata = buildStructuredMetadata(true, MOCK_SIZE);

			expect(metadata.structure).toBe('boolean');
			expect(metadata.size).toEqual(MOCK_SIZE);
		});
	});

	describe('arrays', () => {
		it('analyses empty array', () => {
			const metadata = buildStructuredMetadata([], MOCK_SIZE);

			if (metadata.structure !== 'array') {
				throw new Error('Expected array structure');
			}

			expect(metadata.elementCount).toBe(0);
			expect(metadata.depth.value).toBe(1);
			expect(metadata.depth.exact).toBe(true);
			expect(metadata.size).toEqual(MOCK_SIZE);
		});

		it('analyses flat array', () => {
			const metadata = buildStructuredMetadata([1, 2, 3], MOCK_SIZE);

			if (metadata.structure !== 'array') {
				throw new Error('Expected array structure');
			}

			expect(metadata.elementCount).toBe(3);
			expect(metadata.depth.value).toBe(1);
			expect(metadata.depth.exact).toBe(true);
		});

		it('analyses nested array', () => {
			const metadata = buildStructuredMetadata([[1, 2], [3, 4]], MOCK_SIZE);

			if (metadata.structure !== 'array') {
				throw new Error('Expected array structure');
			}

			expect(metadata.elementCount).toBe(2);
			expect(metadata.depth.value).toBe(2);
			expect(metadata.depth.exact).toBe(true);
		});

		it('caps depth at maxDepth', () => {
			// Create deeply nested array (exceeds cap by 5)
			let nested: unknown = 'value';
			for (let i = 0; i < MAX_STRUCTURE_PROBING_DEPTH + 5; i++) {
				nested = [nested];
			}

			const metadata = buildStructuredMetadata(nested, MOCK_SIZE);

			if (metadata.structure !== 'array') {
				throw new Error('Expected array structure');
			}

			expect(metadata.depth.value).toBe(MAX_STRUCTURE_PROBING_DEPTH);
			expect(metadata.depth.exact).toBe(false);
		});

		it('respects custom maxDepth option', () => {
			const customDepth = 10;
			const customMaxDepth = 5;

			// Create array nested customDepth levels
			let nested: unknown = 'value';
			for (let i = 0; i < customDepth; i++) {
				nested = [nested];
			}

			const metadata = buildStructuredMetadata(nested, MOCK_SIZE, {
				maxDepth: customMaxDepth,
			});

			if (metadata.structure !== 'array') {
				throw new Error('Expected array structure');
			}

			expect(metadata.depth.value).toBe(customMaxDepth);
			expect(metadata.depth.exact).toBe(false);
		});
	});

	describe('objects', () => {
		it('analyses empty object', () => {
			const metadata = buildStructuredMetadata({}, MOCK_SIZE);

			if (metadata.structure !== 'object') {
				throw new Error('Expected object structure');
			}

			expect(metadata.topLevelKeys).toEqual([]);
			expect(metadata.totalKeyCount).toBe(0);
			expect(metadata.depth.value).toBe(1);
			expect(metadata.depth.exact).toBe(true);
			expect(metadata.size).toEqual(MOCK_SIZE);
		});

		it('analyses flat object', () => {
			const metadata = buildStructuredMetadata(
				{name: 'Alice', age: 30},
				MOCK_SIZE
			);

			if (metadata.structure !== 'object') {
				throw new Error('Expected object structure');
			}

			expect(metadata.topLevelKeys).toEqual([
				{value: 'age', exact: true},
				{value: 'name', exact: true},
			]);
			expect(metadata.totalKeyCount).toBe(2);
			expect(metadata.depth.value).toBe(1);
			expect(metadata.depth.exact).toBe(true);
		});

		it('sorts keys alphabetically', () => {
			const metadata = buildStructuredMetadata(
				{zebra: 1, apple: 2, monkey: 3},
				MOCK_SIZE
			);

			if (metadata.structure !== 'object') {
				throw new Error('Expected object structure');
			}

			expect(metadata.topLevelKeys.map((k) => k.value)).toEqual([
				'apple',
				'monkey',
				'zebra',
			]);
		});

		it('returns first N keys when configured', () => {
			const totalKeyCount = 100;
			const customMaxKeys = 10;

			const keys = Array.from({length: totalKeyCount}, (_, i) =>
				`key${i.toString().padStart(3, '0')}`
			);
			const obj = Object.fromEntries(keys.map((k) => [k, 'value']));

			const metadata = buildStructuredMetadata(obj, MOCK_SIZE, {
				maxKeys: customMaxKeys,
			});

			if (metadata.structure !== 'object') {
				throw new Error('Expected object structure');
			}

			expect(metadata.topLevelKeys).toHaveLength(customMaxKeys);
			expect(metadata.totalKeyCount).toBe(totalKeyCount);
			expect(metadata.topLevelKeys.at(0)?.value).toBe('key000');
			expect(metadata.topLevelKeys.at(-1)?.value).toBe('key009');
		});

		it('returns default maximum keys when not configured', () => {
			const totalKeyCount = 100;

			const keys = Array.from({length: totalKeyCount}, (_, i) =>
				`key${i.toString().padStart(3, '0')}`
			);
			const obj = Object.fromEntries(keys.map((k) => [k, 'value']));

			const metadata = buildStructuredMetadata(obj, MOCK_SIZE);

			if (metadata.structure !== 'object') {
				throw new Error('Expected object structure');
			}

			expect(metadata.topLevelKeys).toHaveLength(
				MAX_STRUCTURE_EXTRACTED_ITEMS
			);
			expect(metadata.totalKeyCount).toBe(totalKeyCount);
		});

		it('truncates long keys', () => {
			const longKey = 'a'.repeat(MAX_STRUCTURE_VALUE_LENGTH + 50);
			const metadata = buildStructuredMetadata({[longKey]: 'value'}, MOCK_SIZE);

			if (metadata.structure !== 'object') {
				throw new Error('Expected object structure');
			}

			expect(metadata.topLevelKeys).toHaveLength(1);
			expect(metadata.topLevelKeys.at(0)?.exact).toBe(false);
			expect(metadata.topLevelKeys.at(0)?.value).toHaveLength(
				MAX_STRUCTURE_VALUE_LENGTH
			);
			expect(metadata.topLevelKeys.at(0)?.value).toMatch(/^a+\.\.\.$/);
		});

		it('respects custom maxKeyLength option', () => {
			const customKeyLength = 50;
			const customMaxKeyLength = 20;
			const longKey = 'a'.repeat(customKeyLength);
			const metadata = buildStructuredMetadata(
				{[longKey]: 'value'},
				MOCK_SIZE,
				{maxKeyLength: customMaxKeyLength}
			);

			if (metadata.structure !== 'object') {
				throw new Error('Expected object structure');
			}

			expect(metadata.topLevelKeys.at(0)?.exact).toBe(false);
			expect(metadata.topLevelKeys.at(0)?.value).toHaveLength(customMaxKeyLength);
			expect(metadata.topLevelKeys.at(0)?.value).toMatch(/^a+\.\.\.$/);
		});

		it('does not truncate keys at exact maxKeyLength', () => {
			const exactKey = 'a'.repeat(MAX_STRUCTURE_VALUE_LENGTH);
			const metadata = buildStructuredMetadata({[exactKey]: 'value'}, MOCK_SIZE);

			if (metadata.structure !== 'object') {
				throw new Error('Expected object structure');
			}

			expect(metadata.topLevelKeys.at(0)?.exact).toBe(true);
			expect(metadata.topLevelKeys.at(0)?.value).toBe(exactKey);
		});

		it('analyses nested object', () => {
			const metadata = buildStructuredMetadata(
				{user: {name: 'Alice'}},
				MOCK_SIZE
			);

			if (metadata.structure !== 'object') {
				throw new Error('Expected object structure');
			}

			expect(metadata.depth.value).toBe(2);
			expect(metadata.depth.exact).toBe(true);
		});

		it('caps depth at maxDepth', () => {
			// Create deeply nested object (exceeds cap by 5)
			let nested: unknown = 'value';
			for (let i = 0; i < MAX_STRUCTURE_PROBING_DEPTH + 5; i++) {
				nested = {key: nested};
			}

			const metadata = buildStructuredMetadata(nested, MOCK_SIZE);

			if (metadata.structure !== 'object') {
				throw new Error('Expected object structure');
			}

			expect(metadata.depth.value).toBe(MAX_STRUCTURE_PROBING_DEPTH);
			expect(metadata.depth.exact).toBe(false);
		});
	});

	describe('mixed structures', () => {
		it('handles arrays within objects', () => {
			const metadata = buildStructuredMetadata(
				{items: [1, 2, 3]},
				MOCK_SIZE
			);

			if (metadata.structure !== 'object') {
				throw new Error('Expected object structure');
			}

			expect(metadata.depth.value).toBe(2);
			expect(metadata.depth.exact).toBe(true);
		});

		it('handles objects within arrays', () => {
			const metadata = buildStructuredMetadata([{a: 1}, {b: 2}], MOCK_SIZE);

			if (metadata.structure !== 'array') {
				throw new Error('Expected array structure');
			}

			expect(metadata.depth.value).toBe(2);
			expect(metadata.depth.exact).toBe(true);
		});

		it('handles complex nested structures', () => {
			const metadata = buildStructuredMetadata(
				{
					users: [
						{name: 'Alice', tags: ['admin', 'user']},
						{name: 'Bob', tags: ['user']},
					],
				},
				MOCK_SIZE
			);

			if (metadata.structure !== 'object') {
				throw new Error('Expected object structure');
			}

			expect(metadata.depth.value).toBe(4);
			expect(metadata.depth.exact).toBe(true);
		});
	});

	describe('configuration options', () => {
		it('applies all custom options together', () => {
			const keys = Array.from({length: 50}, () => 'a'.repeat(50));
			const obj = Object.fromEntries(keys.map((k, i) => [`${k}${i}`, 'value']));

			const metadata = buildStructuredMetadata(obj, MOCK_SIZE, {
				maxKeys: 5,
				maxKeyLength: 20,
				maxDepth: 10,
			});

			if (metadata.structure !== 'object') {
				throw new Error('Expected object structure');
			}

			expect(metadata.topLevelKeys).toHaveLength(5);
			expect(metadata.topLevelKeys.at(0)?.value).toHaveLength(20);
			expect(metadata.totalKeyCount).toBe(50);
		});

		it('uses defaults when options not provided', () => {
			const keys = Array.from({length: 100}, (_, i) =>
				`${'a'.repeat(150)}${i}`
			);
			const obj = Object.fromEntries(keys.map((k) => [k, 'value']));

			const metadata = buildStructuredMetadata(obj, MOCK_SIZE);

			if (metadata.structure !== 'object') {
				throw new Error('Expected object structure');
			}

			expect(metadata.topLevelKeys).toHaveLength(
				MAX_STRUCTURE_EXTRACTED_ITEMS
			);
			expect(metadata.topLevelKeys.at(0)?.value).toHaveLength(
				MAX_STRUCTURE_VALUE_LENGTH
			);
		});
	});
});
