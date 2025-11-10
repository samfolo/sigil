/**
 * Run artifact schemas
 *
 * Zod schemas for run-based artifact storage. Derive types using z.infer and
 * use schemas to validate data when loading artifacts from disk.
 */

import {z} from 'zod';

import {AnalysisOutputSchema} from '@sigil/src/agent/definitions/analyser/schemas';
import {SigilLogEntrySchema} from '@sigil/src/common/observability/logger/events';
import {ComponentSpecSchema} from '@sigil/src/lib/generated/schemas';

/**
 * Run completion status
 */
export const RunMetadataStatusSchema = z.enum(['completed', 'failed']);

export type RunMetadataStatus = z.infer<typeof RunMetadataStatusSchema>;

/**
 * Summary information about a run
 */
export const RunMetadataSchema = z.object({
	/**
	 * Pipeline orchestrator name
	 *
	 * The top-level agent coordinating the execution (e.g., "DataProcessingPipeline").
	 */
	pipeline: z.string().describe('Pipeline orchestrator name'),

	/**
	 * Subordinate agents executed during the run
	 *
	 * List of agents that were invoked by the pipeline (e.g., ["Analyser", "GenerateSigilIR"]).
	 * Empty array if the pipeline failed before executing any agents.
	 */
	agents: z.array(z.string()).describe('Subordinate agents executed during the run'),

	/**
	 * Unix timestamp in milliseconds when run started
	 */
	startTimestamp: z.number().int().positive().describe('Unix timestamp in milliseconds when run started'),

	/**
	 * Unix timestamp in milliseconds when run completed
	 *
	 * Null if the run crashed before completion.
	 */
	endTimestamp: z.number().int().positive().nullable().describe('Unix timestamp in milliseconds when run completed, null if crashed'),

	/**
	 * Run completion status
	 *
	 * - 'completed': Full pipeline succeeded
	 * - 'failed': Pipeline failed or was cancelled
	 */
	status: RunMetadataStatusSchema.describe('Run completion status'),
});

export type RunMetadata = z.infer<typeof RunMetadataSchema>;

/**
 * Complete artifact bundle for a single run
 *
 * Each run directory contains:
 * - input.txt: Raw input data (JSON, CSV string, etc.)
 * - data.json: Parsed data from Analyser agent (may be null if Analyser failed)
 * - analysis.json: Output from Analyser agent (may be null if Analyser failed)
 * - output.json: Generated spec from GenerateSigilIR agent (may be null if GenerateSigilIR failed)
 * - logs.jsonl: Line-by-line execution logs written by Pino transport
 * - metadata.json: Summary information about the run
 */
export const RunArtifactSchema = z.object({
	/**
	 * Run identifier
	 *
	 * Format: YYYYMMDD-HHmmssSSS-xxxx where xxxx is 4-char hex suffix
	 */
	runId: z.string().regex(/^\d{8}-\d{9}-[a-f0-9]{4}$/).describe('Run identifier (format: YYYYMMDD-HHmmssSSS-xxxx)'),

	/**
	 * Raw input data
	 *
	 * Always stored and loaded as a string from input.txt.
	 * Objects and non-string primitives are stringified on save.
	 */
	input: z.string().describe('Raw input data from input.txt (always a string)'),

	/**
	 * Parsed data from Analyser agent
	 *
	 * The structured data extracted by the Analyser agent's parser tools.
	 * Null if the run failed before Analyser completed.
	 */
	data: z.unknown().nullable().describe('Parsed data from Analyser agent, null if Analyser failed'),

	/**
	 * Output from Analyser agent
	 *
	 * Null if the run failed before Analyser completed.
	 */
	analysis: AnalysisOutputSchema.nullable().describe('Output from Analyser agent, null if Analyser failed'),

	/**
	 * Generated spec from GenerateSigilIR agent
	 *
	 * Null if the run failed before GenerateSigilIR completed.
	 */
	output: ComponentSpecSchema.nullable().describe('Generated spec from GenerateSigilIR agent, null if GenerateSigilIR failed'),

	/**
	 * Parsed log entries from logs.jsonl
	 *
	 * One entry per line in the JSONL file.
	 */
	logs: z.array(SigilLogEntrySchema).describe('Parsed log entries from logs.jsonl'),

	/**
	 * Summary information about the run
	 */
	metadata: RunMetadataSchema.describe('Summary information about the run'),
});

export type RunArtifact = z.infer<typeof RunArtifactSchema>;
