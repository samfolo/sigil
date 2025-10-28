import {describe, expect, it} from 'vitest';

import {calculateSize} from './calculateSize';

describe('calculateSize', () => {
	describe('empty string', () => {
		it('returns all zeros for empty string', () => {
			const result = calculateSize('');

			expect(result).toEqual({
				bytes: 0,
				characters: 0,
				lines: 0,
			});
		});
	});

	describe('single line', () => {
		it('calculates size for simple ASCII text', () => {
			const result = calculateSize('hello');

			expect(result).toEqual({
				bytes: 5,
				characters: 5,
				lines: 1,
			});
		});

		it('calculates size for line with trailing newline', () => {
			const result = calculateSize('hello\n');

			expect(result).toEqual({
				bytes: 6,
				characters: 6,
				lines: 2,
			});
		});

		it('calculates size for line with CRLF', () => {
			const result = calculateSize('hello\r\n');

			expect(result).toEqual({
				bytes: 7,
				characters: 7,
				lines: 2,
			});
		});
	});

	describe('multiple lines', () => {
		it('calculates size for two lines with LF', () => {
			const result = calculateSize('hello\nworld');

			expect(result).toEqual({
				bytes: 11,
				characters: 11,
				lines: 2,
			});
		});

		it('calculates size for two lines with trailing newline', () => {
			const result = calculateSize('hello\nworld\n');

			expect(result).toEqual({
				bytes: 12,
				characters: 12,
				lines: 3,
			});
		});

		it('calculates size for three lines', () => {
			const result = calculateSize('line1\nline2\nline3');

			expect(result).toEqual({
				bytes: 17,
				characters: 17,
				lines: 3,
			});
		});

		it('handles mixed line endings', () => {
			const result = calculateSize('unix\nwindows\r\nmac\rend');

			expect(result).toEqual({
				bytes: 21,
				characters: 21,
				lines: 4,
			});
		});
	});

	describe('Unicode characters', () => {
		it('calculates bytes correctly for emoji', () => {
			const result = calculateSize('Hello 👋');

			expect(result.characters).toBe(8);
			expect(result.bytes).toBe(10);
			expect(result.lines).toBe(1);
		});

		it('calculates bytes correctly for multi-byte characters', () => {
			const result = calculateSize('日本語');

			expect(result.characters).toBe(3);
			expect(result.bytes).toBe(9);
			expect(result.lines).toBe(1);
		});

		it('handles emoji with newlines', () => {
			const result = calculateSize('👋\n🌍\n✨');

			expect(result.characters).toBe(7);
			expect(result.bytes).toBe(13);
			expect(result.lines).toBe(3);
		});

		it('handles complex Unicode with combining characters', () => {
			const result = calculateSize('e\u0301');

			expect(result.characters).toBe(2);
			expect(result.bytes).toBe(3);
			expect(result.lines).toBe(1);
		});
	});

	describe('edge cases', () => {
		it('handles string with only newlines', () => {
			const result = calculateSize('\n\n\n');

			expect(result).toEqual({
				bytes: 3,
				characters: 3,
				lines: 4,
			});
		});

		it('handles very long single line', () => {
			const longLine = 'a'.repeat(10000);
			const result = calculateSize(longLine);

			expect(result).toEqual({
				bytes: 10000,
				characters: 10000,
				lines: 1,
			});
		});

		it('handles whitespace-only content', () => {
			const result = calculateSize('   \t   \n   ');

			expect(result).toEqual({
				bytes: 11,
				characters: 11,
				lines: 2,
			});
		});
	});
});
