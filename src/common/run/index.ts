/**
 * Run-based artifact storage
 *
 * Infrastructure for storing agent execution artifacts in timestamped run directories.
 * Each run gets a unique directory containing input, analysis, output, logs, and metadata.
 */

export {
	ANALYSIS_FILENAME,
	INPUT_FILENAME,
	LOGS_FILENAME,
	METADATA_FILENAME,
	OUTPUT_FILENAME,
	RUN_ID_PATTERN,
	getRunDirectory,
	loadRunArtifact,
	saveAnalysis,
	saveInput,
	saveMetadata,
	saveOutput,
	scanRuns,
} from './artifacts';
export {generateRunId} from './generateRunId';
export {RunArtifactSchema, RunMetadataSchema} from './schemas';
export type {RunArtifact, RunMetadata} from './schemas';
