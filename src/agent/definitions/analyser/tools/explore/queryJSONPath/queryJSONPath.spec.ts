import {describe, expect, it} from 'vitest';

import {isErr, isOk} from '@sigil/src/common/errors';

import {MAX_MATCH_PREVIEW_CHARS, MAX_QUERY_MATCHES, queryJSONPath} from './queryJSONPath';

describe('queryJSONPath', () => {
	describe('simple paths', () => {
		it('returns single match for simple property path', () => {
			const data = {user: {name: 'Alice'}};
			const result = queryJSONPath(data, {path: '$.user.name'});

			expect(isOk(result)).toBe(true);
			if (!isOk(result)) {
				return;
			}

			expect(result.data.matches.value).toHaveLength(1);
			expect(result.data.matches.value.at(0)).toEqual({
				path: '$.user.name',
				preview: '"Alice"',
			});
			expect(result.data.matches.exact).toBe(true);
			expect(result.data.metadata.query).toBe('$.user.name');
			expect(result.data.metadata.totalMatches).toBe(1);
		});

		it('returns match for root path', () => {
			const data = 'hello';
			const result = queryJSONPath(data, {path: '$'});

			expect(isOk(result)).toBe(true);
			if (!isOk(result)) {
				return;
			}

			expect(result.data.matches.value).toHaveLength(1);
			expect(result.data.matches.value.at(0)).toEqual({
				path: '$',
				preview: '"hello"',
			});
		});
	});

	describe('wildcard paths', () => {
		it('returns multiple matches for array wildcard', () => {
			const data = {users: [{name: 'Alice'}, {name: 'Bob'}, {name: 'Charlie'}]};
			const result = queryJSONPath(data, {path: '$.users[*].name'});

			expect(isOk(result)).toBe(true);
			if (!isOk(result)) {
				return;
			}

			expect(result.data.matches.value).toHaveLength(3);
			expect(result.data.matches.value.at(0)).toEqual({
				path: '$.users[0].name',
				preview: '"Alice"',
			});
			expect(result.data.matches.value.at(1)).toEqual({
				path: '$.users[1].name',
				preview: '"Bob"',
			});
			expect(result.data.matches.value.at(2)).toEqual({
				path: '$.users[2].name',
				preview: '"Charlie"',
			});
			expect(result.data.matches.exact).toBe(true);
			expect(result.data.metadata.totalMatches).toBe(3);
		});

		it('returns multiple matches for nested wildcards', () => {
			const data = {
				departments: [
					{employees: [{name: 'Alice'}, {name: 'Bob'}]},
					{employees: [{name: 'Charlie'}]},
				],
			};
			const result = queryJSONPath(data, {path: '$.departments[*].employees[*].name'});

			expect(isOk(result)).toBe(true);
			if (!isOk(result)) {
				return;
			}

			expect(result.data.matches.value).toHaveLength(3);
			expect(result.data.matches.value.at(0)?.path).toBe('$.departments[0].employees[0].name');
			expect(result.data.matches.value.at(1)?.path).toBe('$.departments[0].employees[1].name');
			expect(result.data.matches.value.at(2)?.path).toBe('$.departments[1].employees[0].name');
		});
	});

	describe('preview truncation', () => {
		it('truncates long string previews at maximum characters', () => {
			const longString = 'a'.repeat(MAX_MATCH_PREVIEW_CHARS + 100);
			const data = {text: longString};
			const result = queryJSONPath(data, {path: '$.text'});

			expect(isOk(result)).toBe(true);
			if (!isOk(result)) {
				return;
			}

			const preview = result.data.matches.value.at(0)?.preview;
			expect(preview).toBeDefined();
			if (!preview) {
				return;
			}

			expect(preview.length).toBe(MAX_MATCH_PREVIEW_CHARS);
			expect(preview.endsWith('...')).toBe(true);
			expect(preview.startsWith('"aaa')).toBe(true);
		});

		it('truncates large object previews', () => {
			const fieldLength = Math.floor(MAX_MATCH_PREVIEW_CHARS / 3);
			const largeObject = {
				field1: 'a'.repeat(fieldLength),
				field2: 'b'.repeat(fieldLength),
				field3: 'c'.repeat(fieldLength),
				field4: 'd'.repeat(fieldLength),
			};
			const data = {obj: largeObject};
			const result = queryJSONPath(data, {path: '$.obj'});

			expect(isOk(result)).toBe(true);
			if (!isOk(result)) {
				return;
			}

			const preview = result.data.matches.value.at(0)?.preview;
			expect(preview).toBeDefined();
			if (!preview) {
				return;
			}

			expect(preview.length).toBe(MAX_MATCH_PREVIEW_CHARS);
			expect(preview.endsWith('...')).toBe(true);
		});

		it('truncates large array previews', () => {
			const arrayLength = Math.floor(MAX_MATCH_PREVIEW_CHARS / 20);
			const largeArray = Array.from({length: arrayLength}, (_, i) => ({id: i, data: 'item'.repeat(10)}));
			const data = {items: largeArray};
			const result = queryJSONPath(data, {path: '$.items'});

			expect(isOk(result)).toBe(true);
			if (!isOk(result)) {
				return;
			}

			const preview = result.data.matches.value.at(0)?.preview;
			expect(preview).toBeDefined();
			if (!preview) {
				return;
			}

			expect(preview.length).toBe(MAX_MATCH_PREVIEW_CHARS);
			expect(preview.endsWith('...')).toBe(true);
		});

		it('does not truncate short previews', () => {
			const data = {message: 'short'};
			const result = queryJSONPath(data, {path: '$.message'});

			expect(isOk(result)).toBe(true);
			if (!isOk(result)) {
				return;
			}

			const preview = result.data.matches.value.at(0)?.preview;
			expect(preview).toBe('"short"');
			expect(preview?.length).toBeLessThan(MAX_MATCH_PREVIEW_CHARS);
		});
	});

	describe('match capping', () => {
		it.each([
			{
				description: 'caps results at maximum matches and sets exact to false',
				arrayLength: MAX_QUERY_MATCHES * 2,
				expectedReturnedCount: MAX_QUERY_MATCHES,
				expectedExact: false,
			},
			{
				description: 'sets exact to true when matches equal maximum',
				arrayLength: MAX_QUERY_MATCHES,
				expectedReturnedCount: MAX_QUERY_MATCHES,
				expectedExact: true,
			},
			{
				description: 'sets exact to true when matches less than maximum',
				arrayLength: MAX_QUERY_MATCHES - 17,
				expectedReturnedCount: MAX_QUERY_MATCHES - 17,
				expectedExact: true,
			},
		])('$description', ({arrayLength, expectedReturnedCount, expectedExact}) => {
			const array = Array.from({length: arrayLength}, (_, i) => ({id: i}));
			const data = {items: array};
			const result = queryJSONPath(data, {path: '$.items[*].id'});

			expect(isOk(result)).toBe(true);
			if (!isOk(result)) {
				return;
			}

			expect(result.data.matches.value).toHaveLength(expectedReturnedCount);
			expect(result.data.matches.exact).toBe(expectedExact);
			expect(result.data.metadata.totalMatches).toBe(arrayLength);
		});
	});

	describe('empty results', () => {
		it('returns empty array when path matches nothing', () => {
			const data = {user: {name: 'Alice'}};
			const result = queryJSONPath(data, {path: '$.nonexistent'});

			expect(isOk(result)).toBe(true);
			if (!isOk(result)) {
				return;
			}

			expect(result.data.matches.value).toHaveLength(0);
			expect(result.data.matches.exact).toBe(true);
			expect(result.data.metadata.totalMatches).toBe(0);
		});
	});

	describe('validation', () => {
		it('returns error when path does not start with $', () => {
			const data = {user: 'Alice'};
			const result = queryJSONPath(data, {path: 'user'});

			expect(isErr(result)).toBe(true);
			if (!isErr(result)) {
				return;
			}

			expect(result.error).toContain('must start with $');
		});

		it('returns error for invalid JSONPath syntax', () => {
			const data = {user: 'Alice'};
			const result = queryJSONPath(data, {path: '$..[?('});

			expect(isErr(result)).toBe(true);
			if (!isErr(result)) {
				return;
			}

			expect(result.error).toContain('JSONPath query failed');
		});
	});

	describe('path normalisation', () => {
		it('normalises bracket notation to dot notation for safe keys', () => {
			const data = {users: [{name: 'Alice'}]};
			const result = queryJSONPath(data, {path: "$['users'][0]['name']"});

			expect(isOk(result)).toBe(true);
			if (!isOk(result)) {
				return;
			}

			expect(result.data.matches.value.at(0)?.path).toBe('$.users[0].name');
		});

		it('preserves bracket notation for keys with special characters', () => {
			const data = {'user-data': {'first name': 'Alice'}};
			const result = queryJSONPath(data, {path: "$['user-data']['first name']"});

			expect(isOk(result)).toBe(true);
			if (!isOk(result)) {
				return;
			}

			const path = result.data.matches.value.at(0)?.path;
			expect(path).toContain("['user-data']");
			expect(path).toContain("['first name']");
		});

		it('preserves array indices in bracket notation', () => {
			const data = {items: ['a', 'b', 'c']};
			const result = queryJSONPath(data, {path: '$.items[1]'});

			expect(isOk(result)).toBe(true);
			if (!isOk(result)) {
				return;
			}

			expect(result.data.matches.value.at(0)?.path).toBe('$.items[1]');
		});
	});

	describe('value types', () => {
		it('stringifies number values', () => {
			const data = {age: 42};
			const result = queryJSONPath(data, {path: '$.age'});

			expect(isOk(result)).toBe(true);
			if (!isOk(result)) {
				return;
			}

			expect(result.data.matches.value.at(0)?.preview).toBe('42');
		});

		it('stringifies boolean values', () => {
			const data = {active: true};
			const result = queryJSONPath(data, {path: '$.active'});

			expect(isOk(result)).toBe(true);
			if (!isOk(result)) {
				return;
			}

			expect(result.data.matches.value.at(0)?.preview).toBe('true');
		});

		it('stringifies null values', () => {
			const data = {value: null};
			const result = queryJSONPath(data, {path: '$.value'});

			expect(isOk(result)).toBe(true);
			if (!isOk(result)) {
				return;
			}

			expect(result.data.matches.value.at(0)?.preview).toBe('null');
		});

		it('stringifies array values', () => {
			const data = {items: [1, 2, 3]};
			const result = queryJSONPath(data, {path: '$.items'});

			expect(isOk(result)).toBe(true);
			if (!isOk(result)) {
				return;
			}

			expect(result.data.matches.value.at(0)?.preview).toBe('[1,2,3]');
		});

		it('stringifies object values', () => {
			const data = {user: {name: 'Alice', age: 30}};
			const result = queryJSONPath(data, {path: '$.user'});

			expect(isOk(result)).toBe(true);
			if (!isOk(result)) {
				return;
			}

			expect(result.data.matches.value.at(0)?.preview).toBe('{"name":"Alice","age":30}');
		});
	});
});
