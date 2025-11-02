/**
 * Tests for generateInitialVignettes
 *
 * @vitest-environment node
 */

import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';

import {isErr, isOk} from '@sigil/src/common/errors/result';

import {cleanupEmbedder, EMBEDDING_DIMENSION} from '../common';

import {generateInitialVignettes} from './generateInitialVignettes';

/**
 * Test constants
 */
const SAMPLE_TEXT_REPEAT_SMALL = 50;
const SAMPLE_TEXT_REPEAT_MEDIUM = 100;
const SAMPLE_TEXT_REPEAT_LARGE = 500;
const SAMPLE_VIGNETTE_COUNT_SMALL = 3;
const SAMPLE_VIGNETTE_COUNT_MEDIUM = 5;
const SAMPLE_VIGNETTE_COUNT_LARGE = 10;
const SAMPLE_VIGNETTE_COUNT_EXCESSIVE = 100;
const SAMPLE_DIVERSITY_TOPICS = 20;

describe('generateInitialVignettes', () => {
	beforeEach(() => {
		// Mock console.error to avoid polluting test output
		vi.spyOn(console, 'error').mockImplementation(() => {});
	});

	afterEach(() => {
		// Clean up embedder singleton after each test
		cleanupEmbedder();
		// Restore console.error
		vi.restoreAllMocks();
	});

	it('returns correct number of vignettes', async () => {
		const data = 'Sample text. '.repeat(SAMPLE_TEXT_REPEAT_MEDIUM);
		const result = await generateInitialVignettes(data, SAMPLE_VIGNETTE_COUNT_MEDIUM);

		expect(isOk(result)).toBe(true);
		if (isOk(result)) {
			expect(result.data.vignettes).toHaveLength(SAMPLE_VIGNETTE_COUNT_MEDIUM);
		}
	});

	it('returns all chunks when count exceeds available', async () => {
		const data = 'Short text.';
		const result = await generateInitialVignettes(data, SAMPLE_VIGNETTE_COUNT_EXCESSIVE);

		expect(isOk(result)).toBe(true);
		if (isOk(result)) {
			expect(result.data.vignettes.length).toBeLessThanOrEqual(1);
		}
	});

	it('vignettes have valid 384-dimensional embeddings', async () => {
		const data = 'Test data. '.repeat(SAMPLE_TEXT_REPEAT_SMALL);
		const result = await generateInitialVignettes(data, SAMPLE_VIGNETTE_COUNT_SMALL);

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
		const data = '0123456789'.repeat(SAMPLE_TEXT_REPEAT_SMALL);
		const result = await generateInitialVignettes(data, SAMPLE_VIGNETTE_COUNT_MEDIUM);

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
		const data = 'ABCDEFGHIJ'.repeat(SAMPLE_TEXT_REPEAT_SMALL);
		const result = await generateInitialVignettes(data, SAMPLE_VIGNETTE_COUNT_MEDIUM);

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
		const data = 'Sample text entry. '.repeat(SAMPLE_TEXT_REPEAT_LARGE);
		const result = await generateInitialVignettes(data, SAMPLE_VIGNETTE_COUNT_LARGE);

		expect(isOk(result)).toBe(true);
		if (isOk(result)) {
			const {state} = result.data;

			// Provided vignettes match requested count
			expect(state.providedIndices.size).toBe(SAMPLE_VIGNETTE_COUNT_LARGE);

			// Total chunks in dataset must be at least as many as requested
			expect(state.allChunks.length).toBeGreaterThanOrEqual(SAMPLE_VIGNETTE_COUNT_LARGE);

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
		const result = await generateInitialVignettes('', SAMPLE_VIGNETTE_COUNT_MEDIUM);

		expect(isErr(result)).toBe(true);
		if (isErr(result)) {
			expect(result.error).toContain('empty');
		}
	});

	it('handles whitespace-only data with error', async () => {
		const result = await generateInitialVignettes('   \n\t  ', SAMPLE_VIGNETTE_COUNT_MEDIUM);

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
		const result = await generateInitialVignettes('Some data', -SAMPLE_VIGNETTE_COUNT_MEDIUM);

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
			.repeat(SAMPLE_DIVERSITY_TOPICS);

		const result = await generateInitialVignettes(data, SAMPLE_VIGNETTE_COUNT_LARGE);

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

	it('invokes progress callbacks with correct arguments', async () => {
		// Create data that will produce chunks exceeding MAX_BATCH_SIZE to test batching
		const data = 'Sample text entry. '.repeat(SAMPLE_TEXT_REPEAT_LARGE);

		const onChunkingComplete = vi.fn();
		const onEmbeddingProgress = vi.fn();

		const result = await generateInitialVignettes(data, SAMPLE_VIGNETTE_COUNT_LARGE, {
			onChunkingComplete,
			onEmbeddingProgress,
		});

		expect(isOk(result)).toBe(true);

		// Verify chunking callback was invoked
		expect(onChunkingComplete).toHaveBeenCalledOnce();
		const [chunkCount, dataSizeKB] = onChunkingComplete.mock.calls.at(0) ?? [];
		expect(typeof chunkCount).toBe('number');
		expect(chunkCount).toBeGreaterThan(0);
		expect(typeof dataSizeKB).toBe('string');
		expect(dataSizeKB).toMatch(/^\d+\.\d$/); // Format: "X.Y"

		// Verify embedding progress callback was invoked
		expect(onEmbeddingProgress).toHaveBeenCalled();

		// Verify all calls had ascending progress
		const calls = onEmbeddingProgress.mock.calls;
		for (let i = 0; i < calls.length; i++) {
			const [current, total] = calls.at(i) ?? [];
			expect(typeof current).toBe('number');
			expect(typeof total).toBe('number');
			expect(current).toBeGreaterThan(0);
			expect(current).toBeLessThanOrEqual(total);

			// Current should be non-decreasing
			if (i > 0) {
				const [prevCurrent] = calls.at(i - 1) ?? [];
				expect(current).toBeGreaterThanOrEqual(prevCurrent);
			}
		}

		// Final call should have current === total
		const [finalCurrent, finalTotal] = calls.at(-1) ?? [];
		expect(finalCurrent).toBe(finalTotal);
	});

	it('works without callbacks (backwards compatible)', async () => {
		const data = 'Sample text. '.repeat(SAMPLE_TEXT_REPEAT_MEDIUM);
		const result = await generateInitialVignettes(data, SAMPLE_VIGNETTE_COUNT_MEDIUM);

		expect(isOk(result)).toBe(true);
		if (isOk(result)) {
			expect(result.data.vignettes).toHaveLength(SAMPLE_VIGNETTE_COUNT_MEDIUM);
		}
	});

	it('continues execution when chunking callback throws error', async () => {
		const data = 'Sample text. '.repeat(SAMPLE_TEXT_REPEAT_MEDIUM);
		const onChunkingComplete = vi.fn(() => {
			throw new Error('Callback error');
		});
		const onEmbeddingProgress = vi.fn();

		// Should not throw, should log error and continue
		const result = await generateInitialVignettes(data, SAMPLE_VIGNETTE_COUNT_MEDIUM, {
			onChunkingComplete,
			onEmbeddingProgress,
		});

		expect(isOk(result)).toBe(true);
		expect(onChunkingComplete).toHaveBeenCalledOnce();
		// Embedding should still proceed after chunking callback error
		expect(onEmbeddingProgress).toHaveBeenCalled();
	});

	it('continues execution when embedding progress callback throws error', async () => {
		const data = 'Sample text. '.repeat(SAMPLE_TEXT_REPEAT_MEDIUM);
		const onEmbeddingProgress = vi.fn(() => {
			throw new Error('Callback error');
		});

		// Should not throw, should log error and continue
		const result = await generateInitialVignettes(data, SAMPLE_VIGNETTE_COUNT_MEDIUM, {
			onEmbeddingProgress,
		});

		expect(isOk(result)).toBe(true);
		expect(onEmbeddingProgress).toHaveBeenCalled();
		if (isOk(result)) {
			expect(result.data.vignettes).toHaveLength(SAMPLE_VIGNETTE_COUNT_MEDIUM);
		}
	});
});
