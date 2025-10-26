/**
 * Tests for diversity sampling utilities
 *
 * @vitest-environment node
 */

import {describe, expect, it} from 'vitest';

import {cosineSimilarity, diversitySample} from './diversity';
import {EMBEDDING_DIMENSION} from './embedder';


/**
 * Test constants
 */
const SIMILARITY_PRECISION = 10;

/**
 * Test data sizes
 */
const SMALL_SAMPLE_SIZE = 3;
const MEDIUM_SAMPLE_SIZE = 5;
const LARGE_SAMPLE_SIZE = 10;
const EXTRA_LARGE_SAMPLE_SIZE = 20;
const VERY_LARGE_SAMPLE_SIZE = 50;

/**
 * Test vector dimensions
 */
const TWO_DIMENSIONAL = 2;
const THREE_DIMENSIONAL = 3;

/**
 * Expected distance thresholds
 */
const MINIMUM_DIVERSITY_THRESHOLD = 0.5;
const MINIMUM_SPREAD_THRESHOLD = 0.3;

describe('cosineSimilarity', () => {
	it('should return 1.0 for identical vectors', () => {
		const vectorA = [1, 2, 3];
		const vectorB = [1, 2, 3];

		const similarity = cosineSimilarity(vectorA, vectorB);

		expect(similarity).toBeCloseTo(1.0, SIMILARITY_PRECISION);
	});

	it('should return 1.0 for parallel vectors with different magnitudes', () => {
		const vectorA = [1, 2, 3];
		const vectorB = [2, 4, 6]; // Same direction, twice the magnitude

		const similarity = cosineSimilarity(vectorA, vectorB);

		expect(similarity).toBeCloseTo(1.0, SIMILARITY_PRECISION);
	});

	it('should return 0.0 for orthogonal vectors', () => {
		const vectorA = [1, 0, 0];
		const vectorB = [0, 1, 0];

		const similarity = cosineSimilarity(vectorA, vectorB);

		expect(similarity).toBeCloseTo(0.0, SIMILARITY_PRECISION);
	});

	it('should return -1.0 for opposite vectors', () => {
		const vectorA = [1, 2, 3];
		const vectorB = [-1, -2, -3];

		const similarity = cosineSimilarity(vectorA, vectorB);

		expect(similarity).toBeCloseTo(-1.0, SIMILARITY_PRECISION);
	});

	it('should work with normalised vectors', () => {
		// Unit vectors in 2D
		const vectorA = [1 / Math.sqrt(2), 1 / Math.sqrt(2)]; // 45 degrees
		const vectorB = [1, 0]; // 0 degrees

		const similarity = cosineSimilarity(vectorA, vectorB);

		// cos(45°) = 1/√2 ≈ 0.707
		expect(similarity).toBeCloseTo(1 / Math.sqrt(2), SIMILARITY_PRECISION);
	});

	it('should return 0 for zero vector with non-zero vector', () => {
		const vectorA = [0, 0, 0];
		const vectorB = [1, 2, 3];

		const similarity = cosineSimilarity(vectorA, vectorB);

		expect(similarity).toBe(0);
	});

	it('should return 0 for two zero vectors', () => {
		const vectorA = [0, 0, 0];
		const vectorB = [0, 0, 0];

		const similarity = cosineSimilarity(vectorA, vectorB);

		expect(similarity).toBe(0);
	});

	it('should handle high-dimensional vectors', () => {
		// Vectors matching embedding dimension
		const vectorA = Array.from({length: EMBEDDING_DIMENSION}, (_, i) => Math.sin(i));
		const vectorB = Array.from({length: EMBEDDING_DIMENSION}, (_, i) => Math.cos(i));

		const similarity = cosineSimilarity(vectorA, vectorB);

		// Should be a valid similarity value
		expect(similarity).toBeGreaterThanOrEqual(-1);
		expect(similarity).toBeLessThanOrEqual(1);
	});

	it('should be commutative', () => {
		const vectorA = [1, 2, 3];
		const vectorB = [4, 5, 6];

		const similarityAB = cosineSimilarity(vectorA, vectorB);
		const similarityBA = cosineSimilarity(vectorB, vectorA);

		expect(similarityAB).toBeCloseTo(similarityBA, SIMILARITY_PRECISION);
	});

	it('should return 0 for vectors with different lengths', () => {
		const vectorA = [1, 2, 3];
		const vectorB = [1, 2]; // Shorter vector

		const similarity = cosineSimilarity(vectorA, vectorB);

		expect(similarity).toBe(0);
	});

	it('should return 0 for vectors with NaN values', () => {
		const vectorA = [1, NaN, 3];
		const vectorB = [1, 2, 3];

		const similarity = cosineSimilarity(vectorA, vectorB);

		expect(similarity).toBe(0);
	});

	it('should return 0 for vectors with Infinity values', () => {
		const vectorA = [1, Infinity, 3];
		const vectorB = [1, 2, 3];

		const similarity = cosineSimilarity(vectorA, vectorB);

		expect(similarity).toBe(0);
	});

	it('should handle very small magnitude vectors without numerical instability', () => {
		const smallValue = 1e-100;
		const vectorA = [smallValue, smallValue, smallValue];
		const vectorB = [smallValue, smallValue, smallValue];

		const similarity = cosineSimilarity(vectorA, vectorB);

		// Should either return 1.0 (if computable) or 0 (if below epsilon)
		expect(similarity === 1.0 || similarity === 0).toBe(true);
	});
});

