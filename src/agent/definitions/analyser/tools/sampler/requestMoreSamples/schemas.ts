/**
 * Zod schemas and types for sample retriever state
 *
 * Single source of truth for request_more_samples tool state structure.
 * Types are exported using z.infer to guarantee runtime/compile-time consistency.
 */

import {z} from 'zod';

import {SamplerStateSchema} from '../common';

/**
 * Tool-specific state for sample retriever tools
 *
 * Contains only the fields needed by sample retrieval tools, allowing composition
 * with other tool states at the agent level.
 */
export const SampleRetrieverStateSchema = z.object({
	/**
	 * State maintained across sampling operations
	 *
	 * Undefined until generateInitialVignettes is called.
	 */
	samplerState: SamplerStateSchema.optional().describe('State maintained across sampling operations'),
});

export type SampleRetrieverState = z.infer<typeof SampleRetrieverStateSchema>;
