/**
 * Tests for requestMoreSamples
 *
 * @vitest-environment node
 */

import {afterEach, describe, expect, it} from 'vitest';

import {isErr, isOk} from '@sigil/src/common/errors/result';

import {cleanupEmbedder, EMBEDDING_DIMENSION} from '../common';
import {generateInitialVignettes} from '../generateInitialVignettes';

import {requestMoreSamples} from './requestMoreSamples';

const REQUEST_MORE_SAMPLES_TIMEOUT = 10000; // 10 seconds

describe('requestMoreSamples', () => {
	afterEach(() => {
		// Clean up embedder singleton after each test
		cleanupEmbedder();
	});

	it('returns additional diverse samples', {timeout: REQUEST_MORE_SAMPLES_TIMEOUT}, async () => {
		const data = 'Text segment entry. '.repeat(500); // Enough for multiple batches
		const initial = await generateInitialVignettes(data, 10);

		expect(isOk(initial)).toBe(true);
		if (isOk(initial)) {
			const {state} = initial.data;
			const more = requestMoreSamples(state, 10);

			expect(isOk(more)).toBe(true);
			if (isOk(more)) {
				expect(more.data.vignettes.length).toBeGreaterThan(0);
				expect(more.data.vignettes.length).toBeLessThanOrEqual(10);
			}
		}
	});

	it('updates providedIndices correctly', {timeout: REQUEST_MORE_SAMPLES_TIMEOUT}, async () => {
		const data = 'Sample. '.repeat(100);
		const initial = await generateInitialVignettes(data, 5);

		expect(isOk(initial)).toBe(true);
		if (isOk(initial)) {
			const {state} = initial.data;
			const originalSize = state.providedIndices.size;

			const more = requestMoreSamples(state, 5);

			expect(isOk(more)).toBe(true);
			if (isOk(more)) {
				const {newState, vignettes} = more.data;

				expect(newState.providedIndices.size).toBe(
					originalSize + vignettes.length
				);
			}
		}
	});

	it('hasMore flag is correct', {timeout: REQUEST_MORE_SAMPLES_TIMEOUT}, async () => {
		const data = 'Text. '.repeat(20); // Small dataset
		const initial = await generateInitialVignettes(data, 5);

		expect(isOk(initial)).toBe(true);
		if (isOk(initial)) {
			let state = initial.data.state;

			// Request samples until exhausted
			let iterations = 0;
			const maxIterations = 20;

			while (iterations < maxIterations) {
				const more = requestMoreSamples(state, 5);

				expect(isOk(more)).toBe(true);
				if (isOk(more)) {
					const {newState, hasMore, vignettes} = more.data;

					if (vignettes.length === 0) {
						expect(hasMore).toBe(false);
						break;
					}

					if (!hasMore) {
						// If hasMore is false, this should be the last batch
						expect(newState.providedIndices.size).toBe(
							newState.allChunks.length
						);
						break;
					}

					state = newState;
				}

				iterations++;
			}

			expect(iterations).toBeLessThan(maxIterations);
		}
	});

	it('no duplicate vignettes across calls', {timeout: REQUEST_MORE_SAMPLES_TIMEOUT}, async () => {
		const data = '0123456789'.repeat(100);
		const initial = await generateInitialVignettes(data, 10);

		expect(isOk(initial)).toBe(true);
		if (isOk(initial)) {
			const {vignettes: first, state} = initial.data;
			const more = requestMoreSamples(state, 10);

			expect(isOk(more)).toBe(true);
			if (isOk(more)) {
				const {vignettes: second} = more.data;

				// Check no position overlap
				const firstPositions = new Set(
					first.map((v) => `${v.position.start}-${v.position.end}`)
				);
				const secondPositions = new Set(
					second.map((v) => `${v.position.start}-${v.position.end}`)
				);

				for (const pos of secondPositions) {
					expect(firstPositions.has(pos)).toBe(false);
				}
			}
		}
	});

	it('handles exhaustion correctly', {timeout: REQUEST_MORE_SAMPLES_TIMEOUT}, async () => {
		const data = 'Short.'; // Very small dataset
		const initial = await generateInitialVignettes(data, 1);

		expect(isOk(initial)).toBe(true);
		if (isOk(initial)) {
			const {state} = initial.data;
			const more = requestMoreSamples(state, 10);

			expect(isOk(more)).toBe(true);
			if (isOk(more)) {
				expect(more.data.vignettes).toHaveLength(0);
				expect(more.data.hasMore).toBe(false);
			}
		}
	});

	it('state immutability - original unchanged', {timeout: REQUEST_MORE_SAMPLES_TIMEOUT}, async () => {
		const data = 'Text entry item. '.repeat(300); // Enough for multiple batches
		const initial = await generateInitialVignettes(data, 5);

		expect(isOk(initial)).toBe(true);
		if (isOk(initial)) {
			const {state} = initial.data;
			const originalSize = state.providedIndices.size;

			const more = requestMoreSamples(state, 5);

			expect(isOk(more)).toBe(true);
			if (isOk(more)) {
				// Must have returned samples given the large dataset
				expect(more.data.vignettes.length).toBeGreaterThan(0);

				// Original state should be unchanged
				expect(state.providedIndices.size).toBe(originalSize);

				// New state should be different
				expect(more.data.newState.providedIndices.size).toBeGreaterThan(
					originalSize
				);
			}
		}
	});

	it('returns empty when no more samples available', {timeout: REQUEST_MORE_SAMPLES_TIMEOUT}, async () => {
		const data = 'A B C ';
		const initial = await generateInitialVignettes(data, 100); // Request all

		expect(isOk(initial)).toBe(true);
		if (isOk(initial)) {
			const {state} = initial.data;
			const more = requestMoreSamples(state, 10);

			expect(isOk(more)).toBe(true);
			if (isOk(more)) {
				expect(more.data.vignettes).toHaveLength(0);
				expect(more.data.hasMore).toBe(false);
			}
		}
	});

	it('handles zero count with error', {timeout: REQUEST_MORE_SAMPLES_TIMEOUT}, async () => {
		const data = 'Text. '.repeat(50);
		const initial = await generateInitialVignettes(data, 5);

		expect(isOk(initial)).toBe(true);
		if (isOk(initial)) {
			const {state} = initial.data;
			const more = requestMoreSamples(state, 0);

			expect(isErr(more)).toBe(true);
			if (isErr(more)) {
				expect(more.error).toContain('greater than 0');
			}
		}
	});

	it('vignettes have valid embeddings', {timeout: REQUEST_MORE_SAMPLES_TIMEOUT}, async () => {
		const data = 'Sample. '.repeat(100);
		const initial = await generateInitialVignettes(data, 5);

		expect(isOk(initial)).toBe(true);
		if (isOk(initial)) {
			const {state} = initial.data;
			const more = requestMoreSamples(state, 5);

			expect(isOk(more)).toBe(true);
			if (isOk(more)) {
				for (const vignette of more.data.vignettes) {
					expect(vignette.embedding).toHaveLength(EMBEDDING_DIMENSION);
					expect(
						vignette.embedding.every((v) => typeof v === 'number')
					).toBe(true);
				}
			}
		}
	});

	it('positions point to correct content in rawData', {timeout: REQUEST_MORE_SAMPLES_TIMEOUT}, async () => {
		const data = 'XYZABC'.repeat(100);
		const initial = await generateInitialVignettes(data, 5);

		expect(isOk(initial)).toBe(true);
		if (isOk(initial)) {
			const {state} = initial.data;
			const more = requestMoreSamples(state, 5);

			expect(isOk(more)).toBe(true);
			if (isOk(more)) {
				for (const vignette of more.data.vignettes) {
					const extracted = data.slice(
						vignette.position.start,
						vignette.position.end
					);
					expect(extracted).toBe(vignette.content);
				}
			}
		}
	});
});
