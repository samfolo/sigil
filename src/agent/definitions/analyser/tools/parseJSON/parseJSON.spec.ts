import {describe, expect, it} from 'vitest';

import {isOk} from '@sigil/src/common/errors';

import {MAX_JSON_DEPTH} from './types';
import {parseJSON} from './parseJSON';

describe('parseJSON', () => {
	describe('invalid JSON', () => {
		it('returns valid: false for syntax errors', () => {
			const result = parseJSON('{invalid}');

			expect(isOk(result)).toBe(true);
			if (!isOk(result)) {
				return;
			}

			expect(result.data.valid).toBe(false);
			if (result.data.valid) {
				return;
			}

			expect(result.data.error).toBeTruthy();
			expect(typeof result.data.error).toBe('string');
		});

		it('returns valid: false for unclosed braces', () => {
			const result = parseJSON('{"name": "Alice"');

			expect(isOk(result)).toBe(true);
			if (!isOk(result)) {
				return;
			}

			expect(result.data.valid).toBe(false);
		});

		it('returns valid: false for trailing commas', () => {
			const result = parseJSON('{"name": "Alice",}');

			expect(isOk(result)).toBe(true);
			if (!isOk(result)) {
				return;
			}

			expect(result.data.valid).toBe(false);
		});
	});

	describe('primitives', () => {
		it('parses string primitive', () => {
			const result = parseJSON('"hello"');

			expect(isOk(result)).toBe(true);
			if (!isOk(result)) {
				return;
			}

			expect(result.data.valid).toBe(true);
			if (!result.data.valid) {
				return;
			}

			const {metadata} = result.data;
			expect(metadata.structure).toBe('string');
			expect(metadata.size.characters).toBe(7);
		});

		it('parses number primitive', () => {
			const result = parseJSON('42');

			expect(isOk(result)).toBe(true);
			if (!isOk(result)) {
				return;
			}

			expect(result.data.valid).toBe(true);
			if (!result.data.valid) {
				return;
			}

			const {metadata} = result.data;
			expect(metadata.structure).toBe('number');
			expect(metadata.size.characters).toBe(2);
		});

		it('parses boolean primitive', () => {
			const result = parseJSON('true');

			expect(isOk(result)).toBe(true);
			if (!isOk(result)) {
				return;
			}

			expect(result.data.valid).toBe(true);
			if (!result.data.valid) {
				return;
			}

			const {metadata} = result.data;
			expect(metadata.structure).toBe('boolean');
			expect(metadata.size.characters).toBe(4);
		});

		it('parses null primitive', () => {
			const result = parseJSON('null');

			expect(isOk(result)).toBe(true);
			if (!isOk(result)) {
				return;
			}

			expect(result.data.valid).toBe(true);
			if (!result.data.valid) {
				return;
			}

			const {metadata} = result.data;
			expect(metadata.structure).toBe('null');
			expect(metadata.size.characters).toBe(4);
		});

		it('primitives do not have depth field', () => {
			const result = parseJSON('"test"');

			expect(isOk(result)).toBe(true);
			if (!isOk(result)) {
				return;
			}

			expect(result.data.valid).toBe(true);
			if (!result.data.valid) {
				return;
			}

			const {metadata} = result.data;
			expect(metadata.structure).toBe('string');
			expect('depth' in metadata).toBe(false);
		});
	});

	describe('arrays', () => {
		it('parses empty array', () => {
			const result = parseJSON('[]');

			expect(isOk(result)).toBe(true);
			if (!isOk(result)) {
				return;
			}

			expect(result.data.valid).toBe(true);
			if (!result.data.valid) {
				return;
			}

			const {metadata} = result.data;
			if (metadata.structure !== 'array') {
				throw new Error('Expected array structure');
			}

			expect(metadata.elementCount).toBe(0);
			expect(metadata.depth.value).toBe(1);
			expect(metadata.depth.exact).toBe(true);
		});

		it('parses flat array', () => {
			const result = parseJSON('[1, 2, 3]');

			expect(isOk(result)).toBe(true);
			if (!isOk(result)) {
				return;
			}

			expect(result.data.valid).toBe(true);
			if (!result.data.valid) {
				return;
			}

			const {metadata} = result.data;
			if (metadata.structure !== 'array') {
				throw new Error('Expected array structure');
			}

			expect(metadata.elementCount).toBe(3);
			expect(metadata.depth.value).toBe(1);
			expect(metadata.depth.exact).toBe(true);
		});

		it('parses nested array', () => {
			const result = parseJSON('[[1, 2], [3, 4]]');

			expect(isOk(result)).toBe(true);
			if (!isOk(result)) {
				return;
			}

			expect(result.data.valid).toBe(true);
			if (!result.data.valid) {
				return;
			}

			const {metadata} = result.data;
			if (metadata.structure !== 'array') {
				throw new Error('Expected array structure');
			}

			expect(metadata.elementCount).toBe(2);
			expect(metadata.depth.value).toBe(2);
			expect(metadata.depth.exact).toBe(true);
		});

		it('calculates size from raw input string', () => {
			const rawData = '[1, 2, 3]';
			const result = parseJSON(rawData);

			expect(isOk(result)).toBe(true);
			if (!isOk(result)) {
				return;
			}

			expect(result.data.valid).toBe(true);
			if (!result.data.valid) {
				return;
			}

			const {metadata} = result.data;
			expect(metadata.size.characters).toBe(rawData.length);
		});
	});

	describe('objects', () => {
		it('parses empty object', () => {
			const result = parseJSON('{}');

			expect(isOk(result)).toBe(true);
			if (!isOk(result)) {
				return;
			}

			expect(result.data.valid).toBe(true);
			if (!result.data.valid) {
				return;
			}

			const {metadata} = result.data;
			if (metadata.structure !== 'object') {
				throw new Error('Expected object structure');
			}

			expect(metadata.topLevelKeys).toEqual([]);
			expect(metadata.totalKeyCount).toBe(0);
			expect(metadata.depth.value).toBe(1);
			expect(metadata.depth.exact).toBe(true);
		});

		it('parses flat object', () => {
			const result = parseJSON('{"name": "Alice", "age": 30}');

			expect(isOk(result)).toBe(true);
			if (!isOk(result)) {
				return;
			}

			expect(result.data.valid).toBe(true);
			if (!result.data.valid) {
				return;
			}

			const {metadata} = result.data;
			if (metadata.structure !== 'object') {
				throw new Error('Expected object structure');
			}

			expect(metadata.topLevelKeys).toEqual([
				{value: 'age', truncated: false},
				{value: 'name', truncated: false},
			]);
			expect(metadata.totalKeyCount).toBe(2);
			expect(metadata.depth.value).toBe(1);
			expect(metadata.depth.exact).toBe(true);
		});

		it('sorts keys alphabetically', () => {
			const result = parseJSON('{"zebra": 1, "apple": 2, "monkey": 3}');

			expect(isOk(result)).toBe(true);
			if (!isOk(result)) {
				return;
			}

			expect(result.data.valid).toBe(true);
			if (!result.data.valid) {
				return;
			}

			const {metadata} = result.data;
			if (metadata.structure !== 'object') {
				throw new Error('Expected object structure');
			}

			expect(metadata.topLevelKeys.map((k) => k.value)).toEqual([
				'apple',
				'monkey',
				'zebra',
			]);
		});

		it('returns first 50 keys when object has fewer than 50 keys', () => {
			const keys = Array.from({length: 30}, (_, i) => `key${i}`);
			const obj = Object.fromEntries(keys.map((k) => [k, 'value']));
			const result = parseJSON(JSON.stringify(obj));

			expect(isOk(result)).toBe(true);
			if (!isOk(result)) {
				return;
			}

			expect(result.data.valid).toBe(true);
			if (!result.data.valid) {
				return;
			}

			const {metadata} = result.data;
			if (metadata.structure !== 'object') {
				throw new Error('Expected object structure');
			}

			expect(metadata.topLevelKeys).toHaveLength(30);
			expect(metadata.totalKeyCount).toBe(30);
		});

		it('returns exactly 50 keys when object has exactly 50 keys', () => {
			const keys = Array.from({length: 50}, (_, i) => `key${i}`);
			const obj = Object.fromEntries(keys.map((k) => [k, 'value']));
			const result = parseJSON(JSON.stringify(obj));

			expect(isOk(result)).toBe(true);
			if (!isOk(result)) {
				return;
			}

			expect(result.data.valid).toBe(true);
			if (!result.data.valid) {
				return;
			}

			const {metadata} = result.data;
			if (metadata.structure !== 'object') {
				throw new Error('Expected object structure');
			}

			expect(metadata.topLevelKeys).toHaveLength(50);
			expect(metadata.totalKeyCount).toBe(50);
		});

		it('returns first 50 keys alphabetically when object has more than 50 keys', () => {
			const keys = Array.from({length: 100}, (_, i) => `key${i.toString().padStart(3, '0')}`);
			const obj = Object.fromEntries(keys.map((k) => [k, 'value']));
			const result = parseJSON(JSON.stringify(obj));

			expect(isOk(result)).toBe(true);
			if (!isOk(result)) {
				return;
			}

			expect(result.data.valid).toBe(true);
			if (!result.data.valid) {
				return;
			}

			const {metadata} = result.data;
			if (metadata.structure !== 'object') {
				throw new Error('Expected object structure');
			}

			expect(metadata.topLevelKeys).toHaveLength(50);
			expect(metadata.totalKeyCount).toBe(100);
			expect(metadata.topLevelKeys.at(0)?.value).toBe('key000');
			expect(metadata.topLevelKeys.at(-1)?.value).toBe('key049');
		});

		it('truncates keys longer than 100 characters', () => {
			const longKey = 'a'.repeat(150);
			const result = parseJSON(`{"${longKey}": "value"}`);

			expect(isOk(result)).toBe(true);
			if (!isOk(result)) {
				return;
			}

			expect(result.data.valid).toBe(true);
			if (!result.data.valid) {
				return;
			}

			const {metadata} = result.data;
			if (metadata.structure !== 'object') {
				throw new Error('Expected object structure');
			}

			expect(metadata.topLevelKeys).toHaveLength(1);
			expect(metadata.topLevelKeys.at(0)?.truncated).toBe(true);
			expect(metadata.topLevelKeys.at(0)?.value).toHaveLength(100);
			expect(metadata.topLevelKeys.at(0)?.value).toMatch(/^a+\.\.\.$/);
		});

		it('does not truncate keys with exactly 100 characters', () => {
			const exactKey = 'a'.repeat(100);
			const result = parseJSON(`{"${exactKey}": "value"}`);

			expect(isOk(result)).toBe(true);
			if (!isOk(result)) {
				return;
			}

			expect(result.data.valid).toBe(true);
			if (!result.data.valid) {
				return;
			}

			const {metadata} = result.data;
			if (metadata.structure !== 'object') {
				throw new Error('Expected object structure');
			}

			expect(metadata.topLevelKeys.at(0)?.truncated).toBe(false);
			expect(metadata.topLevelKeys.at(0)?.value).toBe(exactKey);
		});

		it('parses nested object', () => {
			const result = parseJSON('{"user": {"name": "Alice"}}');

			expect(isOk(result)).toBe(true);
			if (!isOk(result)) {
				return;
			}

			expect(result.data.valid).toBe(true);
			if (!result.data.valid) {
				return;
			}

			const {metadata} = result.data;
			if (metadata.structure !== 'object') {
				throw new Error('Expected object structure');
			}

			expect(metadata.depth.value).toBe(2);
			expect(metadata.depth.exact).toBe(true);
		});
	});

	describe('depth calculation', () => {
		it('calculates depth for nested arrays', () => {
			const result = parseJSON('[[[1]]]');

			expect(isOk(result)).toBe(true);
			if (!isOk(result)) {
				return;
			}

			expect(result.data.valid).toBe(true);
			if (!result.data.valid) {
				return;
			}

			const {metadata} = result.data;
			if (metadata.structure !== 'array') {
				throw new Error('Expected array structure');
			}

			expect(metadata.depth.value).toBe(3);
			expect(metadata.depth.exact).toBe(true);
		});

		it('calculates depth for nested objects', () => {
			const result = parseJSON('{"a": {"b": {"c": 1}}}');

			expect(isOk(result)).toBe(true);
			if (!isOk(result)) {
				return;
			}

			expect(result.data.valid).toBe(true);
			if (!result.data.valid) {
				return;
			}

			const {metadata} = result.data;
			if (metadata.structure !== 'object') {
				throw new Error('Expected object structure');
			}

			expect(metadata.depth.value).toBe(3);
			expect(metadata.depth.exact).toBe(true);
		});

		it('sets exact: false when depth exceeds MAX_JSON_DEPTH', () => {
			// Create deeply nested structure (25 levels)
			let nested: unknown = 'value';
			for (let i = 0; i < 25; i++) {
				nested = [nested];
			}
			const result = parseJSON(JSON.stringify(nested));

			expect(isOk(result)).toBe(true);
			if (!isOk(result)) {
				return;
			}

			expect(result.data.valid).toBe(true);
			if (!result.data.valid) {
				return;
			}

			const {metadata} = result.data;
			if (metadata.structure !== 'array') {
				throw new Error('Expected array structure');
			}

			expect(metadata.depth.value).toBe(MAX_JSON_DEPTH);
			expect(metadata.depth.exact).toBe(false);
		});

		it('sets exact: true when depth equals MAX_JSON_DEPTH', () => {
			// Create structure with exactly MAX_JSON_DEPTH levels
			let nested: unknown = 'value';
			for (let i = 0; i < MAX_JSON_DEPTH; i++) {
				nested = [nested];
			}
			const result = parseJSON(JSON.stringify(nested));

			expect(isOk(result)).toBe(true);
			if (!isOk(result)) {
				return;
			}

			expect(result.data.valid).toBe(true);
			if (!result.data.valid) {
				return;
			}

			const {metadata} = result.data;
			if (metadata.structure !== 'array') {
				throw new Error('Expected array structure');
			}

			expect(metadata.depth.value).toBe(MAX_JSON_DEPTH);
			expect(metadata.depth.exact).toBe(true);
		});
	});

	describe('size calculation', () => {
		it('calculates size from original raw string for objects', () => {
			const rawData = '{"name": "Alice"}';
			const result = parseJSON(rawData);

			expect(isOk(result)).toBe(true);
			if (!isOk(result)) {
				return;
			}

			expect(result.data.valid).toBe(true);
			if (!result.data.valid) {
				return;
			}

			const {metadata} = result.data;
			expect(metadata.size.characters).toBe(rawData.length);
			expect(metadata.size.bytes).toBeGreaterThan(0);
			expect(metadata.size.lines).toBe(1);
		});

		it('calculates size from original raw string for primitives', () => {
			const rawData = '"hello"';
			const result = parseJSON(rawData);

			expect(isOk(result)).toBe(true);
			if (!isOk(result)) {
				return;
			}

			expect(result.data.valid).toBe(true);
			if (!result.data.valid) {
				return;
			}

			const {metadata} = result.data;
			expect(metadata.size.characters).toBe(7);
		});
	});
});
