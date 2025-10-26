/**
 * Diversity sampling utilities for selecting representative embeddings
 *
 * Implements farthest-first greedy traversal to select diverse samples from
 * embedding space, maximising coverage whilst minimising redundancy.
 */

/**
 * Small value for floating point comparison
 */
const EPSILON = 1e-10;

/**
 * Computes cosine similarity between two vectors
 *
 * Cosine similarity measures the cosine of the angle between two vectors,
 * returning a value in [-1, 1] where:
 * - 1.0 indicates identical direction (parallel)
 * - 0.0 indicates orthogonal (perpendicular)
 * - -1.0 indicates opposite direction (anti-parallel)
 *
 * @param a - First vector
 * @param b - Second vector
 * @returns Cosine similarity in [-1, 1], or 0 if vectors have different lengths,
 *          zero magnitude, or contain invalid values (NaN/Infinity)
 *
 * @example
 * ```typescript
 * const similarity = cosineSimilarity([1, 0, 0], [1, 0, 0]);
 * console.log(similarity); // 1.0 (identical)
 *
 * const orthogonal = cosineSimilarity([1, 0], [0, 1]);
 * console.log(orthogonal); // 0.0 (perpendicular)
 * ```
 */
export const cosineSimilarity = (a: number[], b: number[]): number => {
	// Validate vectors have same length
	if (a.length !== b.length) {
		return 0;
	}

	// Compute dot product
	let dotProduct = 0;
	for (let i = 0; i < a.length; i++) {
		dotProduct += (a.at(i) ?? 0) * (b.at(i) ?? 0);
	}

	// Compute magnitudes
	let magnitudeA = 0;
	let magnitudeB = 0;
	for (let i = 0; i < a.length; i++) {
		const valA = a.at(i) ?? 0;
		const valB = b.at(i) ?? 0;
		magnitudeA += valA * valA;
		magnitudeB += valB * valB;
	}

	magnitudeA = Math.sqrt(magnitudeA);
	magnitudeB = Math.sqrt(magnitudeB);

	// Handle zero-magnitude vectors or invalid values
	if (
		magnitudeA < EPSILON ||
		magnitudeB < EPSILON ||
		!isFinite(magnitudeA) ||
		!isFinite(magnitudeB)
	) {
		return 0;
	}

	const similarity = dotProduct / (magnitudeA * magnitudeB);

	// Validate result is finite
	if (!isFinite(similarity)) {
		return 0;
	}

	return similarity;
};

/**
 * Computes cosine distance between two vectors
 *
 * Cosine distance is defined as 1 - cosine similarity, providing a distance
 * metric in [0, 2] where smaller values indicate more similar vectors.
 *
 * @param a - First vector
 * @param b - Second vector
 * @returns Cosine distance in [0, 2]
 */
const cosineDistance = (a: number[], b: number[]): number =>
	1 - cosineSimilarity(a, b);

/**
 * Selects diverse embeddings using farthest-first greedy traversal
 *
 * Algorithm:
 * 1. Start with random embedding as first selection
 * 2. For each remaining selection:
 *    - For each unselected embedding, compute minimum distance to any selected
 *    - Select the embedding with maximum minimum-distance (farthest from all)
 * 3. Return indices of selected embeddings
 *
 * This greedy approach provides good diversity in practice whilst remaining
 * computationally efficient. Not optimal, but sufficient for sampling.
 *
 * @param embeddings - Array of embedding vectors
 * @param count - Number of diverse samples to select (non-integer values are floored)
 * @returns Array of indices into embeddings array, representing most diverse samples.
 *          Returns indices in selection order (first index is the random starting point).
 *
 * @example
 * ```typescript
 * // Select 10 most diverse embeddings from 100
 * const embeddings = await embedBatch(chunks);
 * const selectedIndices = diversitySample(embeddings, 10);
 * const diverseChunks = selectedIndices.map((i) => chunks[i]);
 * ```
 *
 * @example
 * ```typescript
 * // Edge case: count exceeds array length
 * const embeddings = [[1, 0], [0, 1], [-1, 0]];
 * const indices = diversitySample(embeddings, 10);
 * console.log(indices); // [0, 1, 2] - returns all available indices
 * ```
 */
export const diversitySample = (
	embeddings: number[][],
	count: number
): number[] => {
	// Handle edge cases
	if (embeddings.length === 0 || count <= 0) {
		return [];
	}

	// Handle non-integer counts
	count = Math.floor(count);

	if (count >= embeddings.length) {
		// Return all indices
		return Array.from({length: embeddings.length}, (_, i) => i);
	}

	if (count === 1) {
		// Return random index
		return [Math.floor(Math.random() * embeddings.length)];
	}

	// Initialise with random starting point
	const selected: number[] = [Math.floor(Math.random() * embeddings.length)];
	const unselected = new Set<number>(
		Array.from({length: embeddings.length}, (_, i) => i)
	);
	unselected.delete(selected.at(0) ?? 0);

	// Greedily select farthest points
	for (let iteration = 1; iteration < count; iteration++) {
		let maxMinDistance = -Infinity;
		let farthestIndex = -1;

		// For each unselected point, find its minimum distance to selected points
		for (const candidateIndex of unselected) {
			const candidateEmbedding = embeddings.at(candidateIndex);
			if (!candidateEmbedding) {
				continue;
			}

			// Find minimum distance to any selected point
			let minDistance = Infinity;
			for (const selectedIndex of selected) {
				const selectedEmbedding = embeddings.at(selectedIndex);
				if (!selectedEmbedding) {
					continue;
				}

				const distance = cosineDistance(candidateEmbedding, selectedEmbedding);
				minDistance = Math.min(minDistance, distance);
			}

			// Track the candidate with maximum minimum-distance
			if (minDistance > maxMinDistance) {
				maxMinDistance = minDistance;
				farthestIndex = candidateIndex;
			}
		}

		// Add farthest point to selected set
		if (farthestIndex !== -1) {
			selected.push(farthestIndex);
			unselected.delete(farthestIndex);
		}
	}

	return selected;
};
