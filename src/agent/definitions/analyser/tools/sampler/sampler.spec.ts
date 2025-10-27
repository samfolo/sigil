/**
 * Tests for sampler orchestrator
 *
 * @vitest-environment node
 */

import {afterEach, describe, expect, it} from 'vitest';

import {isErr, isOk} from '@sigil/src/common/errors/result';

import {cleanupEmbedder, EMBEDDING_DIMENSION} from './embedder';
import {generateInitialVignettes, requestMoreSamples} from './sampler';

describe('sampler', () => {
	afterEach(() => {
		// Clean up embedder singleton after each test
		cleanupEmbedder();
	});

	describe('generateInitialVignettes', () => {
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

	describe('requestMoreSamples', () => {
		it('returns additional diverse samples', async () => {
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

		it('updates providedIndices correctly', async () => {
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

		it('hasMore flag is correct', async () => {
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

		it('no duplicate vignettes across calls', async () => {
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

		it('handles exhaustion correctly', async () => {
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

		it('state immutability - original unchanged', async () => {
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

		it('returns empty when no more samples available', async () => {
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

		it('handles zero count with error', async () => {
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

		it('vignettes have valid embeddings', async () => {
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

		it('positions point to correct content in rawData', async () => {
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

	describe('integration', () => {
		it('handles multiple requestMoreSamples calls', async () => {
			const data = 'Segment. '.repeat(100);
			const initial = await generateInitialVignettes(data, 10);

			expect(isOk(initial)).toBe(true);
			if (isOk(initial)) {
				let state = initial.data.state;
				const allVignettes = [...initial.data.vignettes];

				// Request more samples 3 times
				for (let i = 0; i < 3; i++) {
					const more = requestMoreSamples(state, 5);

					expect(isOk(more)).toBe(true);
					if (isOk(more)) {
						allVignettes.push(...more.data.vignettes);
						state = more.data.newState;
					}
				}

				// Verify no duplicate positions
				const positions = new Set(
					allVignettes.map((v) => `${v.position.start}-${v.position.end}`)
				);
				expect(positions.size).toBe(allVignettes.length);
			}
		});

		it('handles large dataset efficiently', async () => {
			const data = 'Large dataset entry. '.repeat(500); // ~10000 chars
			const initial = await generateInitialVignettes(data, 20);

			expect(isOk(initial)).toBe(true);
			if (isOk(initial)) {
				expect(initial.data.vignettes).toHaveLength(20);
				expect(initial.data.state.allChunks.length).toBeGreaterThan(20);

				const more = requestMoreSamples(initial.data.state, 20);

				expect(isOk(more)).toBe(true);
				if (isOk(more)) {
					expect(more.data.vignettes.length).toBeGreaterThan(0);
				}
			}
		});
	});
});
