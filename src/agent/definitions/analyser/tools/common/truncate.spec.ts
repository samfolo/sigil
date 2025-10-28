import {describe, expect, it} from 'vitest';

import {truncateString} from './truncate';

const DEFAULT_MAX_LENGTH = 100;

describe('truncateString', () => {
	describe('short strings (no truncation)', () => {
		it('returns unmodified string when below max length', () => {
			const result = truncateString('hello', DEFAULT_MAX_LENGTH);

			expect(result).toEqual({
				value: 'hello',
				truncated: false,
			});
		});

		it('returns unmodified string when exactly at max length', () => {
			const exactLength = 'a'.repeat(DEFAULT_MAX_LENGTH);
			const result = truncateString(exactLength, DEFAULT_MAX_LENGTH);

			expect(result).toEqual({
				value: exactLength,
				truncated: false,
			});
		});

		it('handles empty string', () => {
			const result = truncateString('', DEFAULT_MAX_LENGTH);

			expect(result).toEqual({
				value: '',
				truncated: false,
			});
		});

		it('handles single character', () => {
			const result = truncateString('a', DEFAULT_MAX_LENGTH);

			expect(result).toEqual({
				value: 'a',
				truncated: false,
			});
		});
	});

	describe('long strings (with truncation)', () => {
		it('truncates string longer than max length', () => {
			const longString = 'a'.repeat(150);
			const result = truncateString(longString, DEFAULT_MAX_LENGTH);

			expect(result.truncated).toBe(true);
			expect(result.value).toBe('a'.repeat(97) + '...');
			expect(result.value.length).toBe(DEFAULT_MAX_LENGTH);
		});

		it('truncates string one character over max length', () => {
			const result = truncateString('a'.repeat(101), DEFAULT_MAX_LENGTH);

			expect(result.truncated).toBe(true);
			expect(result.value).toBe('a'.repeat(97) + '...');
			expect(result.value.length).toBe(DEFAULT_MAX_LENGTH);
		});

		it('includes ellipsis in truncated value', () => {
			const result = truncateString('a'.repeat(150), DEFAULT_MAX_LENGTH);

			expect(result.value.endsWith('...')).toBe(true);
		});
	});

	describe('custom max length', () => {
		it('respects custom max length parameter', () => {
			const result = truncateString('hello world', 8);

			expect(result).toEqual({
				value: 'hello...',
				truncated: true,
			});
			expect(result.value.length).toBe(8);
		});

		it('handles very small max length', () => {
			const result = truncateString('hello', 5);

			expect(result).toEqual({
				value: 'hello',
				truncated: false,
			});
		});

		it('handles max length of 3 (minimum for ellipsis)', () => {
			const result = truncateString('hello', 3);

			expect(result).toEqual({
				value: '...',
				truncated: true,
			});
			expect(result.value.length).toBe(3);
		});

		it('uses default max length when not specified', () => {
			const longString = 'a'.repeat(150);
			const result = truncateString(longString);

			expect(result.value.length).toBe(DEFAULT_MAX_LENGTH);
		});
	});

	describe('Unicode handling', () => {
		it('truncates string with emoji correctly', () => {
			const emojiString = '👋'.repeat(60);
			const result = truncateString(emojiString, 50);

			expect(result.truncated).toBe(true);
			expect(result.value.length).toBe(50);
			expect(result.value.endsWith('...')).toBe(true);
		});

		it('truncates multi-byte characters correctly', () => {
			const japaneseString = '日本語'.repeat(50);
			const result = truncateString(japaneseString, 100);

			expect(result.truncated).toBe(true);
			expect(result.value.length).toBe(100);
			expect(result.value.endsWith('...')).toBe(true);
		});

		it('handles mixed ASCII and Unicode', () => {
			const mixedString = 'Hello 👋 世界'.repeat(20);
			const result = truncateString(mixedString, 50);

			expect(result.truncated).toBe(true);
			expect(result.value.length).toBe(50);
		});
	});

	describe('special characters', () => {
		it('handles strings with newlines', () => {
			const multilineString = 'line1\nline2\nline3\n'.repeat(10);
			const result = truncateString(multilineString, 50);

			expect(result.truncated).toBe(true);
			expect(result.value.length).toBe(50);
		});

		it('handles strings with tabs', () => {
			const tabbedString = 'col1\tcol2\tcol3\t'.repeat(10);
			const result = truncateString(tabbedString, 50);

			expect(result.truncated).toBe(true);
			expect(result.value.length).toBe(50);
		});

		it('handles strings with special characters', () => {
			const specialString = '!@#$%^&*()'.repeat(15);
			const result = truncateString(specialString, 50);

			expect(result.truncated).toBe(true);
			expect(result.value.length).toBe(50);
		});
	});

	describe('edge cases', () => {
		it('handles whitespace-only string', () => {
			const whitespaceString = ' '.repeat(150);
			const result = truncateString(whitespaceString, DEFAULT_MAX_LENGTH);

			expect(result.truncated).toBe(true);
			expect(result.value).toBe(' '.repeat(97) + '...');
		});

		it('preserves content before ellipsis', () => {
			const result = truncateString('abcdefghij'.repeat(20), 50);

			expect(result.truncated).toBe(true);
			expect(result.value.startsWith('abcdefghij')).toBe(true);
			expect(result.value.endsWith('...')).toBe(true);
		});

		it('handles very large strings', () => {
			const hugeString = 'x'.repeat(1000000);
			const result = truncateString(hugeString, 100);

			expect(result.truncated).toBe(true);
			expect(result.value.length).toBe(100);
		});
	});
});