describe('diversitySample', () => {
	describe('basic functionality', () => {
		it('should return correct number of indices', () => {
			const embeddings = [
				[1, 0, 0],
				[0, 1, 0],
				[0, 0, 1],
				[-1, 0, 0],
				[0, -1, 0],
			];

			const indices = diversitySample(embeddings, SMALL_SAMPLE_SIZE);

			expect(indices).toHaveLength(SMALL_SAMPLE_SIZE);
		});

		it('should return indices within valid range', () => {
			const embeddings = Array.from({length: EXTRA_LARGE_SAMPLE_SIZE}, (_, i) => [
				i,
				i * TWO_DIMENSIONAL,
				i * THREE_DIMENSIONAL,
			]);

			const indices = diversitySample(embeddings, MEDIUM_SAMPLE_SIZE);

			expect(indices).toHaveLength(MEDIUM_SAMPLE_SIZE);
			for (const index of indices) {
				expect(index).toBeGreaterThanOrEqual(0);
				expect(index).toBeLessThan(embeddings.length);
			}
		});

		it('should return unique indices (no duplicates)', () => {
			const embeddings = Array.from({length: LARGE_SAMPLE_SIZE}, (_, i) => [
				i,
				i * TWO_DIMENSIONAL,
			]);

			const indices = diversitySample(embeddings, MEDIUM_SAMPLE_SIZE);

			const uniqueIndices = new Set(indices);
			expect(uniqueIndices.size).toBe(indices.length);
		});
	});

	describe('diversity verification', () => {
		it('should select outliers when present', () => {
			const clusterSize = MEDIUM_SAMPLE_SIZE;

			// Create similar embeddings clustered together
			const similar = Array.from({length: clusterSize}, () => [1, 0, 0]);

			// Add outliers in completely different directions
			const outlier1 = [-1, 0, 0]; // Opposite direction
			const outlier2 = [0, 1, 0]; // Perpendicular

			const embeddings = [...similar, outlier1, outlier2];

			// Select samples - should strongly prefer the outliers
			const indices = diversitySample(embeddings, SMALL_SAMPLE_SIZE);

			// At least one outlier should be selected
			const outlierIndex1 = clusterSize;
			const outlierIndex2 = clusterSize + 1;
			const hasOutlier = indices.includes(outlierIndex1) || indices.includes(outlierIndex2);
			expect(hasOutlier).toBe(true);
		});

		it('should spread selections across diverse embeddings', () => {
			const selectedCount = 4;

			// Create embeddings at corners of a cube
			const embeddings = [
				[1, 1, 1],
				[1, 1, -1],
				[1, -1, 1],
				[1, -1, -1],
				[-1, 1, 1],
				[-1, 1, -1],
				[-1, -1, 1],
				[-1, -1, -1],
			];

			const indices = diversitySample(embeddings, selectedCount);

			// Calculate average pairwise distance
			let totalDistance = 0;
			let pairCount = 0;

			for (let i = 0; i < indices.length; i++) {
				for (let j = i + 1; j < indices.length; j++) {
					const idxA = indices.at(i);
					const idxB = indices.at(j);

					if (idxA !== undefined && idxB !== undefined) {
						const embeddingA = embeddings.at(idxA);
						const embeddingB = embeddings.at(idxB);

						if (embeddingA && embeddingB) {
							const similarity = cosineSimilarity(embeddingA, embeddingB);
							const distance = 1 - similarity;
							totalDistance += distance;
							pairCount++;
						}
					}
				}
			}

			const averageDistance = totalDistance / pairCount;

			// Selected embeddings should be reasonably far apart
			// For cube corners, expect significant distance
			expect(averageDistance).toBeGreaterThan(MINIMUM_DIVERSITY_THRESHOLD);
		});

		it('should maximise minimum pairwise distances', () => {
			const circlePointCount = LARGE_SAMPLE_SIZE;
			const selectedCount = SMALL_SAMPLE_SIZE;

			// Create embeddings arranged in a circle (all different directions)
			// This avoids the issue of collinear vectors having zero cosine distance
			const embeddings = Array.from({length: circlePointCount}, (_, i) => {
				const angle = (TWO_DIMENSIONAL * Math.PI * i) / circlePointCount;
				return [Math.cos(angle), Math.sin(angle)];
			});

			const indices = diversitySample(embeddings, selectedCount);

			// Calculate minimum pairwise distance among selected points
			let minDistance = Infinity;

			for (let i = 0; i < indices.length; i++) {
				for (let j = i + 1; j < indices.length; j++) {
					const idxA = indices.at(i);
					const idxB = indices.at(j);

					if (idxA !== undefined && idxB !== undefined) {
						const embeddingA = embeddings.at(idxA);
						const embeddingB = embeddings.at(idxB);

						if (embeddingA && embeddingB) {
							const similarity = cosineSimilarity(embeddingA, embeddingB);
							const distance = 1 - similarity;
							minDistance = Math.min(minDistance, distance);
						}
					}
				}
			}

			// Minimum distance should be reasonably large (points are spread out)
			// For circle with 3 selected points from 10, expect decent spread
			expect(minDistance).toBeGreaterThan(MINIMUM_SPREAD_THRESHOLD);
		});
	});

	describe('edge cases', () => {
		it('should return empty array for empty embeddings', () => {
			const embeddings: number[][] = [];

			const indices = diversitySample(embeddings, MEDIUM_SAMPLE_SIZE);

			expect(indices).toEqual([]);
		});

		it('should return empty array for count = 0', () => {
			const embeddings = [
				[1, 0, 0],
				[0, 1, 0],
			];
			const zeroCount = 0;

			const indices = diversitySample(embeddings, zeroCount);

			expect(indices).toEqual([]);
		});

		it('should return empty array for negative count', () => {
			const embeddings = [
				[1, 0, 0],
				[0, 1, 0],
				[0, 0, 1],
			];
			const negativeCount = -5;

			const indices = diversitySample(embeddings, negativeCount);

			expect(indices).toEqual([]);
		});

		it('should floor non-integer count values', () => {
			const embeddings = [
				[1, 0, 0],
				[0, 1, 0],
				[0, 0, 1],
				[-1, 0, 0],
				[0, -1, 0],
			];
			const nonIntegerCount = 2.7;
			const expectedCount = 2; // Should floor to 2

			const indices = diversitySample(embeddings, nonIntegerCount);

			expect(indices).toHaveLength(expectedCount);
		});

		it('should return single index for count = 1', () => {
			const embeddings = [
				[1, 0, 0],
				[0, 1, 0],
				[0, 0, 1],
			];
			const singleCount = 1;

			const indices = diversitySample(embeddings, singleCount);

			expect(indices).toHaveLength(singleCount);
			expect(indices.at(0)).toBeGreaterThanOrEqual(0);
			expect(indices.at(0)).toBeLessThan(embeddings.length);
		});

		it('should return all indices when count > length', () => {
			const embeddings = [
				[1, 0],
				[0, 1],
				[-1, 0],
			];
			const threeIndices = 3;

			const indices = diversitySample(embeddings, LARGE_SAMPLE_SIZE);

			expect(indices).toHaveLength(threeIndices);

			// Should contain all possible indices
			const sorted = [...indices].sort((a, b) => a - b);
			expect(sorted).toEqual([0, 1, 2]);
		});

		it('should return all indices when count equals length', () => {
			const embeddings = [
				[1, 0],
				[0, 1],
				[-1, 0],
				[0, -1],
			];
			const fourIndices = 4;

			const indices = diversitySample(embeddings, fourIndices);

			expect(indices).toHaveLength(fourIndices);

			// Should contain all indices
			const sorted = [...indices].sort((a, b) => a - b);
			expect(sorted).toEqual([0, 1, 2, 3]);
		});

		it('should handle identical embeddings without crashing', () => {
			// All embeddings are the same
			const embeddings = Array.from({length: LARGE_SAMPLE_SIZE}, () => [1, 0, 0]);

			const indices = diversitySample(embeddings, SMALL_SAMPLE_SIZE);

			// Should still select indices (even though diversity is zero)
			expect(indices).toHaveLength(SMALL_SAMPLE_SIZE);
			for (const index of indices) {
				expect(index).toBeGreaterThanOrEqual(0);
				expect(index).toBeLessThan(embeddings.length);
			}
		});

		it('should handle embeddings with zero vectors', () => {
			const embeddings = [
				[0, 0, 0], // Zero vector
				[1, 0, 0],
				[0, 1, 0],
			];
			const twoIndices = TWO_DIMENSIONAL;

			const indices = diversitySample(embeddings, twoIndices);

			expect(indices).toHaveLength(twoIndices);
			// Should not crash despite zero vector
		});

		it('should handle single embedding', () => {
			const embeddings = [[1, 2, 3]];
			const singleCount = 1;
			const expectedIndex = 0;

			const indices = diversitySample(embeddings, singleCount);

			expect(indices).toEqual([expectedIndex]);
		});

		it('should handle high-dimensional embeddings', () => {
			// Simulate high-dimensional embeddings matching model output
			const embeddings = Array.from({length: EXTRA_LARGE_SAMPLE_SIZE}, (_, i) =>
				Array.from({length: EMBEDDING_DIMENSION}, (_, j) => Math.sin(i + j))
			);

			const indices = diversitySample(embeddings, MEDIUM_SAMPLE_SIZE);

			expect(indices).toHaveLength(MEDIUM_SAMPLE_SIZE);
			// All indices should be valid
			for (const index of indices) {
				expect(index).toBeGreaterThanOrEqual(0);
				expect(index).toBeLessThan(embeddings.length);
			}
		});
	});

	describe('algorithm properties', () => {
		it('should be stable for multiple runs with same initial selection', () => {
			const embeddings = [
				[1, 0, 0],
				[0, 1, 0],
				[0, 0, 1],
				[-1, 0, 0],
			];
			const twoIndices = TWO_DIMENSIONAL;
			const runCount = MEDIUM_SAMPLE_SIZE;

			// Run multiple times - while random start varies, algorithm is deterministic after that
			const runs = Array.from({length: runCount}, () =>
				diversitySample(embeddings, twoIndices)
			);

			// All runs should return valid results
			for (const indices of runs) {
				expect(indices).toHaveLength(twoIndices);
				expect(indices.at(0)).toBeGreaterThanOrEqual(0);
				expect(indices.at(1)).toBeGreaterThanOrEqual(0);
			}
		});

		it('should select first point randomly', () => {
			const embeddings = Array.from({length: LARGE_SAMPLE_SIZE}, (_, i) => [i, 0]);
			const minimumUniquenessCount = SMALL_SAMPLE_SIZE;

			// Run multiple times and collect first indices
			const firstIndices = Array.from({length: VERY_LARGE_SAMPLE_SIZE}, () => {
				const result = diversitySample(embeddings, SMALL_SAMPLE_SIZE);
				return result.at(0);
			});

			// Should see variety in first selections (not always the same)
			const uniqueFirst = new Set(firstIndices);

			// With many runs, should see several different starting points
			expect(uniqueFirst.size).toBeGreaterThan(minimumUniquenessCount - 1);
		});
	});
});
