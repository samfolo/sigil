/**
 * Type definitions for GenerateSigilIR Agent
 *
 * This agent generates ComponentSpec intermediate representations from AnalysisOutput.
 * The output omits id/created_at fields, which are added by the API after validation.
 */

import type {AnalysisOutput} from '@sigil/src/agent/definitions/analyser/schemas';
import type {ComponentSpec} from '@sigil/src/lib/generated/types';

/**
 * Input to the GenerateSigilIR agent
 *
 * Contains the AnalysisOutput from the Analyser agent, which includes format
 * classification, keyFields with JSONPath accessors, semantic summary, and
 * visualisation recommendations.
 */
export interface GenerateSigilIRInput {
	/**
	 * AnalysisOutput from the Analyser agent
	 */
	analysis: AnalysisOutput;

	/**
	 * Parsed data from the Analyser agent
	 *
	 * Used by buildRenderTree validator to validate dataSource paths
	 * against actual data structure.
	 */
	parsedData: unknown;
}

/**
 * Output from the GenerateSigilIR agent
 */
export type GenerateSigilIROutput = Omit<ComponentSpec, 'id' | 'created_at'>;
