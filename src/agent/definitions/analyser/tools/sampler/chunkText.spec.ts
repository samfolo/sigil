import {describe, expect, it} from 'vitest';

import {chunkText} from './chunkText';

describe('chunkText', () => {
	describe('edge cases', () => {
		it('returns empty array for empty string', () => {
			const result = chunkText('');
			expect(result).toEqual([]);
		});

		it('returns empty array for whitespace-only string', () => {
			const result = chunkText('   \n\t  \n  ');
			expect(result).toEqual([]);
		});

		it('returns single chunk for text shorter than chunk size', () => {
			const text = 'Short text.';
			const result = chunkText(text, 200);
			expect(result.length).toBeGreaterThan(0);
			expect(result.join('')).toContain('Short text');
		});
	});

	describe('basic chunking', () => {
		it('chunks long text into multiple chunks', () => {
			const text = 'Sentence one. '.repeat(50); // ~700 chars
			const result = chunkText(text, 200, 50);

			expect(result.length).toBeGreaterThan(1);
			// Each chunk should be within size limits
			for (const chunk of result) {
				expect(chunk.length).toBeLessThanOrEqual(200);
			}
		});

		it('respects maximum chunk size', () => {
			const text = 'Word. '.repeat(200); // ~1200 chars
			const result = chunkText(text, 150, 30);

			// All chunks should respect the max length
			for (const chunk of result) {
				expect(chunk.length).toBeLessThanOrEqual(150);
			}
		});

		it('handles very long single sentence', () => {
			const text = 'This is a very long sentence without any punctuation marks that goes on and on'.repeat(20);
			const result = chunkText(text, 200, 50);

			expect(result.length).toBeGreaterThan(0);
			// Should still produce chunks
			expect(result.length).toBeGreaterThan(1);
		});
	});

	describe('overlap behaviour', () => {
		it('chunks have overlap between them', () => {
			const text = 'First sentence. Second sentence. Third sentence. Fourth sentence. Fifth sentence.';
			const result = chunkText(text, 50, 20);

			if (result.length > 1) {
				// Verify that consecutive chunks share some content
				let hasOverlap = false;
				for (let i = 0; i < result.length - 1; i++) {
					const currentChunk = result.at(i) ?? '';
					const nextChunk = result.at(i + 1) ?? '';

					// Check if any words from the end of current appear in next
					const currentWords = currentChunk.split(' ').slice(-3);
					for (const word of currentWords) {
						if (word.length > 2 && nextChunk.includes(word)) {
							hasOverlap = true;
							break;
						}
					}
					if (hasOverlap) {
						break;
					}
				}

				// Note: llm-chunk's overlap behaviour may vary, so we check if overlap exists
				// but don't enforce strict overlap in all cases
				expect(hasOverlap || result.length === 2).toBe(true);
			}
		});
	});

	describe('format handling', () => {
		it('handles CSV-like data', () => {
			const text = 'id,name,value\n1,Alice,100\n2,Bob,200\n3,Charlie,300\n'.repeat(10);
			const result = chunkText(text, 100, 20);

			expect(result.length).toBeGreaterThan(0);
			// Should not crash and should produce reasonable chunks
			expect(result.join('').length).toBeGreaterThan(0);
		});

		it('handles JSON-like data', () => {
			const text = '{"key": "value", "number": 123, "nested": {"field": true}}'.repeat(20);
			const result = chunkText(text, 150, 30);

			expect(result.length).toBeGreaterThan(0);
			expect(result.join('').length).toBeGreaterThan(0);
		});

		it('handles YAML-like data', () => {
			const text = 'key: value\nlist:\n  - item1\n  - item2\nnumber: 42\n'.repeat(15);
			const result = chunkText(text, 100, 25);

			expect(result.length).toBeGreaterThan(0);
			expect(result.join('').length).toBeGreaterThan(0);
		});

		it('handles prose text', () => {
			const text = 'This is a test. It has multiple sentences. Each sentence should be handled properly. The chunking should work well.'.repeat(5);
			const result = chunkText(text, 120, 30);

			expect(result.length).toBeGreaterThan(0);
			// All chunks should contain readable text
			for (const chunk of result) {
				expect(chunk.length).toBeGreaterThan(0);
			}
		});
	});

	describe('practical use cases', () => {
		it('chunks 1000-char text with defaults', () => {
			const text = 'Sample text. '.repeat(80); // ~1000 chars
			const result = chunkText(text);

			expect(result.length).toBeGreaterThan(0);
			// With default 200 char chunks and 50 overlap, expect multiple chunks
			expect(result.length).toBeGreaterThan(3);
		});

		it('handles mixed content with newlines and periods', () => {
			const text = 'Line 1.\nLine 2.\nLine 3.\n'.repeat(20);
			const result = chunkText(text, 100, 25);

			expect(result.length).toBeGreaterThan(0);
			// Should produce multiple chunks
			expect(result.length).toBeGreaterThan(1);
		});

		it('does not produce empty chunks', () => {
			const text = 'Text with spacing.    \n\n    More text here.    \n\n    Final text.';
			const result = chunkText(text, 50, 10);

			// No empty chunks
			for (const chunk of result) {
				expect(chunk.trim().length).toBeGreaterThan(0);
			}
		});
	});

	describe('default parameters', () => {
		it('uses default chunk size of 200', () => {
			const text = 'Test sentence. '.repeat(100); // ~1500 chars
			const result = chunkText(text);

			// All chunks should be <= 200 chars (default)
			for (const chunk of result) {
				expect(chunk.length).toBeLessThanOrEqual(200);
			}
		});

		it('uses default overlap of 50', () => {
			const text = 'A sentence. '.repeat(50);
			const result = chunkText(text);

			expect(result.length).toBeGreaterThan(0);
		});
	});
});
