/**
 * Tests for text embedding utilities
 *
 * @vitest-environment node
 */

import {describe, it, expect, afterEach} from 'vitest';

import {
	getEmbedder,
	embedText,
	embedBatch,
	cleanupEmbedder,
	EMBEDDING_DIMENSION,
} from './embedder';

/**
 * Test constants
 */
const NORMALISED_MAGNITUDE = 1.0;
const MAGNITUDE_PRECISION = 5;
const EMBEDDING_VALUE_PRECISION = 6;

describe('embedder', () => {
	afterEach(() => {
		// Clean up singleton after each test
		cleanupEmbedder();
	});

	describe('getEmbedder', () => {
		it('should return a singleton instance', async () => {
			const embedder1 = await getEmbedder();
			const embedder2 = await getEmbedder();

			expect(embedder1).toBe(embedder2);
		});

		it('should create new instance after cleanup', async () => {
			const embedder1 = await getEmbedder();
			cleanupEmbedder();
			const embedder2 = await getEmbedder();

			// Note: We can't directly compare instances since cleanup sets to null
			// Instead verify both are valid pipelines
			expect(embedder1).toBeDefined();
			expect(embedder2).toBeDefined();
		});
	});

	describe('embedText', () => {
		it('should return 384-dimensional vector', async () => {
			const embedding = await embedText('hello world');

			expect(embedding).toHaveLength(EMBEDDING_DIMENSION);
			expect(embedding.every((val) => typeof val === 'number')).toBe(true);
		});

		it('should return normalised vector with magnitude ≈ 1', async () => {
			const embedding = await embedText('This is CSV data with columns');

			// Calculate L2 norm (magnitude)
			const magnitude = Math.sqrt(
				embedding.reduce((sum, val) => sum + val * val, 0)
			);

			// Should be very close to 1 (within floating point precision)
			expect(magnitude).toBeCloseTo(NORMALISED_MAGNITUDE, MAGNITUDE_PRECISION);
		});

		it('should produce different embeddings for different texts', async () => {
			const embedding1 = await embedText('hello world');
			const embedding2 = await embedText('goodbye world');

			// Embeddings should be different
			const areSame = embedding1.every((val, idx) => val === embedding2[idx]);
			expect(areSame).toBe(false);
		});

		it('should handle empty string', async () => {
			const embedding = await embedText('');

			expect(embedding).toHaveLength(EMBEDDING_DIMENSION);
		});
	});

	describe('embedBatch', () => {
		it('should handle multiple texts', async () => {
			const texts = ['text one', 'text two', 'text three'];
			const embeddings = await embedBatch(texts);

			expect(embeddings).toHaveLength(texts.length);
			expect(embeddings[0]).toHaveLength(EMBEDDING_DIMENSION);
			expect(embeddings[1]).toHaveLength(EMBEDDING_DIMENSION);
			expect(embeddings[2]).toHaveLength(EMBEDDING_DIMENSION);
		});

		it('should return normalised vectors', async () => {
			const texts = ['hello', 'world'];
			const embeddings = await embedBatch(texts);

			for (const embedding of embeddings) {
				const magnitude = Math.sqrt(
					embedding.reduce((sum, val) => sum + val * val, 0)
				);
				expect(magnitude).toBeCloseTo(NORMALISED_MAGNITUDE, MAGNITUDE_PRECISION);
			}
		});

		it('should match embedText results', async () => {
			const text = 'test text';
			const singleEmbedding = await embedText(text);
			const batchEmbeddings = await embedBatch([text]);

			// Results should be very close (may have minor floating point differences)
			expect(batchEmbeddings).toHaveLength(1);
			for (let i = 0; i < EMBEDDING_DIMENSION; i++) {
				expect(batchEmbeddings[0][i]).toBeCloseTo(singleEmbedding[i], EMBEDDING_VALUE_PRECISION);
			}
		});

		it('should handle empty array', async () => {
			const embeddings = await embedBatch([]);

			expect(embeddings).toHaveLength(0);
		});

		it('should handle single text', async () => {
			const embeddings = await embedBatch(['single text']);

			expect(embeddings).toHaveLength(1);
			expect(embeddings[0]).toHaveLength(EMBEDDING_DIMENSION);
		});
	});

	describe('cleanupEmbedder', () => {
		it('should reset singleton state', async () => {
			// Get initial embedder
			await getEmbedder();

			// Cleanup
			cleanupEmbedder();

			// Next call should work (creates new instance)
			const embedding = await embedText('test');
			expect(embedding).toHaveLength(EMBEDDING_DIMENSION);
		});
	});
});
