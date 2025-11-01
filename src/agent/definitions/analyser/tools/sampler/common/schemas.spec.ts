/**
 * Tests for sampler common schemas
 */

import {describe, expect, it} from 'vitest';

import {EMBEDDING_DIMENSION} from './embedder';
import {ChunkSchema, SamplerStateSchema, VignettePositionSchema, VignetteSchema} from './schemas';

describe('ChunkSchema', () => {
	it('should validate valid chunk', () => {
		const validChunk = {
			content: 'Sample text content',
			start: 0,
			end: 19,
		};

		const result = ChunkSchema.safeParse(validChunk);
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data).toEqual(validChunk);
		}
	});

	it('should reject chunk with negative start', () => {
		const invalidChunk = {
			content: 'Sample text',
			start: -1,
			end: 10,
		};

		const result = ChunkSchema.safeParse(invalidChunk);
		expect(result.success).toBe(false);
	});

	it('should reject chunk with negative end', () => {
		const invalidChunk = {
			content: 'Sample text',
			start: 0,
			end: -5,
		};

		const result = ChunkSchema.safeParse(invalidChunk);
		expect(result.success).toBe(false);
	});

	it('should reject chunk with non-integer offsets', () => {
		const invalidChunk = {
			content: 'Sample text',
			start: 0.5,
			end: 10.5,
		};

		const result = ChunkSchema.safeParse(invalidChunk);
		expect(result.success).toBe(false);
	});

	it('should reject chunk with missing fields', () => {
		const invalidChunk = {
			content: 'Sample text',
			start: 0,
		};

		const result = ChunkSchema.safeParse(invalidChunk);
		expect(result.success).toBe(false);
	});
});

describe('VignettePositionSchema', () => {
	it('should validate valid position', () => {
		const validPosition = {
			start: 100,
			end: 300,
		};

		const result = VignettePositionSchema.safeParse(validPosition);
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data).toEqual(validPosition);
		}
	});

	it('should reject position with negative start', () => {
		const invalidPosition = {
			start: -10,
			end: 50,
		};

		const result = VignettePositionSchema.safeParse(invalidPosition);
		expect(result.success).toBe(false);
	});

	it('should reject position with negative end', () => {
		const invalidPosition = {
			start: 10,
			end: -50,
		};

		const result = VignettePositionSchema.safeParse(invalidPosition);
		expect(result.success).toBe(false);
	});

	it('should reject position with non-integer values', () => {
		const invalidPosition = {
			start: 10.5,
			end: 50.5,
		};

		const result = VignettePositionSchema.safeParse(invalidPosition);
		expect(result.success).toBe(false);
	});
});

describe('VignetteSchema', () => {
	const createValidEmbedding = (): number[] => Array.from({length: EMBEDDING_DIMENSION}, (_, i) => Math.sin(i));

	it('should validate valid vignette', () => {
		const validVignette = {
			content: 'Sample vignette content',
			position: {start: 0, end: 23},
			embedding: createValidEmbedding(),
		};

		const result = VignetteSchema.safeParse(validVignette);
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.content).toBe(validVignette.content);
			expect(result.data.position).toEqual(validVignette.position);
			expect(result.data.embedding).toHaveLength(EMBEDDING_DIMENSION);
		}
	});

	it('should reject vignette with wrong embedding dimension', () => {
		const invalidVignette = {
			content: 'Sample vignette',
			position: {start: 0, end: 15},
			embedding: Array.from({length: EMBEDDING_DIMENSION - 1}, () => 0.5),
		};

		const result = VignetteSchema.safeParse(invalidVignette);
		expect(result.success).toBe(false);
	});

	it('should reject vignette with empty embedding', () => {
		const invalidVignette = {
			content: 'Sample vignette',
			position: {start: 0, end: 15},
			embedding: [],
		};

		const result = VignetteSchema.safeParse(invalidVignette);
		expect(result.success).toBe(false);
	});

	it('should reject vignette with invalid position', () => {
		const invalidVignette = {
			content: 'Sample vignette',
			position: {start: -1, end: 15},
			embedding: createValidEmbedding(),
		};

		const result = VignetteSchema.safeParse(invalidVignette);
		expect(result.success).toBe(false);
	});

	it('should reject vignette with missing fields', () => {
		const invalidVignette = {
			content: 'Sample vignette',
			position: {start: 0, end: 15},
		};

		const result = VignetteSchema.safeParse(invalidVignette);
		expect(result.success).toBe(false);
	});
});

