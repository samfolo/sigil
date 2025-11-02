/**
 * Text embedding utilities using transformers.js
 *
 * Provides sentence embeddings for diversity sampling using the all-MiniLM-L6-v2 model.
 * Embeddings are 384-dimensional, L2 normalised vectors suitable for cosine similarity.
 *
 * Uses local inference (no API calls) for cost-effective, testable embedding generation.
 */

import {pipeline, type FeatureExtractionPipeline} from '@huggingface/transformers';

import type {Result} from '@sigil/src/common/errors/result';
import {err, isErr, ok} from '@sigil/src/common/errors/result';

/**
 * Embedding vector type (384-dimensional)
 */
export type Embedding = number[];

/**
 * Progress callback for embedding operations
 *
 * Reports the number of embeddings completed and the total count.
 * Invoked after each batch of embeddings completes.
 *
 * @param current - Number of embeddings completed so far
 * @param total - Total number of embeddings to process
 */
export type EmbeddingProgressCallback = (current: number, total: number) => void;

/**
 * ONNX Runtime tensor interface with CPU data access
 *
 * The cpuData property is private in onnxruntime-common but accessible
 * via the library's internal tensor implementation.
 */
interface OnnxTensorWithCpuData {
	cpuData: Float32Array;
}

/**
 * Model configuration
 */
const MODEL_NAME = 'Xenova/all-MiniLM-L6-v2';

/**
 * Embedding dimension for all-MiniLM-L6-v2 model
 */
export const EMBEDDING_DIMENSION = 384;

/**
 * Maximum batch size for embedding operations
 *
 * Prevents OOM when processing large numbers of chunks
 */
export const MAX_BATCH_SIZE = 100;

/**
 * Pipeline task type for feature extraction
 */
const PIPELINE_TASK = 'feature-extraction';

/**
 * Pooling strategy for combining token embeddings
 */
const POOLING_STRATEGY = 'mean';

/**
 * Singleton embedding pipeline instance
 */
let embedderInstance: FeatureExtractionPipeline | null = null;

/**
 * Promise for ongoing model initialisation
 *
 * Prevents race conditions when multiple calls happen before first load completes
 */
let initialisationPromise: Promise<FeatureExtractionPipeline> | null = null;

/**
 * Gets or creates the singleton embedding pipeline
 *
 * First call downloads the model (~20MB, cached locally).
 * Subsequent calls reuse the cached pipeline and model.
 *
 * Uses mutex pattern to prevent race conditions on concurrent first calls.
 *
 * @returns Result containing the feature extraction pipeline, or error message
 */
export const getEmbedder = async (): Promise<
	Result<FeatureExtractionPipeline, string>
> => {
	// Return existing instance if available
	if (embedderInstance) {
		return ok(embedderInstance);
	}

	// If initialisation is already in progress, wait for it
	if (initialisationPromise) {
		try {
			const pipe = await initialisationPromise;
			return ok(pipe);
		} catch (error) {
			// Reset promise so next call can retry
			initialisationPromise = null;
			return err(
				error instanceof Error
					? `Failed to initialise embedder: ${error.message}`
					: 'Failed to initialise embedder: Unknown error'
			);
		}
	}

	// Start initialisation
	initialisationPromise = (async () => {
		try {
			const pipe = await pipeline(PIPELINE_TASK, MODEL_NAME);
			embedderInstance = pipe;
			return pipe;
		} catch (error) {
			throw error;
		} finally {
			// Clear promise after completion (success or failure)
			initialisationPromise = null;
		}
	})();

	try {
		const pipe = await initialisationPromise;
		return ok(pipe);
	} catch (error) {
		return err(
			error instanceof Error
				? `Failed to load model ${MODEL_NAME}: ${error.message}`
				: `Failed to load model ${MODEL_NAME}: Unknown error`
		);
	}
};

/**
 * Type guard for ONNX Runtime tensor with cpuData property
 */
const hasCpuData = (value: unknown): value is OnnxTensorWithCpuData =>
	typeof value === 'object' && value !== null && 'cpuData' in value;

/**
 * Converts Float32Array to regular number array
 */
const float32ArrayToArray = (tensor: Float32Array): number[] =>
	Array.from(tensor);

