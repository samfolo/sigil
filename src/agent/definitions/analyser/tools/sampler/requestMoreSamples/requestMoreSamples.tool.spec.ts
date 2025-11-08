/**
 * Tests for request_more_samples tool
 *
 * @vitest-environment node
 */

import {describe, expect, it} from 'vitest';
import {z} from 'zod';

import type {AgentState} from '@sigil/src/agent/framework/defineAgent';
import {isErr, isOk} from '@sigil/src/common/errors';
import type {EmptyObject} from '@sigil/src/common/types';

import {EMBEDDING_DIMENSION, type Vignette} from '../common';
import {generateInitialVignettes} from '../generateInitialVignettes';
import {REALISTIC_CSV_DATA} from '../sampler.fixtures';

import {createRequestMoreSamplesTool} from './requestMoreSamples.tool';
import type {SampleRetrieverState} from './schemas';

const REQUEST_MORE_SAMPLES_TIMEOUT = 15000; // 15 seconds

const vignettePositionSchema = z.object({
	start: z.number(),
	end: z.number(),
});

const vignetteSchema = z.object({
	content: z.string(),
	position: vignettePositionSchema,
	embedding: z.array(z.number()).length(EMBEDDING_DIMENSION),
});

const requestMoreSamplesResultSchema = z.object({
	vignettes: z.array(vignetteSchema),
	hasMore: z.boolean(),
});

const VALID_INPUT = {
	count: 5,
};

const createState = (state: SampleRetrieverState): AgentState<SampleRetrieverState, EmptyObject> => ({
	context: {
		attempt: 1,
		maxAttempts: 3,
		iteration: 1,
		maxIterations: 10,
	},
	run: state,
	attempt: {},
});

