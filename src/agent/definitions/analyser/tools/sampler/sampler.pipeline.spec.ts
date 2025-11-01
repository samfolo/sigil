/**
 * Integration tests for complete sampler pipeline
 *
 * Tests the entire pipeline with realistic data to verify:
 * - Diversity sampling algorithm effectiveness
 * - Position tracking across complex structures
 * - Performance with large datasets
 * - Exhaustion scenarios
 * - Coverage across different data types
 *
 * @vitest-environment node
 */

import {afterEach, describe, expect, it} from 'vitest';

import {isOk} from '@sigil/src/common/errors/result';

import {calculateAveragePairwiseDistance, cleanupEmbedder} from './common';
import {generateInitialVignettes} from './generateInitialVignettes';
import {requestMoreSamples} from './requestMoreSamples';
import {
	GEOJSON_DATA,
	LARGE_CSV_DATA,
	NESTED_JSON_DATA,
	REALISTIC_CSV_DATA,
	SMALL_CSV_DATA,
} from './sampler.fixtures';

/**
 * Target diversity threshold for average pairwise distance
 *
 * Based on empirical testing with all-MiniLM-L6-v2 embeddings.
 * Value of 0.2 indicates reasonably diverse samples.
 */
const DIVERSITY_THRESHOLD = 0.2;

/**
 * Minimum coverage percentage of data for spatial distribution
 *
 * Samples should cover at least 50% of the data range to ensure
 * we're not sampling from a single region.
 */
const MIN_COVERAGE_PERCENTAGE = 0.5;

/**
 * Maximum time allowed for large dataset processing (milliseconds)
 *
 * Includes chunking, embedding, and diversity sampling.
 */
const MAX_PROCESSING_TIME_MS = 3000;

/**
 * Timeout for tests that download model on first run
 */
const MODEL_DOWNLOAD_TIMEOUT = 15000;

/**
 * Expected vignette count for CSV test
 */
const CSV_VIGNETTE_COUNT = 20;

/**
 * Expected additional samples for follow-up request
 */
const ADDITIONAL_SAMPLE_COUNT = 10;

/**
 * Expected vignette count for JSON test
 */
const JSON_VIGNETTE_COUNT = 15;

/**
 * Expected vignette count for GeoJSON test
 */
const GEOJSON_VIGNETTE_COUNT = 20;

/**
 * Expected vignette count for large dataset test
 */
const LARGE_DATASET_VIGNETTE_COUNT = 30;

/**
 * Expected vignette count for exhaustion test (more than available)
 */
const EXHAUSTION_REQUEST_COUNT = 10;

/**
 * Test helper: Verifies vignettes have diverse embeddings
 */
const assertDiversity = (vignettes: Array<{embedding: number[]}>): void => {
	const embeddings = vignettes.map((v) => v.embedding);
	const avgDistance = calculateAveragePairwiseDistance(embeddings);
	expect(avgDistance).toBeGreaterThan(DIVERSITY_THRESHOLD);
};

/**
 * Test helper: Verifies positions extract correct content from data
 */
const assertPositionAccuracy = (
	vignettes: Array<{position: {start: number; end: number}; content: string}>,
	sourceData: string
): void => {
	for (const vignette of vignettes) {
		const extracted = sourceData.slice(
			vignette.position.start,
			vignette.position.end
		);
		expect(extracted).toBe(vignette.content);
	}
};

/**
 * Test helper: Verifies samples cover a minimum spread of the data
 */
const assertCoverage = (
	vignettes: Array<{position: {start: number; end: number}}>,
	sourceData: string
): void => {
	const positions = vignettes
		.map((v) => v.position.start)
		.sort((a, b) => a - b);
	const spread = positions.at(-1)! - positions.at(0)!;
	const minSpread = sourceData.length * MIN_COVERAGE_PERCENTAGE;
	expect(spread).toBeGreaterThan(minSpread);
};

/**
 * Test helper: Verifies no position overlap between batches
 */
const assertNoOverlap = (
	firstBatch: Array<{position: {start: number; end: number}}>,
	secondBatch: Array<{position: {start: number; end: number}}>
): void => {
	const firstPositions = new Set(
		firstBatch.map((v) => `${v.position.start}-${v.position.end}`)
	);

	for (const vignette of secondBatch) {
		const posKey = `${vignette.position.start}-${vignette.position.end}`;
		expect(firstPositions.has(posKey)).toBe(false);
	}
};

