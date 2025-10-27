/**
 * Main sampler orchestrator
 *
 * Generates diverse vignettes (text snippets with embeddings) from raw data.
 * Combines chunking, embedding, and diversity sampling to provide the Analyser Agent
 * with representative samples for data type identification.
 */

import type {Result} from '@sigil/src/common/errors/result';
import {err, isErr, ok} from '@sigil/src/common/errors/result';

import {chunkText} from './chunkText';
import {diversitySample} from './diversity';
import {embedBatch} from './embedder';
import type {
	InitialVignettesResult,
	MoreSamplesResult,
	SamplerState,
	Vignette,
} from './types';

/**
 * Default chunk size for text splitting (characters)
 */
const DEFAULT_CHUNK_SIZE = 200;

/**
 * Default overlap between chunks (characters)
 */
const DEFAULT_OVERLAP = 10;

/**
 * Generates initial diverse vignettes from raw data
 *
 * Process:
 * 1. Chunks the raw data into overlapping segments
 * 2. Embeds all chunks in batch
 * 3. Uses diversity sampling to select most diverse chunks
 * 4. Builds vignettes with content, position, and embedding
 * 5. Returns vignettes and state for future sampling
 *
 * @param rawData - Raw input data to sample from
 * @param count - Number of diverse vignettes to generate
 * @returns Result containing vignettes and state, or error message
 *
 * @example
 * ```typescript
 * const result = await generateInitialVignettes(csvData, 20);
 * if (isOk(result)) {
 *   const {vignettes, state} = result.data;
 *   // Use vignettes for analysis
 *   // Store state for future requestMoreSamples calls
 * }
 * ```
 */
export const generateInitialVignettes = async (
	rawData: string,
	count: number
): Promise<Result<InitialVignettesResult, string>> => {
	// Validate input
	if (!rawData || rawData.trim().length === 0) {
		return err('Raw data cannot be empty');
	}

	if (count <= 0) {
		return err('Count must be greater than 0');
	}

	// Step 1: Chunk the data
	const chunkResult = chunkText(rawData, DEFAULT_CHUNK_SIZE, DEFAULT_OVERLAP);
	if (isErr(chunkResult)) {
		return chunkResult;
	}

	const chunks = chunkResult.data;

	// Handle case where no chunks were generated
	if (chunks.length === 0) {
		return err('No chunks generated from input data');
	}

	// Step 2: Embed all chunks
	const texts = chunks.map((chunk) => chunk.content);
	const embeddingResult = await embedBatch(texts);
	if (isErr(embeddingResult)) {
		return embeddingResult;
	}

	const embeddings = embeddingResult.data;

	// Step 3: Select diverse samples
	const actualCount = Math.min(count, chunks.length);
	const selectedIndices = diversitySample(embeddings, actualCount);

	// Step 4: Build vignettes
	const vignettes: Vignette[] = selectedIndices.map((index) => {
		const chunk = chunks.at(index);
		const embedding = embeddings.at(index);

		if (!chunk || !embedding) {
			throw new Error(`Invalid index ${index} in chunks or embeddings`);
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

	// Step 5: Create state for future sampling
	const state: SamplerState = {
		rawData,
		allChunks: chunks,
		allEmbeddings: embeddings,
		providedIndices: new Set(selectedIndices),
	};

	return ok({vignettes, state});
};

/**
 * Requests additional diverse samples from remaining chunks
 *
 * Uses the state from previous sampling operations to avoid duplicates.
 * Selects diverse samples from chunks not yet provided to the agent.
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
