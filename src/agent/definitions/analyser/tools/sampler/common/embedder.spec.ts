/**
 * Tests for text embedding utilities
 *
 * @vitest-environment node
 */

import {afterEach, describe, expect, it} from 'vitest';

import {isOk} from '@sigil/src/common/errors/result';

import {
	EMBEDDING_DIMENSION,
	MAX_BATCH_SIZE,
	cleanupEmbedder,
	embedBatch,
	embedText,
	getEmbedder,
} from './embedder';

/**
 * Test constants
 */
const NORMALISED_MAGNITUDE = 1.0;
const MAGNITUDE_PRECISION = 5;
const EMBEDDING_VALUE_PRECISION = 6;

/**
 * Timeout for embedder operations
 */
const EMBEDDER_TIMEOUT = 15000; // 15 seconds

describe('embedder', () => {
	afterEach(() => {
		// Clean up singleton after each test
		cleanupEmbedder();
	});

	describe('getEmbedder', () => {
		it('should return successful result with singleton instance', {timeout: EMBEDDER_TIMEOUT}, async () => {
			const result1 = await getEmbedder();
			const result2 = await getEmbedder();

			expect(isOk(result1)).toBe(true);
			expect(isOk(result2)).toBe(true);

			if (isOk(result1) && isOk(result2)) {
				expect(result1.data).toBe(result2.data);
			}
		});

		it('should create new instance after cleanup', {timeout: EMBEDDER_TIMEOUT}, async () => {
			const result1 = await getEmbedder();
			expect(isOk(result1)).toBe(true);

			cleanupEmbedder();

			const result2 = await getEmbedder();
			expect(isOk(result2)).toBe(true);

			// Both should be valid pipelines
			if (isOk(result1) && isOk(result2)) {
				expect(result1.data).toBeDefined();
				expect(result2.data).toBeDefined();
			}
		});
	});

	describe('embedText', () => {
		it('should return 384-dimensional vector', {timeout: EMBEDDER_TIMEOUT}, async () => {
			const result = await embedText('hello world');

			expect(isOk(result)).toBe(true);
			if (isOk(result)) {
				expect(result.data).toHaveLength(EMBEDDING_DIMENSION);
				expect(result.data.every((val) => typeof val === 'number')).toBe(true);
			}
		});

		it('should return normalised vector with magnitude ≈ 1', {timeout: EMBEDDER_TIMEOUT}, async () => {
			const result = await embedText('This is CSV data with columns');

			expect(isOk(result)).toBe(true);
			if (isOk(result)) {
				// Calculate L2 norm (magnitude)
				const magnitude = Math.sqrt(
					result.data.reduce((sum, val) => sum + val * val, 0)
				);

				// Should be very close to 1 (within floating point precision)
				expect(magnitude).toBeCloseTo(NORMALISED_MAGNITUDE, MAGNITUDE_PRECISION);
			}
		});

		it('should produce different embeddings for different texts', {timeout: EMBEDDER_TIMEOUT}, async () => {
			const result1 = await embedText('hello world');
			const result2 = await embedText('goodbye world');

			expect(isOk(result1)).toBe(true);
			expect(isOk(result2)).toBe(true);

			if (isOk(result1) && isOk(result2)) {
				// Embeddings should be different
				const areSame = result1.data.every(
					(val, idx) => val === result2.data.at(idx)
				);
				expect(areSame).toBe(false);
			}
		});

		it('should handle empty string', {timeout: EMBEDDER_TIMEOUT}, async () => {
			const result = await embedText('');

			expect(isOk(result)).toBe(true);
			if (isOk(result)) {
				expect(result.data).toHaveLength(EMBEDDING_DIMENSION);
			}
		});
	});

	describe('embedBatch', () => {
		it('should handle multiple texts', {timeout: EMBEDDER_TIMEOUT}, async () => {
			const texts = ['text one', 'text two', 'text three'];
			const result = await embedBatch(texts);

			expect(isOk(result)).toBe(true);
			if (isOk(result)) {
				expect(result.data).toHaveLength(texts.length);
				expect(result.data.at(0)).toHaveLength(EMBEDDING_DIMENSION);
				expect(result.data.at(1)).toHaveLength(EMBEDDING_DIMENSION);
				expect(result.data.at(2)).toHaveLength(EMBEDDING_DIMENSION);
			}
		});

		it('should return normalised vectors', {timeout: EMBEDDER_TIMEOUT}, async () => {
			const texts = ['hello', 'world'];
			const result = await embedBatch(texts);

			expect(isOk(result)).toBe(true);
			if (isOk(result)) {
				for (const embedding of result.data) {
					const magnitude = Math.sqrt(
						embedding.reduce((sum, val) => sum + val * val, 0)
					);
					expect(magnitude).toBeCloseTo(
						NORMALISED_MAGNITUDE,
						MAGNITUDE_PRECISION
					);
				}
			}
		});

		it('should match embedText results', {timeout: EMBEDDER_TIMEOUT}, async () => {
			const text = 'test text';
			const singleResult = await embedText(text);
			const batchResult = await embedBatch([text]);

			expect(isOk(singleResult)).toBe(true);
			expect(isOk(batchResult)).toBe(true);

			if (isOk(singleResult) && isOk(batchResult)) {
				// Results should be very close (may have minor floating point differences)
				expect(batchResult.data).toHaveLength(1);
				for (let i = 0; i < EMBEDDING_DIMENSION; i++) {
					expect(batchResult.data.at(0)?.at(i)).toBeCloseTo(
						singleResult.data.at(i) ?? 0,
						EMBEDDING_VALUE_PRECISION
					);
				}
			}
		});

		it('should handle empty array', {timeout: EMBEDDER_TIMEOUT}, async () => {
			const result = await embedBatch([]);

			expect(isOk(result)).toBe(true);
			if (isOk(result)) {
				expect(result.data).toHaveLength(0);
			}
		});

		it('should handle single text', {timeout: EMBEDDER_TIMEOUT}, async () => {
			const result = await embedBatch(['single text']);

			expect(isOk(result)).toBe(true);
			if (isOk(result)) {
				expect(result.data).toHaveLength(1);
				expect(result.data.at(0)).toHaveLength(EMBEDDING_DIMENSION);
			}
		});

		it('should handle batches larger than MAX_BATCH_SIZE', {timeout: EMBEDDER_TIMEOUT}, async () => {
			// Create array with more texts than MAX_BATCH_SIZE
			const texts = Array.from({length: MAX_BATCH_SIZE + 50}, (_, i) => `text ${i}`);
			const result = await embedBatch(texts);

			expect(isOk(result)).toBe(true);
			if (isOk(result)) {
				expect(result.data).toHaveLength(texts.length);
				// All embeddings should be valid
				for (const embedding of result.data) {
					expect(embedding).toHaveLength(EMBEDDING_DIMENSION);
				}
			}
		});

		it('should handle batch exactly at MAX_BATCH_SIZE', {timeout: EMBEDDER_TIMEOUT}, async () => {
			const texts = Array.from({length: MAX_BATCH_SIZE}, (_, i) => `text ${i}`);
			const result = await embedBatch(texts);

			expect(isOk(result)).toBe(true);
			if (isOk(result)) {
				expect(result.data).toHaveLength(MAX_BATCH_SIZE);
			}
		});

		it('should handle batch just over MAX_BATCH_SIZE', {timeout: EMBEDDER_TIMEOUT}, async () => {
			const texts = Array.from({length: MAX_BATCH_SIZE + 1}, (_, i) => `text ${i}`);
			const result = await embedBatch(texts);

			expect(isOk(result)).toBe(true);
			if (isOk(result)) {
				expect(result.data).toHaveLength(MAX_BATCH_SIZE + 1);
			}
		});
	});

	describe('cleanupEmbedder', () => {
		it('should reset singleton state', {timeout: EMBEDDER_TIMEOUT}, async () => {
			// Get initial embedder
			const result1 = await getEmbedder();
			expect(isOk(result1)).toBe(true);

			// Cleanup
			cleanupEmbedder();

			// Next call should work (creates new instance)
			const result2 = await embedText('test');
			expect(isOk(result2)).toBe(true);
			if (isOk(result2)) {
				expect(result2.data).toHaveLength(EMBEDDING_DIMENSION);
			}
		});
	});

	describe('error handling', () => {
		it('should handle concurrent initialisation requests', {timeout: EMBEDDER_TIMEOUT}, async () => {
			// Fire multiple requests simultaneously before first completes
			const promises = Array.from({length: 5}, () => embedText('concurrent test'));

			const results = await Promise.all(promises);

			// All should succeed
			for (const result of results) {
				expect(isOk(result)).toBe(true);
				if (isOk(result)) {
					expect(result.data).toHaveLength(EMBEDDING_DIMENSION);
				}
			}
		});

		it('should handle rapid successive calls', {timeout: EMBEDDER_TIMEOUT}, async () => {
			// Quick successive calls
			const result1 = await embedText('call 1');
			const result2 = await embedText('call 2');
			const result3 = await embedText('call 3');

			expect(isOk(result1)).toBe(true);
			expect(isOk(result2)).toBe(true);
			expect(isOk(result3)).toBe(true);
		});
	});
});