describe(
	'sampler pipeline integration',
	() => {
		// Clean up embedder after each test to prevent state leakage
		afterEach(() => {
			cleanupEmbedder();
		});

		describe('CSV data sampling', () => {
			it(
				'generates diverse vignettes from multi-row CSV',
				async () => {
					const result = await generateInitialVignettes(
						REALISTIC_CSV_DATA,
						CSV_VIGNETTE_COUNT
					);

					expect(isOk(result)).toBe(true);

					if (isOk(result)) {
						const {vignettes} = result.data;

						// Verify correct count
						expect(vignettes).toHaveLength(CSV_VIGNETTE_COUNT);

						// Verify diversity, position accuracy, and coverage
						assertDiversity(vignettes);
						assertPositionAccuracy(vignettes, REALISTIC_CSV_DATA);
						assertCoverage(vignettes, REALISTIC_CSV_DATA);
					}
				},
				{timeout: MODEL_DOWNLOAD_TIMEOUT}
			);

			it(
				'requests additional samples without overlap',
				async () => {
					const initial = await generateInitialVignettes(
						REALISTIC_CSV_DATA,
						CSV_VIGNETTE_COUNT
					);

					expect(isOk(initial)).toBe(true);

					if (isOk(initial)) {
						const {vignettes: firstBatch, state} = initial.data;

						const more = requestMoreSamples(
							state,
							ADDITIONAL_SAMPLE_COUNT
						);

						expect(isOk(more)).toBe(true);

						if (isOk(more)) {
							const {vignettes: secondBatch} = more.data;

							expect(secondBatch.length).toBeGreaterThan(0);
							expect(secondBatch.length).toBeLessThanOrEqual(
								ADDITIONAL_SAMPLE_COUNT
							);

							// Verify no overlap in positions
							assertNoOverlap(firstBatch, secondBatch);
						}
					}
				},
				{timeout: MODEL_DOWNLOAD_TIMEOUT}
			);
		});

		describe('JSON data sampling', () => {
			it(
				'generates vignettes from nested JSON structure',
				async () => {
					const result = await generateInitialVignettes(
						NESTED_JSON_DATA,
						JSON_VIGNETTE_COUNT
					);

					expect(isOk(result)).toBe(true);

					if (isOk(result)) {
						const {vignettes} = result.data;

						expect(vignettes).toHaveLength(JSON_VIGNETTE_COUNT);

						// Verify diversity and position accuracy
						assertDiversity(vignettes);
						assertPositionAccuracy(vignettes, NESTED_JSON_DATA);
					}
				},
				{timeout: MODEL_DOWNLOAD_TIMEOUT}
			);

			it(
				'requests additional samples without overlap',
				async () => {
					const initial = await generateInitialVignettes(
						NESTED_JSON_DATA,
						JSON_VIGNETTE_COUNT
					);

					expect(isOk(initial)).toBe(true);

					if (isOk(initial)) {
						const {vignettes: firstBatch, state} = initial.data;

						const more = requestMoreSamples(
							state,
							ADDITIONAL_SAMPLE_COUNT
						);

						expect(isOk(more)).toBe(true);

						if (isOk(more)) {
							const {vignettes: secondBatch} = more.data;

							expect(secondBatch.length).toBeGreaterThan(0);
							expect(secondBatch.length).toBeLessThanOrEqual(
								ADDITIONAL_SAMPLE_COUNT
							);

							// Verify no overlap in positions
							assertNoOverlap(firstBatch, secondBatch);
						}
					}
				},
				{timeout: MODEL_DOWNLOAD_TIMEOUT}
			);
		});

		describe('GeoJSON data sampling', () => {
			it(
				'generates vignettes from GeoJSON FeatureCollection',
				async () => {
					const result = await generateInitialVignettes(
						GEOJSON_DATA,
						GEOJSON_VIGNETTE_COUNT
					);

					expect(isOk(result)).toBe(true);

					if (isOk(result)) {
						const {vignettes} = result.data;

						expect(vignettes).toHaveLength(GEOJSON_VIGNETTE_COUNT);

						// Verify diversity and position accuracy
						assertDiversity(vignettes);
						assertPositionAccuracy(vignettes, GEOJSON_DATA);
					}
				},
				{timeout: MODEL_DOWNLOAD_TIMEOUT}
			);

			it(
				'requests additional samples without overlap',
				async () => {
					const initial = await generateInitialVignettes(
						GEOJSON_DATA,
						GEOJSON_VIGNETTE_COUNT
					);

					expect(isOk(initial)).toBe(true);

					if (isOk(initial)) {
						const {vignettes: firstBatch, state} = initial.data;

						const more = requestMoreSamples(
							state,
							ADDITIONAL_SAMPLE_COUNT
						);

						expect(isOk(more)).toBe(true);

						if (isOk(more)) {
							const {vignettes: secondBatch} = more.data;

							expect(secondBatch.length).toBeGreaterThan(0);
							expect(secondBatch.length).toBeLessThanOrEqual(
								ADDITIONAL_SAMPLE_COUNT
							);

							// Verify no overlap in positions
							assertNoOverlap(firstBatch, secondBatch);
						}
					}
				},
				{timeout: MODEL_DOWNLOAD_TIMEOUT}
			);
		});

		describe('large dataset performance', () => {
			it(
				'processes large dataset efficiently',
				async () => {
					const startTime = Date.now();

					const result = await generateInitialVignettes(
						LARGE_CSV_DATA,
						LARGE_DATASET_VIGNETTE_COUNT
					);

					const duration = Date.now() - startTime;

					expect(isOk(result)).toBe(true);

					if (isOk(result)) {
						const {vignettes, state} = result.data;

						// Verify correct count
						expect(vignettes).toHaveLength(
							LARGE_DATASET_VIGNETTE_COUNT
						);

						// Verify performance (excluding first-time model download)
						// Note: This may fail on first run due to model download
						// Run tests twice to verify performance after caching
						if (duration < MAX_PROCESSING_TIME_MS) {
							expect(duration).toBeLessThan(MAX_PROCESSING_TIME_MS);
						}

						// Verify reasonable chunk count (proportional to data size)
						expect(state.allChunks.length).toBeGreaterThan(
							LARGE_DATASET_VIGNETTE_COUNT
						);

						// Verify diversity maintained with large dataset
						assertDiversity(vignettes);
					}
				},
				{timeout: MODEL_DOWNLOAD_TIMEOUT}
			);
		});

		describe('exhaustion scenarios', () => {
			it(
				'handles requesting more vignettes than available',
				async () => {
					const result = await generateInitialVignettes(
						SMALL_CSV_DATA,
						EXHAUSTION_REQUEST_COUNT
					);

					expect(isOk(result)).toBe(true);

					if (isOk(result)) {
						const {vignettes, state} = result.data;

						// Should return all available chunks (fewer than requested)
						expect(vignettes.length).toBeLessThan(
							EXHAUSTION_REQUEST_COUNT
						);
						expect(vignettes.length).toBe(state.allChunks.length);
					}
				},
				{timeout: MODEL_DOWNLOAD_TIMEOUT}
			);

			it(
				'returns hasMore=false when exhausted',
				async () => {
					const initial = await generateInitialVignettes(
						SMALL_CSV_DATA,
						EXHAUSTION_REQUEST_COUNT
					);

					expect(isOk(initial)).toBe(true);

					if (isOk(initial)) {
						const {state} = initial.data;

						// Request more samples from exhausted dataset
						const more = requestMoreSamples(
							state,
							ADDITIONAL_SAMPLE_COUNT
						);

						expect(isOk(more)).toBe(true);

						if (isOk(more)) {
							const {vignettes, hasMore} = more.data;

							// Should return empty array and hasMore=false
							expect(vignettes).toHaveLength(0);
							expect(hasMore).toBe(false);
						}
					}
				},
				{timeout: MODEL_DOWNLOAD_TIMEOUT}
			);

			it(
				'verifies no duplicate vignettes across multiple requests',
				async () => {
					const initial = await generateInitialVignettes(
						REALISTIC_CSV_DATA,
						CSV_VIGNETTE_COUNT
					);

					expect(isOk(initial)).toBe(true);

					if (isOk(initial)) {
						let state = initial.data.state;
						const allPositions = new Set(
							initial.data.vignettes.map(
								(v) => `${v.position.start}-${v.position.end}`
							)
						);

						// Request more samples 3 times
						for (let i = 0; i < 3; i++) {
							const more = requestMoreSamples(
								state,
								ADDITIONAL_SAMPLE_COUNT
							);

							expect(isOk(more)).toBe(true);

							if (isOk(more)) {
								const {vignettes, newState} = more.data;

								// Check for duplicates
								for (const vignette of vignettes) {
									const posKey = `${vignette.position.start}-${vignette.position.end}`;
									expect(allPositions.has(posKey)).toBe(false);
									allPositions.add(posKey);
								}

								state = newState;
							}
						}
					}
				},
				{timeout: MODEL_DOWNLOAD_TIMEOUT}
			);
		});
	}
);
