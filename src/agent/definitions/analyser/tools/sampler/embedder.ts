/**
 * Text embedding utilities using transformers.js
 *
 * Provides sentence embeddings for diversity sampling using the all-MiniLM-L6-v2 model.
 * Embeddings are 384-dimensional, L2 normalised vectors suitable for cosine similarity.
 */

import {pipeline, type FeatureExtractionPipeline} from '@huggingface/transformers';

/**
 * Embedding vector type (384-dimensional)
 */
export type Embedding = number[];

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
 * Singleton embedding pipeline instance
 */
let embedderInstance: FeatureExtractionPipeline | null = null;

/**
 * Gets or creates the singleton embedding pipeline
 *
 * First call downloads the model (~20MB, cached locally).
 * Subsequent calls reuse the cached pipeline and model.
 *
 * @returns Promise resolving to the feature extraction pipeline
 */
export const getEmbedder = async (): Promise<FeatureExtractionPipeline> => {
	if (embedderInstance) {
		return embedderInstance;
	}

	const pipe = await pipeline('feature-extraction', MODEL_NAME);
	embedderInstance = pipe;
	return embedderInstance;
};

/**
 * Type guard for ONNX Runtime tensor with cpuData property
 */
const hasCpuData = (value: unknown): value is OnnxTensorWithCpuData =>
	typeof value === 'object' &&
	value !== null &&
	'cpuData' in value;

/**
 * Converts Float32Array to regular number array
 */
const float32ArrayToArray = (tensor: Float32Array): number[] => Array.from(tensor);

/**
 * Embeds a single text string into a 384-dimensional vector
 *
 * @param text - Text to embed
 * @returns Promise resolving to normalised embedding vector
 *
 * @example
 * ```typescript
 * const embedding = await embedText('This is CSV data with columns');
 * console.log(embedding.length); // 384
 * ```
 */
export const embedText = async (text: string): Promise<Embedding> => {
	const embedder = await getEmbedder();

	const output = await embedder(text, {
		pooling: 'mean',
		normalize: true,
	});

	// Extract the embedding from the output
	// Output is a Tensor with shape [1, 384] for single text
	// Access via ort_tensor.cpuData
	if (!hasCpuData(output.ort_tensor)) {
		throw new Error('Expected tensor with cpuData property');
	}

	const tensor = output.ort_tensor.cpuData;
	return float32ArrayToArray(tensor);
};

/**
 * Embeds multiple text strings in a batch
 *
 * More efficient than calling embedText multiple times.
 *
 * @param texts - Array of texts to embed
 * @returns Promise resolving to array of normalised embedding vectors
 *
 * @example
 * ```typescript
 * const embeddings = await embedBatch(['text one', 'text two', 'text three']);
 * console.log(embeddings.length); // 3
 * console.log(embeddings[0].length); // 384
 * ```
 */
export const embedBatch = async (texts: string[]): Promise<Embedding[]> => {
	if (texts.length === 0) {
		return [];
	}

	const embedder = await getEmbedder();

	const output = await embedder(texts, {
		pooling: 'mean',
		normalize: true,
	});

	// Output shape is [N, 384] where N is the number of texts
	// Data is flattened in cpuData, so we slice into chunks
	if (!hasCpuData(output.ort_tensor)) {
		throw new Error('Expected tensor with cpuData property');
	}

	const tensor = output.ort_tensor.cpuData;
	const embeddings: Embedding[] = [];

	for (let i = 0; i < texts.length; i++) {
		const start = i * EMBEDDING_DIMENSION;
		const end = start + EMBEDDING_DIMENSION;
		const embedding = float32ArrayToArray(tensor.slice(start, end));
		embeddings.push(embedding);
	}

	return embeddings;
};

/**
 * Cleans up the singleton embedder instance
 *
 * Useful for testing or when embedding is no longer needed.
 * Next call to getEmbedder will create a new instance.
 */
export const cleanupEmbedder = (): void => {
	embedderInstance = null;
};
