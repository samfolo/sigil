import {describe, expect, it} from 'vitest';

import {MAX_STRUCTURE_PROBING_DEPTH} from '@sigil/src/agent/definitions/analyser/tools/parsers/common';
import {isOk} from '@sigil/src/common/errors';

import {parseYAML} from './parseYAML';

describe('parseYAML', () => {
	describe('invalid YAML', () => {
		it('returns valid: false for empty string', () => {
			const result = parseYAML('');

			expect(isOk(result)).toBe(true);
			if (!isOk(result)) {
				return;
			}

			expect(result.data.valid).toBe(false);
			if (result.data.valid) {
				return;
			}

			expect(result.data.error).toBe('No document found');
		});

		it('returns valid: false for syntax errors', () => {
			const result = parseYAML('invalid: yaml: syntax:');

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

		it('returns valid: false for invalid structure', () => {
			// Tabs are invalid in YAML
			const result = parseYAML('key:\n\tvalue');

			expect(isOk(result)).toBe(true);
			if (!isOk(result)) {
				return;
			}

			expect(result.data.valid).toBe(false);
		});
	});

	describe('primitives', () => {
		it('parses string primitive', () => {
			const result = parseYAML('hello');

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
			expect(metadata.size.characters).toBe(5);
		});

		it('parses quoted string', () => {
			const result = parseYAML('"hello world"');

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
		});

		it('parses number primitive', () => {
			const result = parseYAML('42');

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

		it('parses boolean primitive (true)', () => {
			const result = parseYAML('true');

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
		});

		it('parses boolean primitive (false)', () => {
			const result = parseYAML('false');

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
		});

		it('parses null primitive', () => {
			const result = parseYAML('null');

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
		});

		it('parses tilde as null', () => {
			const result = parseYAML('~');

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
		});
	});

	describe('arrays', () => {
		it('parses empty array', () => {
			const result = parseYAML('[]');

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

		it('parses flat array (flow style)', () => {
			const result = parseYAML('[1, 2, 3]');

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

		it('parses flat array (block style)', () => {
			const result = parseYAML('- item1\n- item2\n- item3');

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
			const result = parseYAML('[[1, 2], [3, 4]]');

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
			const rawData = '- item1\n- item2';
			const result = parseYAML(rawData);

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
			expect(metadata.size.lines).toBe(2);
		});
	});

	describe('objects', () => {
		it('parses empty object', () => {
			const result = parseYAML('{}');

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

		it('parses flat object (flow style)', () => {
			const result = parseYAML('{name: Alice, age: 30}');

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
				{value: 'age', exact: true},
				{value: 'name', exact: true},
			]);
			expect(metadata.totalKeyCount).toBe(2);
			expect(metadata.depth.value).toBe(1);
			expect(metadata.depth.exact).toBe(true);
		});

		it('parses flat object (block style)', () => {
			const result = parseYAML('name: Alice\nage: 30');

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
				{value: 'age', exact: true},
				{value: 'name', exact: true},
			]);
			expect(metadata.totalKeyCount).toBe(2);
		});

		it('sorts keys alphabetically', () => {
			const result = parseYAML('zebra: 1\napple: 2\nmonkey: 3');

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

		it('returns first 50 keys for large objects', () => {
			const keys = Array.from({length: 100}, (_, i) =>
				`key${i.toString().padStart(3, '0')}`
			);
			const yamlLines = keys.map((k) => `${k}: value`);
			const result = parseYAML(yamlLines.join('\n'));

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
			const result = parseYAML(`${longKey}: value`);

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
			expect(metadata.topLevelKeys.at(0)?.exact).toBe(false);
			expect(metadata.topLevelKeys.at(0)?.value).toHaveLength(100);
			expect(metadata.topLevelKeys.at(0)?.value).toMatch(/^a+\.\.\.$/);
		});

		it('parses nested object', () => {
			const result = parseYAML('user:\n  name: Alice');

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
			const result = parseYAML('[[[1]]]');

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
			const result = parseYAML('a:\n  b:\n    c: 1');

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

		it('sets exact: false when depth exceeds MAX_STRUCTURE_PROBING_DEPTH', () => {
			// Create deeply nested structure (exceeds cap by 5)
			let nested: unknown = 'value';
			for (let i = 0; i < MAX_STRUCTURE_PROBING_DEPTH + 5; i++) {
				nested = [nested];
			}
			const result = parseYAML(JSON.stringify(nested));

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

			expect(metadata.depth.value).toBe(MAX_STRUCTURE_PROBING_DEPTH);
			expect(metadata.depth.exact).toBe(false);
		});
	});

	describe('mixed structures', () => {
		it('handles arrays within objects', () => {
			const result = parseYAML('items:\n  - 1\n  - 2\n  - 3');

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

		it('handles objects within arrays', () => {
			const result = parseYAML('- a: 1\n- b: 2');

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

			expect(metadata.depth.value).toBe(2);
			expect(metadata.depth.exact).toBe(true);
		});

		it('handles complex nested structures', () => {
			const result = parseYAML(
				'users:\n  - name: Alice\n    tags:\n      - admin\n      - user\n  - name: Bob\n    tags:\n      - user'
			);

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

			expect(metadata.depth.value).toBe(4);
			expect(metadata.depth.exact).toBe(true);
		});
	});

	describe('plain text', () => {
		it('parses plain text as string', () => {
			const result = parseYAML('hello world');

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
		});

		it('parses text with spaces as string', () => {
			const result = parseYAML('This is a plain text string');

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
		});
	});

	describe('JSON compatibility', () => {
		it('parses valid JSON object', () => {
			const result = parseYAML('{"name": "Alice", "age": 30}');

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
				'age',
				'name',
			]);
		});

		it('parses valid JSON array', () => {
			const result = parseYAML('[1, 2, 3]');

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
		});

		it('parses JSON string', () => {
			const result = parseYAML('"hello"');

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
		});
	});

	describe('edge cases', () => {
		it('handles array with single element', () => {
			const result = parseYAML('- 42');

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

			expect(metadata.elementCount).toBe(1);
			expect(metadata.depth.value).toBe(1);
		});

		it('handles object with single property', () => {
			const result = parseYAML('key: value');

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
			expect(metadata.depth.value).toBe(1);
		});

		it('handles multiline strings', () => {
			const result = parseYAML('|\n  This is\n  a multiline\n  string');

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
		});
	});

	describe('always returns Ok', () => {
		it('never returns Err for invalid input', () => {
			const result = parseYAML('invalid: yaml: syntax:');

			expect(isOk(result)).toBe(true);
		});

		it('never returns Err for empty input', () => {
			const result = parseYAML('');

			expect(isOk(result)).toBe(true);
		});

		it('never returns Err for valid input', () => {
			const result = parseYAML('key: value');

			expect(isOk(result)).toBe(true);
		});
	});
});