describe('REQUEST_MORE_SAMPLES_TOOL', () => {
	const tool = createRequestMoreSamplesTool<SampleRetrieverState, EmptyObject>();

	describe('handler', () => {
		it('returns error when samplerState is undefined', {timeout: REQUEST_MORE_SAMPLES_TIMEOUT}, () => {
			const state = createState({});

			const result = tool.handler(state, VALID_INPUT);

			expect(isErr(result)).toBe(true);
			if (!isErr(result)) {
				return;
			}

			expect(result.error).toContain('No sampler state available');
			expect(result.error).toContain('Initial vignettes must be generated first');
		});

		it('returns error for count less than 1', {timeout: REQUEST_MORE_SAMPLES_TIMEOUT}, () => {
			const state = createState({});

			const result = tool.handler(state, {count: 0});

			expect(isErr(result)).toBe(true);
			if (!isErr(result)) {
				return;
			}

			expect(result.error).toContain('Invalid input');
		});

		it('returns error for negative count', {timeout: REQUEST_MORE_SAMPLES_TIMEOUT}, () => {
			const state = createState({});

			const result = tool.handler(state, {count: -5});

			expect(isErr(result)).toBe(true);
			if (!isErr(result)) {
				return;
			}

			expect(result.error).toContain('Invalid input');
		});

		it('returns error for non-integer count', {timeout: REQUEST_MORE_SAMPLES_TIMEOUT}, () => {
			const state = createState({});

			const result = tool.handler(state, {count: 5.5});

			expect(isErr(result)).toBe(true);
			if (!isErr(result)) {
				return;
			}

			expect(result.error).toContain('Invalid input');
		});

		it('uses default count of 10 when count not provided', {timeout: REQUEST_MORE_SAMPLES_TIMEOUT}, async () => {
			const initialResult = await generateInitialVignettes(REALISTIC_CSV_DATA, 5);

			expect(isOk(initialResult)).toBe(true);
			if (!isOk(initialResult)) {
				return;
			}

			const state = createState({samplerState: initialResult.data.state});

			const result = tool.handler(state, {});

			expect(isOk(result)).toBe(true);
			if (!isOk(result)) {
				return;
			}

			const toolResult = result.data.toolResult;
			const parsed = requestMoreSamplesResultSchema.safeParse(toolResult);

			expect(parsed.success).toBe(true);
			if (!parsed.success) {
				return;
			}

			// Should return up to 10 vignettes (default)
			expect(parsed.data.vignettes.length).toBeGreaterThan(0);
			expect(parsed.data.vignettes.length).toBeLessThanOrEqual(10);
		});

		it('returns unchanged state with tool result on success', {timeout: REQUEST_MORE_SAMPLES_TIMEOUT}, async () => {
			const initialResult = await generateInitialVignettes(REALISTIC_CSV_DATA, 10);

			expect(isOk(initialResult)).toBe(true);
			if (!isOk(initialResult)) {
				return;
			}

			const state = createState({samplerState: initialResult.data.state});

			const result = tool.handler(state, VALID_INPUT);

			expect(isOk(result)).toBe(true);
			if (!isOk(result)) {
				return;
			}

			// Attempt state should be unchanged
			expect(result.data.newState.attempt).toEqual(state.attempt);

			// Tool result should have correct shape
			const toolResult = result.data.toolResult;
			const parsed = requestMoreSamplesResultSchema.safeParse(toolResult);

			expect(parsed.success).toBe(true);
		});

		it('updates state.run.samplerState with newState', {timeout: REQUEST_MORE_SAMPLES_TIMEOUT}, async () => {
			const initialResult = await generateInitialVignettes(REALISTIC_CSV_DATA, 10);

			expect(isOk(initialResult)).toBe(true);
			if (!isOk(initialResult)) {
				return;
			}

			const originalState = initialResult.data.state;
			const state = createState({samplerState: originalState});

			const result = tool.handler(state, VALID_INPUT);

			expect(isOk(result)).toBe(true);
			if (!isOk(result)) {
				return;
			}

			// samplerState should be updated
			expect(result.data.newState.run.samplerState).toBeDefined();
			expect(result.data.newState.run.samplerState).not.toBe(originalState);

			// providedIndices should have grown
			const newProvidedCount = result.data.newState.run.samplerState?.providedIndices.size ?? 0;
			const originalProvidedCount = originalState.providedIndices.size;
			expect(newProvidedCount).toBeGreaterThan(originalProvidedCount);
		});

		it('returns vignettes with valid schema', {timeout: REQUEST_MORE_SAMPLES_TIMEOUT}, async () => {
			const initialResult = await generateInitialVignettes(REALISTIC_CSV_DATA, 5);

			expect(isOk(initialResult)).toBe(true);
			if (!isOk(initialResult)) {
				return;
			}

			const state = createState({samplerState: initialResult.data.state});

			const result = tool.handler(state, VALID_INPUT);

			expect(isOk(result)).toBe(true);
			if (!isOk(result)) {
				return;
			}

			const toolResult = result.data.toolResult;
			const parsed = requestMoreSamplesResultSchema.safeParse(toolResult);

			expect(parsed.success).toBe(true);
			if (!parsed.success) {
				return;
			}

			// Verify each vignette matches schema
			for (const vignette of parsed.data.vignettes) {
				expect(vignette.content.length).toBeGreaterThan(0);
				expect(vignette.position.start).toBeLessThan(vignette.position.end);
				expect(vignette.embedding.length).toBe(EMBEDDING_DIMENSION);
			}
		});

		it('hasMore flag indicates availability correctly', {timeout: REQUEST_MORE_SAMPLES_TIMEOUT}, async () => {
			const smallData = 'Text. '.repeat(10);
			const initialResult = await generateInitialVignettes(smallData, 2);

			expect(isOk(initialResult)).toBe(true);
			if (!isOk(initialResult)) {
				return;
			}

			let currentState = createState({samplerState: initialResult.data.state});

			// Keep requesting until exhausted
			let iterations = 0;
			const maxIterations = 20;

			while (iterations < maxIterations) {
				const result = tool.handler(currentState, {count: 2});

				expect(isOk(result)).toBe(true);
				if (!isOk(result)) {
					return;
				}

				const toolResult = result.data.toolResult;
				const parsed = requestMoreSamplesResultSchema.safeParse(toolResult);

				expect(parsed.success).toBe(true);
				if (!parsed.success) {
					return;
				}

				if (parsed.data.vignettes.length === 0) {
					expect(parsed.data.hasMore).toBe(false);
					break;
				}

				if (!parsed.data.hasMore) {
					// Last batch - providedIndices should equal allChunks
					const samplerState = result.data.newState.run.samplerState;
					expect(samplerState).toBeDefined();
					if (samplerState) {
						expect(samplerState.providedIndices.size).toBe(
							samplerState.allChunks.length
						);
					}
					break;
				}

				currentState = {
					...currentState,
					run: result.data.newState.run,
				};

				iterations++;
			}

			expect(iterations).toBeLessThan(maxIterations);
		});

		it('integration: works with actual SamplerState from generateInitialVignettes', {timeout: REQUEST_MORE_SAMPLES_TIMEOUT}, async () => {
			const initialResult = await generateInitialVignettes(REALISTIC_CSV_DATA, 20);

			expect(isOk(initialResult)).toBe(true);
			if (!isOk(initialResult)) {
				return;
			}

			const {vignettes: initialVignettes, state: samplerState} = initialResult.data;

			const state = createState({samplerState});

			const result = tool.handler(state, {count: 15});

			expect(isOk(result)).toBe(true);
			if (!isOk(result)) {
				return;
			}

			const toolResult = result.data.toolResult;
			const parsed = requestMoreSamplesResultSchema.safeParse(toolResult);

			expect(parsed.success).toBe(true);
			if (!parsed.success) {
				return;
			}

			// Should return additional vignettes
			expect(parsed.data.vignettes.length).toBeGreaterThan(0);

			// No duplicates with initial vignettes
			const initialPositions = new Set(
				initialVignettes.map((v: Vignette) => `${v.position.start}-${v.position.end}`)
			);
			const newPositions = new Set(
				parsed.data.vignettes.map((v: Vignette) => `${v.position.start}-${v.position.end}`)
			);

			for (const pos of newPositions) {
				expect(initialPositions.has(pos)).toBe(false);
			}
		});

		it('handles exhausted state with empty results', {timeout: REQUEST_MORE_SAMPLES_TIMEOUT}, async () => {
			const initialResult = await generateInitialVignettes('Short text', 1);

			expect(isOk(initialResult)).toBe(true);
			if (!isOk(initialResult)) {
				return;
			}

			const state = createState({samplerState: initialResult.data.state});

			// Exhaust all samples
			const exhaust1 = tool.handler(state, {count: 100});
			expect(isOk(exhaust1)).toBe(true);

			if (!isOk(exhaust1)) {
				return;
			}

			// Update state
			const exhaustedState = createState({
				samplerState: exhaust1.data.newState.run.samplerState,
			});

			// Request more when exhausted - should succeed with empty vignettes
			const result = tool.handler(exhaustedState, {count: 10});

			expect(isOk(result)).toBe(true);
			if (!isOk(result)) {
				return;
			}

			const toolResult = result.data.toolResult;
			const parsed = requestMoreSamplesResultSchema.safeParse(toolResult);

			expect(parsed.success).toBe(true);
			if (!parsed.success) {
				return;
			}

			expect(parsed.data.vignettes).toHaveLength(0);
			expect(parsed.data.hasMore).toBe(false);
		});
	});
});