describe('SamplerStateSchema', () => {
	const createValidEmbedding = (): number[] => Array.from({length: EMBEDDING_DIMENSION}, (_, i) => Math.sin(i));

	const createValidState = () => ({
		rawData: 'Raw data string for sampling',
		allChunks: [
			{content: 'Chunk 1', start: 0, end: 7},
			{content: 'Chunk 2', start: 8, end: 15},
			{content: 'Chunk 3', start: 16, end: 23},
		],
		allEmbeddings: [createValidEmbedding(), createValidEmbedding(), createValidEmbedding()],
		providedIndices: new Set([0, 2]),
	});

	it('should validate valid sampler state', () => {
		const validState = createValidState();

		const result = SamplerStateSchema.safeParse(validState);
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.rawData).toBe(validState.rawData);
			expect(result.data.allChunks).toHaveLength(3);
			expect(result.data.allEmbeddings).toHaveLength(3);
			expect(result.data.providedIndices).toBeInstanceOf(Set);
			expect(result.data.providedIndices.size).toBe(2);
			expect(result.data.providedIndices.has(0)).toBe(true);
			expect(result.data.providedIndices.has(2)).toBe(true);
		}
	});

	it('should validate sampler state with empty providedIndices', () => {
		const validState = {
			...createValidState(),
			providedIndices: new Set<number>(),
		};

		const result = SamplerStateSchema.safeParse(validState);
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.providedIndices.size).toBe(0);
		}
	});

	it('should reject state with wrong embedding dimensions', () => {
		const invalidState = {
			...createValidState(),
			allEmbeddings: [
				Array.from({length: EMBEDDING_DIMENSION - 1}, () => 0.5),
				createValidEmbedding(),
				createValidEmbedding(),
			],
		};

		const result = SamplerStateSchema.safeParse(invalidState);
		expect(result.success).toBe(false);
	});

	it('should reject state with invalid chunks', () => {
		const invalidState = {
			...createValidState(),
			allChunks: [
				{content: 'Chunk 1', start: -1, end: 7}, // Invalid: negative start
				{content: 'Chunk 2', start: 8, end: 15},
			],
		};

		const result = SamplerStateSchema.safeParse(invalidState);
		expect(result.success).toBe(false);
	});

	it('should reject state with negative index in providedIndices', () => {
		const invalidState = {
			...createValidState(),
			providedIndices: new Set([0, -1, 2]), // Invalid: negative index
		};

		const result = SamplerStateSchema.safeParse(invalidState);
		expect(result.success).toBe(false);
	});

	it('should reject state with non-integer index in providedIndices', () => {
		const invalidState = {
			...createValidState(),
			providedIndices: new Set([0, 1.5, 2]), // Invalid: non-integer index
		};

		const result = SamplerStateSchema.safeParse(invalidState);
		expect(result.success).toBe(false);
	});

	it('should reject state with missing fields', () => {
		const invalidState = {
			rawData: 'Raw data',
			allChunks: [],
		};

		const result = SamplerStateSchema.safeParse(invalidState);
		expect(result.success).toBe(false);
	});

	it('should reject state with providedIndices as array instead of Set', () => {
		const invalidState = {
			...createValidState(),
			providedIndices: [0, 1, 2], // Invalid: should be Set, not array
		};

		const result = SamplerStateSchema.safeParse(invalidState);
		expect(result.success).toBe(false);
	});
});
