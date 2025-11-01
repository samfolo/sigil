/**
 * Requests additional diverse samples from remaining chunks
 *
 * Uses the state from previous sampling operations to avoid duplicates.
 * Selects diverse samples from chunks not yet provided to the agent.
 */

import type {Result} from '@sigil/src/common/errors/result';
import {err, ok} from '@sigil/src/common/errors/result';

import {diversitySample} from '../common';
import type {SamplerState, Vignette} from '../common';

/**
 * Result from requesting more samples
 */
export interface MoreSamplesResult {
	/**
	 * Additional vignettes
	 */
	vignettes: Vignette[];

	/**
	 * Updated state with new providedIndices
	 */
	newState: SamplerState;

	/**
	 * Whether more samples are available
	 */
	hasMore: boolean;
}

/**
 * Requests additional diverse samples from remaining chunks
 *
 * Process:
 * 1. Find indices not yet provided (all indices - providedIndices)
 * 2. If no more available, return empty with hasMore=false
 * 3. Select diverse samples from remaining embeddings
 * 4. Build vignettes
 * 5. Return vignettes, updated state, and hasMore flag
 *
 * @param state - State from previous sampling operation
 * @param count - Number of additional diverse vignettes to generate
 * @returns Result containing vignettes, updated state, and hasMore flag, or error message
 *
 * @example
 * ```typescript
 * const result = requestMoreSamples(state, 10);
 * if (isOk(result)) {
 *   const {vignettes, newState, hasMore} = result.data;
 *   // Use vignettes for analysis
 *   // Replace old state with newState
 *   // Check hasMore to see if more samples are available
 * }
 * ```
 */
export const requestMoreSamples = (
	state: SamplerState,
	count: number
): Result<MoreSamplesResult, string> => {
	// Validate input
	if (count <= 0) {
		return err('Count must be greater than 0');
	}

	// Step 1: Find remaining indices
	const allIndices = Array.from(
		{length: state.allChunks.length},
		(_, i) => i
	);
	const remainingIndices = allIndices.filter(
		(i) => !state.providedIndices.has(i)
	);

	// Step 2: Check if any samples remain
	if (remainingIndices.length === 0) {
		return ok({
			vignettes: [],
			newState: state,
			hasMore: false,
		});
	}

	// Step 3: Select diverse samples from remaining
	const actualCount = Math.min(count, remainingIndices.length);

	// Get embeddings for remaining indices
	const remainingEmbeddings = remainingIndices
		.map((i) => state.allEmbeddings.at(i))
		.filter((e): e is number[] => e !== undefined);

	// Sample from remaining embeddings
	const selectedLocalIndices = diversitySample(remainingEmbeddings, actualCount);

	// Map back to global indices
	const selectedGlobalIndices = selectedLocalIndices.map(
		(localIndex) => remainingIndices.at(localIndex) ?? -1
	);

	// Step 4: Build vignettes
	const vignettes: Vignette[] = selectedGlobalIndices
		.filter((index) => index !== -1)
		.map((index) => {
			const chunk = state.allChunks.at(index);
			const embedding = state.allEmbeddings.at(index);

			if (!chunk || !embedding) {
				throw new Error(`Invalid index ${index} in state`);
			}

			return {
				content: chunk.content,
				position: {
					start: chunk.start,
					end: chunk.end,
				},
				embedding,
			};
		});

	// Step 5: Create new state with updated providedIndices
	const newProvidedIndices = new Set(state.providedIndices);
	for (const index of selectedGlobalIndices) {
		if (index !== -1) {
			newProvidedIndices.add(index);
		}
	}

	const newState: SamplerState = {
		...state,
		providedIndices: newProvidedIndices,
	};

	const hasMore = newProvidedIndices.size < state.allChunks.length;

	return ok({vignettes, newState, hasMore});
};
