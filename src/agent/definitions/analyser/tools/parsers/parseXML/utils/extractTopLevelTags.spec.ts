import {describe, expect, it} from 'vitest';

import {MAX_STRUCTURE_EXTRACTED_ITEMS, MAX_STRUCTURE_VALUE_LENGTH} from '../../common';

import {ATTRIBUTES_GROUP_NAME, TEXT_NODE_NAME} from '../constants';

import {extractTopLevelTags} from './extractTopLevelTags';

describe('extractTopLevelTags', () => {
	describe('primitives', () => {
		it('returns empty array for string', () => {
			const result = extractTopLevelTags('hello');
			expect(result).toEqual([]);
		});

		it('returns empty array for number', () => {
			const result = extractTopLevelTags(42);
			expect(result).toEqual([]);
		});

		it('returns empty array for boolean', () => {
			const result = extractTopLevelTags(true);
			expect(result).toEqual([]);
		});

		it('returns empty array for null', () => {
			const result = extractTopLevelTags(null);
			expect(result).toEqual([]);
		});

		it('returns empty array for undefined', () => {
			const result = extractTopLevelTags(undefined);
			expect(result).toEqual([]);
		});
	});

	describe('arrays', () => {
		it('returns empty array for empty array', () => {
			const result = extractTopLevelTags([]);
			expect(result).toEqual([]);
		});

		it('returns empty array for non-empty array', () => {
			const result = extractTopLevelTags([1, 2, 3]);
			expect(result).toEqual([]);
		});
	});

	describe('objects', () => {
		it('returns empty array for empty object', () => {
			const result = extractTopLevelTags({});
			expect(result).toEqual([]);
		});

		it('extracts keys from flat object', () => {
			const result = extractTopLevelTags({
				child1: {},
				child2: {},
			});

			expect(result).toHaveLength(2);
			expect(result.at(0)?.value).toBe('child1');
			expect(result.at(0)?.exact).toBe(true);
			expect(result.at(1)?.value).toBe('child2');
			expect(result.at(1)?.exact).toBe(true);
		});

		it('preserves document order of keys', () => {
			const result = extractTopLevelTags({
				zebra: {},
				apple: {},
				monkey: {},
			});

			expect(result.map((k) => k.value)).toEqual(['zebra', 'apple', 'monkey']);
		});

		it('filters out text node key', () => {
			const result = extractTopLevelTags({
				child1: {},
				[TEXT_NODE_NAME]: 'some text',
				child2: {},
			});

			expect(result).toHaveLength(2);
			expect(result.map((k) => k.value)).toEqual(['child1', 'child2']);
		});

		it('filters out attributes group key', () => {
			const result = extractTopLevelTags({
				child1: {},
				[ATTRIBUTES_GROUP_NAME]: {id: '123', class: 'foo'},
				child2: {},
			});

			expect(result).toHaveLength(2);
			expect(result.map((k) => k.value)).toEqual(['child1', 'child2']);
		});

		it('filters out both text nodes and attributes group', () => {
			const result = extractTopLevelTags({
				child1: {},
				[TEXT_NODE_NAME]: 'text content',
				[ATTRIBUTES_GROUP_NAME]: {id: '123', class: 'foo'},
				child2: {},
			});

			expect(result).toHaveLength(2);
			expect(result.map((k) => k.value)).toEqual(['child1', 'child2']);
		});
	});

	describe('capping', () => {
		it('returns all keys when fewer than MAX_STRUCTURE_EXTRACTED_ITEMS', () => {
			const count = MAX_STRUCTURE_EXTRACTED_ITEMS - 20;
			const obj = Object.fromEntries(
				Array.from({length: count}, (_, i) => [`tag${i}`, {}])
			);
			const result = extractTopLevelTags(obj);

			expect(result).toHaveLength(count);
		});

		it('returns exactly MAX_STRUCTURE_EXTRACTED_ITEMS keys when object has exactly MAX_STRUCTURE_EXTRACTED_ITEMS keys', () => {
			const obj = Object.fromEntries(
				Array.from({length: MAX_STRUCTURE_EXTRACTED_ITEMS}, (_, i) => [`tag${i}`, {}])
			);
			const result = extractTopLevelTags(obj);

			expect(result).toHaveLength(MAX_STRUCTURE_EXTRACTED_ITEMS);
		});

		it('caps at MAX_STRUCTURE_EXTRACTED_ITEMS keys when object has more keys', () => {
			const count = MAX_STRUCTURE_EXTRACTED_ITEMS * 2;
			const obj = Object.fromEntries(
				Array.from({length: count}, (_, i) => [`tag${i.toString().padStart(3, '0')}`, {}])
			);
			const result = extractTopLevelTags(obj);

			expect(result).toHaveLength(MAX_STRUCTURE_EXTRACTED_ITEMS);
			expect(result.at(0)?.value).toBe('tag000');
			expect(result.at(-1)?.value).toBe(`tag${(MAX_STRUCTURE_EXTRACTED_ITEMS - 1).toString().padStart(3, '0')}`);
		});

		it('caps at MAX_STRUCTURE_EXTRACTED_ITEMS keys preserving document order', () => {
			const extraTags = MAX_STRUCTURE_EXTRACTED_ITEMS + 45;
			const tags = ['z', 'y', 'x', 'w', 'v'].concat(
				Array.from({length: extraTags}, (_, i) => `tag${i}`)
			);
			const obj = Object.fromEntries(tags.map((tag) => [tag, {}]));
			const result = extractTopLevelTags(obj);

			expect(result).toHaveLength(MAX_STRUCTURE_EXTRACTED_ITEMS);
			// First 5 should be z, y, x, w, v in that order
			expect(result.slice(0, 5).map((k) => k.value)).toEqual(['z', 'y', 'x', 'w', 'v']);
		});
	});

	describe('truncation', () => {
		it('does not truncate keys with exactly MAX_STRUCTURE_VALUE_LENGTH characters', () => {
			const exactKey = 'a'.repeat(MAX_STRUCTURE_VALUE_LENGTH);
			const result = extractTopLevelTags({[exactKey]: {}});

			expect(result).toHaveLength(1);
			expect(result.at(0)?.exact).toBe(true);
			expect(result.at(0)?.value).toBe(exactKey);
			expect(result.at(0)?.value).toHaveLength(MAX_STRUCTURE_VALUE_LENGTH);
		});

		it('truncates keys longer than MAX_STRUCTURE_VALUE_LENGTH characters', () => {
			const longKey = 'a'.repeat(MAX_STRUCTURE_VALUE_LENGTH + 50);
			const result = extractTopLevelTags({[longKey]: {}});

			expect(result).toHaveLength(1);
			expect(result.at(0)?.exact).toBe(false);
			expect(result.at(0)?.value).toHaveLength(MAX_STRUCTURE_VALUE_LENGTH);
			expect(result.at(0)?.value).toMatch(/^a+\.\.\.$/);
		});

		it('truncates each key independently', () => {
			const shortKey = 'short';
			const exactKey = 'b'.repeat(MAX_STRUCTURE_VALUE_LENGTH);
			const longKey = 'c'.repeat(MAX_STRUCTURE_VALUE_LENGTH + 50);

			const result = extractTopLevelTags({
				[shortKey]: {},
				[exactKey]: {},
				[longKey]: {},
			});

			expect(result).toHaveLength(3);
			expect(result.at(0)?.exact).toBe(true);
			expect(result.at(0)?.value).toBe(shortKey);
			expect(result.at(1)?.exact).toBe(true);
			expect(result.at(1)?.value).toBe(exactKey);
			expect(result.at(2)?.exact).toBe(false);
			expect(result.at(2)?.value).toHaveLength(MAX_STRUCTURE_VALUE_LENGTH);
		});
	});

	describe('mixed scenarios', () => {
		it('handles repeated tags (arrays in XML)', () => {
			// In XML, repeated tags become arrays
			const result = extractTopLevelTags({
				item: [{}, {}, {}],
			});

			expect(result).toHaveLength(1);
			expect(result.at(0)?.value).toBe('item');
		});

		it('handles complex XML structure', () => {
			const result = extractTopLevelTags({
				[TEXT_NODE_NAME]: 'Some text content',
				[ATTRIBUTES_GROUP_NAME]: {id: '123', class: 'container'},
				header: {},
				body: {
					[TEXT_NODE_NAME]: 'Body text',
					section: [{}, {}],
				},
				footer: {},
			});

			expect(result).toHaveLength(3);
			expect(result.map((k) => k.value)).toEqual(['header', 'body', 'footer']);
		});
	});
});
