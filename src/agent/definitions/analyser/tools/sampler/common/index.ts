/**
 * Common utilities for diversity sampling
 *
 * Shared embedding, chunking, and diversity selection utilities.
 */

export {chunkText} from './chunkText';

export {diversitySample, calculateAveragePairwiseDistance} from './diversity';

export {embedText, embedBatch, cleanupEmbedder, EMBEDDING_DIMENSION} from './embedder';
export type {Embedding} from './embedder';

export type {Chunk, Vignette, VignettePosition, SamplerState} from './schemas';
export {ChunkSchema, VignetteSchema, VignettePositionSchema, SamplerStateSchema} from './schemas';
