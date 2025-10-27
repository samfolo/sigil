/**
 * Diversity Sampler
 *
 * Embedding-based diversity sampling for intelligent data analysis.
 * Generates diverse text vignettes from raw data using semantic embeddings.
 */

export {generateInitialVignettes, requestMoreSamples} from './sampler';

export type {
	Vignette,
	VignettePosition,
	SamplerState,
	InitialVignettesResult,
	MoreSamplesResult,
} from './types';
