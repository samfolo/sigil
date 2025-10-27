import {describe, expect, it} from 'vitest';

import {isErr, isOk} from '@sigil/src/common/errors/result';

import type {Chunk} from './chunkText';
import {chunkText} from './chunkText';

describe('chunkText', () => {
	describe('parameter validation', () => {
		it('returns error for zero chunk size', () => {
			const result = chunkText('test', 0, 10);
			expect(isErr(result)).toBe(true);
			if (isErr(result)) {
				expect(result.error).toContain('Chunk size must be greater than 0');
			}
		});

		it('returns error for negative chunk size', () => {
			const result = chunkText('test', -100, 10);
			expect(isErr(result)).toBe(true);
			if (isErr(result)) {
				expect(result.error).toContain('Chunk size must be greater than 0');
			}
		});

		it('returns error for negative overlap', () => {
			const result = chunkText('test', 200, -10);
			expect(isErr(result)).toBe(true);
			if (isErr(result)) {
				expect(result.error).toContain('Overlap must be non-negative');
			}
		});

		it('returns error when overlap >= chunk size', () => {
			const result = chunkText('test', 100, 100);
			expect(isErr(result)).toBe(true);
			if (isErr(result)) {
				expect(result.error).toContain('Overlap must be less than chunk size');
			}
		});

		it('returns error when overlap > chunk size', () => {
			const result = chunkText('test', 100, 150);
			expect(isErr(result)).toBe(true);
			if (isErr(result)) {
				expect(result.error).toContain('Overlap must be less than chunk size');
			}
		});
	});

	describe('edge cases', () => {
		it('returns empty array for empty string', () => {
			const result = chunkText('');
			expect(isOk(result)).toBe(true);
			if (isOk(result)) {
				expect(result.data).toEqual([]);
			}
		});

		it('returns empty array for whitespace-only string', () => {
			const result = chunkText('   \n\t  \n  ');
			expect(isOk(result)).toBe(true);
			if (isOk(result)) {
				expect(result.data).toEqual([]);
			}
		});

		it('returns single chunk for text shorter than chunk size', () => {
			const text = 'Short text.';
			const result = chunkText(text, 200);
			expect(isOk(result)).toBe(true);
			if (isOk(result)) {
				expect(result.data).toHaveLength(1);
				expect(result.data.at(0)?.content).toBe('Short text.');
			}
		});

		it('returns single chunk for text equal to chunk size', () => {
			const text = 'a'.repeat(200);
			const result = chunkText(text, 200);
			expect(isOk(result)).toBe(true);
			if (isOk(result)) {
				expect(result.data).toHaveLength(1);
				expect(result.data.at(0)?.content).toBe(text);
			}
		});
	});

	describe('character-based chunking', () => {
		it('chunks long text into multiple chunks', () => {
			const text = 'a'.repeat(500);
			const result = chunkText(text, 200, 10);

			expect(isOk(result)).toBe(true);
			if (isOk(result)) {
				expect(result.data.length).toBeGreaterThan(1);
				// Each chunk should be exactly 200 chars except possibly the last
				for (let i = 0; i < result.data.length - 1; i++) {
					expect(result.data.at(i)?.content.length).toBe(200);
				}
			}
		});

		it('produces expected number of chunks for known input', () => {
			// 1000 chars, chunk size 200, overlap 10
			// Step size = 200 - 10 = 190
			// Positions: 0, 190, 380, 570, 760, 950 (stop after 950+200=1150 > 1000)
			// Last chunk: position 950, length 50
			// Total: 6 chunks
			const text = 'a'.repeat(1000);
			const result = chunkText(text, 200, 10);

			expect(isOk(result)).toBe(true);
			if (isOk(result)) {
				expect(result.data.length).toBe(6);
			}
		});

		it('respects maximum chunk size', () => {
			const text = 'x'.repeat(1000);
			const result = chunkText(text, 150, 20);

			expect(isOk(result)).toBe(true);
			if (isOk(result)) {
				for (const chunk of result.data) {
					expect(chunk.content.length).toBeLessThanOrEqual(150);
				}
			}
		});

		it('handles text that requires exact number of chunks', () => {
			// 400 chars, chunk 200, overlap 0 → exactly 2 chunks
			const text = 'b'.repeat(400);
			const result = chunkText(text, 200, 0);

			expect(isOk(result)).toBe(true);
			if (isOk(result)) {
				expect(result.data.length).toBe(2);
				expect(result.data.at(0)?.content.length).toBe(200);
				expect(result.data.at(1)?.content.length).toBe(200);
			}
		});
	});

	describe('overlap behaviour', () => {
		it('chunks have correct overlap', () => {
			const text = 'abcdefghij'.repeat(30); // 300 chars
			const overlap = 20;
			const result = chunkText(text, 100, overlap);

			expect(isOk(result)).toBe(true);
			if (isOk(result) && result.data.length > 1) {
				// Check overlap between consecutive chunks
				for (let i = 0; i < result.data.length - 1; i++) {
					const currentChunk = result.data.at(i)?.content ?? '';
					const nextChunk = result.data.at(i + 1)?.content ?? '';

					// Last `overlap` chars of current should match first `overlap` chars of next
					const currentEnd = currentChunk.slice(-overlap);
					const nextStart = nextChunk.slice(0, overlap);

					expect(currentEnd).toBe(nextStart);
				}
			}
		});

		it('works with zero overlap', () => {
			// Use varied pattern to verify no overlap
			const pattern = '0123456789';
			const text = pattern.repeat(40); // 400 chars
			const result = chunkText(text, 200, 0);

			expect(isOk(result)).toBe(true);
			if (isOk(result)) {
				expect(result.data.length).toBe(2);

				const firstChunk = result.data.at(0)?.content ?? '';
				const secondChunk = result.data.at(1)?.content ?? '';

				// With no overlap, last char of first ≠ first char of second
				// First chunk ends at index 199, which is pattern[9] = '9'
				// Second chunk starts at index 200, which is pattern[0] = '0'
				expect(firstChunk.at(-1)).toBe('9');
				expect(secondChunk.at(0)).toBe('0');
			}
		});

		it('works with default overlap of 10 chars', () => {
			const pattern = '0123456789';
			const text = pattern.repeat(50); // 500 chars
			const result = chunkText(text);

			expect(isOk(result)).toBe(true);
			if (isOk(result) && result.data.length > 1) {
				const firstChunk = result.data.at(0)?.content ?? '';
				const secondChunk = result.data.at(1)?.content ?? '';

				// With overlap 10, last 10 chars of first = first 10 chars of second
				const overlapFromFirst = firstChunk.slice(-10);
				const overlapFromSecond = secondChunk.slice(0, 10);

				expect(overlapFromFirst).toBe(overlapFromSecond);
				// Also verify it's actually meaningful overlap (not empty)
				expect(overlapFromFirst.length).toBe(10);
			}
		});
	});

	describe('format handling', () => {
		it('handles CSV-like data reliably', () => {
			const text = 'id,name,value\n1,Dr. Alice,123.45\n2,Bob,200\n3,Charlie,300\n'.repeat(5);
			const result = chunkText(text, 100, 10);

			expect(isOk(result)).toBe(true);
			if (isOk(result)) {
				expect(result.data.length).toBeGreaterThan(0);
				// Character-based: chunks are predictable length
				for (const chunk of result.data.slice(0, -1)) {
					expect(chunk.content.length).toBe(100);
				}
			}
		});

		it('handles JSON-like data reliably', () => {
			const text = '{"key": "value", "number": 123, "nested": {"field": true}}'.repeat(20);
			const result = chunkText(text, 150, 15);

			expect(isOk(result)).toBe(true);
			if (isOk(result)) {
				expect(result.data.length).toBeGreaterThan(0);
				// All chunks predictable size (character-based)
				for (const chunk of result.data.slice(0, -1)) {
					expect(chunk.content.length).toBe(150);
				}
			}
		});

		it('handles YAML-like data reliably', () => {
			const text = 'key: value\nlist:\n  - item1\n  - item2\nnumber: 42\n'.repeat(15);
			const result = chunkText(text, 100, 10);

			expect(isOk(result)).toBe(true);
			if (isOk(result)) {
				expect(result.data.length).toBeGreaterThan(0);
			}
		});

		it('handles XML-like data reliably', () => {
			const text = '<root><item id="1">Value</item><item id="2">Another</item></root>'.repeat(10);
			const result = chunkText(text, 120, 15);

			expect(isOk(result)).toBe(true);
			if (isOk(result)) {
				expect(result.data.length).toBeGreaterThan(0);
			}
		});

		it('handles prose text', () => {
			const text =
				'This is a test. It has multiple sentences. Each sentence should be handled properly.'.repeat(
					5
				);
			const result = chunkText(text, 120, 10);

			expect(isOk(result)).toBe(true);
			if (isOk(result)) {
				expect(result.data.length).toBeGreaterThan(0);
				// All chunks should be meaningful
				for (const chunk of result.data) {
					expect(chunk.content.length).toBeGreaterThan(0);
				}
			}
		});
	});

	describe('practical use cases', () => {
		it('chunks 1000-char text with defaults', () => {
			const text = 'Sample text'.repeat(100); // ~1100 chars
			const result = chunkText(text);

			expect(isOk(result)).toBe(true);
			if (isOk(result)) {
				// With default 200 char chunks and 10 overlap, step = 190
				// Expect 6+ chunks
				expect(result.data.length).toBeGreaterThanOrEqual(6);
			}
		});

		it('handles mixed content deterministically', () => {
			const text = 'Line 1.\nLine 2.\nLine 3.\n'.repeat(20);
			const result = chunkText(text, 100, 10);

			expect(isOk(result)).toBe(true);
			if (isOk(result)) {
				expect(result.data.length).toBeGreaterThan(0);
				// Character-based: all non-final chunks are exactly 100 chars
				for (let i = 0; i < result.data.length - 1; i++) {
					expect(result.data.at(i)?.content.length).toBe(100);
				}
			}
		});

		it('provides LLM with sufficient context vignettes', () => {
			// GeoJSON-like data
			const geoJSON = '{"type":"Feature","geometry":{"type":"Point","coordinates":[1.0,2.0]}}';
			const text = geoJSON.repeat(10);
			const result = chunkText(text, 200, 10);

			expect(isOk(result)).toBe(true);
			if (isOk(result)) {
				// Each 200-char chunk should contain enough context to identify GeoJSON
				const firstChunk = result.data.at(0)?.content ?? '';
				expect(firstChunk.length).toBeGreaterThanOrEqual(100);
				// Should contain recognisable GeoJSON patterns
				expect(firstChunk).toContain('type');
			}
		});
	});

	describe('default parameters', () => {
		it('uses default chunk size of 200', () => {
			const text = 'e'.repeat(500);
			const result = chunkText(text);

			expect(isOk(result)).toBe(true);
			if (isOk(result)) {
				// All chunks except last should be 200 chars
				for (let i = 0; i < result.data.length - 1; i++) {
					expect(result.data.at(i)?.content.length).toBe(200);
				}
			}
		});

		it('uses default overlap of 10', () => {
			const text = 'f'.repeat(500);
			const result = chunkText(text);

			expect(isOk(result)).toBe(true);
			if (isOk(result) && result.data.length > 1) {
				// Check first two chunks have 10-char overlap
				const first = result.data.at(0)?.content ?? '';
				const second = result.data.at(1)?.content ?? '';
				expect(first.slice(-10)).toBe(second.slice(0, 10));
			}
		});
	});

	describe('position metadata', () => {
		it('tracks positions correctly in text without leading whitespace', () => {
			const text = 'abcdefghij'.repeat(40); // 400 chars, no leading whitespace
			const result = chunkText(text, 100, 0);

			expect(isOk(result)).toBe(true);
			if (isOk(result)) {
				// First chunk should start at 0
				expect(result.data.at(0)?.start).toBe(0);
				expect(result.data.at(0)?.end).toBe(100);

				// Second chunk should start at 100
				expect(result.data.at(1)?.start).toBe(100);
				expect(result.data.at(1)?.end).toBe(200);

				// Verify content matches position
				const firstChunk = result.data.at(0);
				if (firstChunk) {
					expect(text.slice(firstChunk.start, firstChunk.end)).toBe(
						firstChunk.content
					);
				}
			}
		});

		it('tracks positions correctly in text with leading whitespace', () => {
			const text = '   abcdefghij'.repeat(40); // Leading spaces on first repeat
			const result = chunkText(text, 100, 0);

			expect(isOk(result)).toBe(true);
			if (isOk(result)) {
				const firstChunk = result.data.at(0);
				if (firstChunk) {
					// Position should account for trimmed leading whitespace
					expect(text.slice(firstChunk.start, firstChunk.end)).toBe(
						firstChunk.content
					);
				}
			}
		});

		it('tracks positions correctly with overlap', () => {
			const text = '0123456789'.repeat(30); // 300 chars
			const result = chunkText(text, 100, 20);

			expect(isOk(result)).toBe(true);
			if (isOk(result)) {
				// Verify all chunks have correct positions
				for (const chunk of result.data) {
					const extracted = text.slice(chunk.start, chunk.end);
					expect(extracted).toBe(chunk.content);
				}

				// Verify step size
				const step = 100 - 20; // 80
				expect(result.data.at(1)?.start).toBe(step);
				expect(result.data.at(2)?.start).toBe(step * 2);
			}
		});

		it('returns correct positions for single chunk', () => {
			const text = 'Short';
			const result = chunkText(text, 200);

			expect(isOk(result)).toBe(true);
			if (isOk(result)) {
				const chunk = result.data.at(0);
				expect(chunk?.start).toBe(0);
				expect(chunk?.end).toBe(5);
				expect(text.slice(chunk?.start ?? 0, chunk?.end ?? 0)).toBe('Short');
			}
		});

		it('handles whitespace-only prefix correctly', () => {
			const text = '     actual content';
			const result = chunkText(text, 200);

			expect(isOk(result)).toBe(true);
			if (isOk(result)) {
				const chunk = result.data.at(0);
				expect(chunk?.content).toBe('actual content');
				expect(text.slice(chunk?.start ?? 0, chunk?.end ?? 0)).toBe(
					'actual content'
				);
			}
		});
	});
});
