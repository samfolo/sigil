/**
 * Tests for generateInitialVignettes
 *
 * @vitest-environment node
 */

import {afterEach, describe, expect, it} from 'vitest';

import {isErr, isOk} from '@sigil/src/common/errors/result';

import {cleanupEmbedder, EMBEDDING_DIMENSION} from '../common';

import {generateInitialVignettes} from './generateInitialVignettes';

describe('generateInitialVignettes', () => {
	afterEach(() => {
		// Clean up embedder singleton after each test
		cleanupEmbedder();
	});

	it('returns correct number of vignettes', async () => {
		const data = 'Sample text. '.repeat(100); // ~1300 chars
		const result = await generateInitialVignettes(data, 5);

		expect(isOk(result)).toBe(true);
		if (isOk(result)) {
			expect(result.data.vignettes).toHaveLength(5);
		}
	});

	it('returns all chunks when count exceeds available', async () => {
		const data = 'Short text.'; // Will produce 1 chunk
		const result = await generateInitialVignettes(data, 100);

		expect(isOk(result)).toBe(true);
		if (isOk(result)) {
			expect(result.data.vignettes.length).toBeLessThanOrEqual(1);
		}
	});

	it('vignettes have valid 384-dimensional embeddings', async () => {
		const data = 'Test data. '.repeat(50);
		const result = await generateInitialVignettes(data, 3);

		expect(isOk(result)).toBe(true);
		if (isOk(result)) {
			for (const vignette of result.data.vignettes) {
				expect(vignette.embedding).toHaveLength(EMBEDDING_DIMENSION);
				expect(vignette.embedding.every((v) => typeof v === 'number')).toBe(
					true
				);
			}
		}
	});

	it('vignettes have valid positions', async () => {
		const data = '0123456789'.repeat(50); // 500 chars
		const result = await generateInitialVignettes(data, 5);

		expect(isOk(result)).toBe(true);
		if (isOk(result)) {
			for (const vignette of result.data.vignettes) {
				expect(vignette.position.start).toBeGreaterThanOrEqual(0);
				expect(vignette.position.end).toBeGreaterThan(vignette.position.start);
				expect(vignette.position.end).toBeLessThanOrEqual(data.length);
			}
		}
	});

	it('positions point to correct content in rawData', async () => {
		const data = 'ABCDEFGHIJ'.repeat(50); // 500 chars
		const result = await generateInitialVignettes(data, 5);

		expect(isOk(result)).toBe(true);
		if (isOk(result)) {
			for (const vignette of result.data.vignettes) {
				const extracted = data.slice(
					vignette.position.start,
					vignette.position.end
				);
				expect(extracted).toBe(vignette.content);
			}
		}
	});

	it('state tracks provided indices correctly', async () => {
		const data = 'Sample text entry. '.repeat(500); // ~9500 chars for enough chunks
		const result = await generateInitialVignettes(data, 10);

		expect(isOk(result)).toBe(true);
		if (isOk(result)) {
			const {state} = result.data;

			// Provided 10 vignettes
			expect(state.providedIndices.size).toBe(10);

			// Total chunks in dataset must be at least 10 (can't provide more than exist)
			expect(state.allChunks.length).toBeGreaterThanOrEqual(10);

			// Embeddings array matches chunks array
			expect(state.allEmbeddings.length).toBe(state.allChunks.length);

			// All provided indices should be within bounds
			for (const index of state.providedIndices) {
				expect(index).toBeGreaterThanOrEqual(0);
				expect(index).toBeLessThan(state.allChunks.length);
			}
		}
	});

	it('state preserves raw data', async () => {
		const data = 'Original data with spaces   ';
		const result = await generateInitialVignettes(data, 1);

		expect(isOk(result)).toBe(true);
		if (isOk(result)) {
			expect(result.data.state.rawData).toBe(data);
		}
	});

	it('handles empty data with error', async () => {
		const result = await generateInitialVignettes('', 5);

		expect(isErr(result)).toBe(true);
		if (isErr(result)) {
			expect(result.error).toContain('empty');
		}
	});

	it('handles whitespace-only data with error', async () => {
		const result = await generateInitialVignettes('   \n\t  ', 5);

		expect(isErr(result)).toBe(true);
		if (isErr(result)) {
			expect(result.error).toContain('empty');
		}
	});

	it('handles zero count with error', async () => {
		const result = await generateInitialVignettes('Some data', 0);

		expect(isErr(result)).toBe(true);
		if (isErr(result)) {
			expect(result.error).toContain('greater than 0');
		}
	});

	it('handles negative count with error', async () => {
		const result = await generateInitialVignettes('Some data', -5);

		expect(isErr(result)).toBe(true);
		if (isErr(result)) {
			expect(result.error).toContain('greater than 0');
		}
	});

	it('generates diverse samples', async () => {
		// Create data with clear diversity
		const data = [
			'Apple Banana Cherry ',
			'Dog Elephant Fox ',
			'Guitar Harp Instrument ',
		]
			.join('')
			.repeat(20);

		const result = await generateInitialVignettes(data, 10);

		expect(isOk(result)).toBe(true);
		if (isOk(result)) {
			// Verify embeddings are different (diversity)
			const {vignettes} = result.data;
			const embeddings = vignettes.map((v) => v.embedding);

			// Check that not all embeddings are identical
			const firstEmbedding = embeddings.at(0);
			const allSame = embeddings.every((emb) =>
				emb.every((val, idx) => val === firstEmbedding?.at(idx))
			);

			expect(allSame).toBe(false);
		}
	});
});
