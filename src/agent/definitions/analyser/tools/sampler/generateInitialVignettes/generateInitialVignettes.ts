/**
 * Generates initial diverse vignettes from raw data
 *
 * Combines chunking, embedding, and diversity sampling to provide the Analyser Agent
 * with representative samples for data type identification.
 */

import type {Result} from '@sigil/src/common/errors/result';
import {err, isErr, ok} from '@sigil/src/common/errors/result';

import {chunkText, diversitySample, embedBatch} from '../common';
import type {SamplerState, Vignette} from '../common';

/**
 * Default chunk size for text splitting (characters)
 */
const DEFAULT_CHUNK_SIZE = 200;

/**
 * Default overlap between chunks (characters)
 */
const DEFAULT_OVERLAP = 10;

/**
 * Result from generating initial vignettes
 */
export interface InitialVignettesResult {
	/**
	 * Generated vignettes
	 */
	vignettes: Vignette[];

	/**
	 * State for future sampling operations
	 */
	state: SamplerState;
}

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
