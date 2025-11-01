import type {SamplerState} from '../types';

/**
 * Tool-specific state for sample retriever tools
 *
 * Contains only the fields needed by sample retrieval tools, allowing composition
 * with other tool states at the agent level.
 */
export interface SampleRetrieverState {
	/**
	 * State maintained across sampling operations
	 *
	 * Undefined until generateInitialVignettes is called.
	 */
	samplerState?: SamplerState;
}