/**
 * Embeds a single text string into a 384-dimensional vector
 *
 * @param text - Text to embed
 * @returns Result containing normalised embedding vector, or error message
 *
 * @example
 * ```typescript
 * const result = await embedText('This is CSV data with columns');
 * if (isOk(result)) {
 *   console.log(result.data.length); // 384
 * }
 * ```
 */
export const embedText = async (
	text: string
): Promise<Result<Embedding, string>> => {
	const embedderResult = await getEmbedder();
	if (isErr(embedderResult)) {
		return embedderResult;
	}

	const embedder = embedderResult.data;

	try {
		const output = await embedder(text, {
			pooling: POOLING_STRATEGY,
			normalize: true,
		});

		// Extract the embedding from the output
		// Output is a Tensor with shape [1, 384] for single text
		// Access via ort_tensor.cpuData
		if (!hasCpuData(output.ort_tensor)) {
			return err('Expected tensor with cpuData property');
		}

		const tensor = output.ort_tensor.cpuData;
		return ok(float32ArrayToArray(tensor));
	} catch (error) {
		return err(
			error instanceof Error
				? `Failed to embed text: ${error.message}`
				: 'Failed to embed text: Unknown error'
		);
	}
};

/**
 * Embeds multiple text strings in a batch
 *
 * More efficient than calling embedText multiple times.
 * Automatically splits into smaller batches if input exceeds MAX_BATCH_SIZE.
 *
 * @param texts - Array of texts to embed
 * @param onProgress - Optional callback invoked after each batch completes
 * @returns Result containing array of normalised embedding vectors, or error message
 *
 * @example
 * ```typescript
 * const result = await embedBatch(['text one', 'text two', 'text three']);
 * if (isOk(result)) {
 *   console.log(result.data.length); // 3
 *   console.log(result.data[0].length); // 384
 * }
 * ```
 */
export const embedBatch = async (
	texts: string[],
	onProgress?: EmbeddingProgressCallback
): Promise<Result<Embedding[], string>> => {
	if (texts.length === 0) {
		return ok([]);
	}

	const embedderResult = await getEmbedder();
	if (isErr(embedderResult)) {
		return embedderResult;
	}

	const embedder = embedderResult.data;

	// Split into smaller batches if necessary
	if (texts.length > MAX_BATCH_SIZE) {
		const allEmbeddings: Embedding[] = [];
		const total = texts.length;

		for (let i = 0; i < texts.length; i += MAX_BATCH_SIZE) {
			const batch = texts.slice(i, i + MAX_BATCH_SIZE);
			const batchResult = await embedBatch(batch);

			if (isErr(batchResult)) {
				return batchResult;
			}

			allEmbeddings.push(...batchResult.data);

			// Report progress after each batch completes
			if (onProgress) {
				try {
					onProgress(allEmbeddings.length, total);
				} catch (error) {
					console.error(
						'Progress callback error:',
						error instanceof Error ? error.message : 'Unknown error'
					);
				}
			}
		}

		return ok(allEmbeddings);
	}

	try {
		const output = await embedder(texts, {
			pooling: POOLING_STRATEGY,
			normalize: true,
		});

		// Output shape is [N, 384] where N is the number of texts
		// Data is flattened in cpuData, so we slice into chunks
		if (!hasCpuData(output.ort_tensor)) {
			return err('Expected tensor with cpuData property');
		}

		const tensor = output.ort_tensor.cpuData;
		const embeddings: Embedding[] = [];

		for (let i = 0; i < texts.length; i++) {
			const start = i * EMBEDDING_DIMENSION;
			const end = start + EMBEDDING_DIMENSION;
			const embedding = float32ArrayToArray(tensor.slice(start, end));
			embeddings.push(embedding);
		}

		// Report progress after batch completes
		if (onProgress) {
			try {
				onProgress(embeddings.length, texts.length);
			} catch (error) {
				console.error(
					'Progress callback error:',
					error instanceof Error ? error.message : 'Unknown error'
				);
			}
		}

		return ok(embeddings);
	} catch (error) {
		return err(
			error instanceof Error
				? `Failed to embed batch: ${error.message}`
				: 'Failed to embed batch: Unknown error'
		);
	}
};

/**
 * Cleans up the singleton embedder instance
 *
 * Useful for testing or when embedding is no longer needed.
 * Next call to getEmbedder will create a new instance.
 */
export const cleanupEmbedder = (): void => {
	embedderInstance = null;
	initialisationPromise = null;
};
