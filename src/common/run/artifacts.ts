/**
 * Artifact management functions
 *
 * Functions for saving and loading run artifacts from the filesystem.
 * Each run gets a timestamped directory containing input, analysis, output, logs, and metadata.
 */

import {existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync} from 'fs';
import {isAbsolute, join} from 'path';

import type {AnalysisOutput} from '@sigil/src/agent/definitions/analyser/schemas';
import type {Result} from '@sigil/src/common/errors/result';
import {err, ok} from '@sigil/src/common/errors/result';
import {SigilLogEntrySchema} from '@sigil/src/common/observability/logger/events';
import type {ComponentSpec} from '@sigil/src/lib/generated/types';

import type {RunArtifact, RunMetadata} from './schemas';
import {RunMetadataSchema} from './schemas';

/**
 * Enable debug logging for run directory scanning
 *
 * Set environment variable DEBUG_RUN_SCANNING=true to log detailed information
 * when scanning the runs directory, including invalid directory names encountered.
 */
const DEBUG_RUN_SCANNING = process.env.DEBUG_RUN_SCANNING === 'true';

/**
 * Pattern for validating run ID format
 *
 * Format: YYYYMMDD-HHMMSS-xxxx where xxxx is 4-character hex suffix
 */
export const RUN_ID_PATTERN = /^\d{8}-\d{6}-[a-f0-9]{4}$/;

export const INPUT_FILENAME = 'input.txt';
export const DATA_FILENAME = 'data.json';
export const ANALYSIS_FILENAME = 'analysis.json';
export const OUTPUT_FILENAME = 'output.json';
export const LOGS_FILENAME = 'logs.jsonl';
export const METADATA_FILENAME = 'metadata.json';

/**
 * Gets the base directory for all runs
 *
 * Directory location can be overridden via SIGIL_TEST_RUN_DIR environment variable.
 * This is primarily used in tests to isolate test runs from production runs.
 *
 * @returns Absolute path to runs directory (defaults to <project>/runs/)
 */
const getRunsDirectory = (): string => {
	const runsDir = process.env.SIGIL_TEST_RUN_DIR ?? 'runs';

	// If test override is an absolute path, use it directly
	if (isAbsolute(runsDir)) {
		return runsDir;
	}

	// Otherwise, join with project root
	return join(process.cwd(), runsDir);
};

/**
 * Gets the directory path for a specific run
 *
 * @param runId - Run identifier (format: YYYYMMDD-HHMMSS-xxxx)
 * @returns Absolute path to run directory
 *
 * @example
 * ```typescript
 * const path = getRunDirectory('20251108-143022-a3f9');
 * // "/project/runs/20251108-143022-a3f9/"
 * ```
 */
export const getRunDirectory = (runId: string): string => {
	const runsDir = getRunsDirectory();
	return join(runsDir, runId);
};

/**
 * Ensures run directory exists, creating it if necessary
 *
 * @param runId - Run identifier
 * @returns Result indicating success or failure
 */
const ensureRunDirectory = (runId: string): Result<void, string> => {
	const runDir = getRunDirectory(runId);

	try {
		if (!existsSync(runDir)) {
			mkdirSync(runDir, {recursive: true});
		}
		return ok(undefined);
	} catch (error) {
		if (isNodeError(error)) {
			return err(`Failed to create run directory: ${error.message}`);
		}
		return err(`Failed to create run directory: ${String(error)}`);
	}
};

/**
 * Saves input data to input.txt
 *
 * Determines serialisation based on data type:
 * - Objects/arrays: JSON.stringify
 * - Primitives/strings: String()
 *
 * @param runId - Run identifier
 * @param data - Input data to save
 * @returns Result indicating success or failure
 *
 * @example
 * ```typescript
 * const result = saveInput(runId, csvData);
 * if (isOk(result)) {
 *   console.log('Input saved');
 * }
 * ```
 */
export const saveInput = (runId: string, data: unknown): Result<void, string> => {
	const dirResult = ensureRunDirectory(runId);
	if (!dirResult.success) {
		return dirResult;
	}

	const runDir = getRunDirectory(runId);
	const inputPath = join(runDir, INPUT_FILENAME);

	let content: string;
	if (typeof data === 'object' && data !== null) {
		content = JSON.stringify(data);
	} else {
		content = String(data);
	}

	try {
		writeFileSync(inputPath, content, 'utf-8');
		return ok(undefined);
	} catch (error) {
		if (isNodeError(error)) {
			return err(`Failed to write input: ${error.message}`);
		}
		return err(`Failed to write input: ${String(error)}`);
	}
};

/**
 * Saves parsed data to data.json
 *
 * @param runId - Run identifier
 * @param data - Parsed data from Analyser agent state projection
 * @returns Result indicating success or failure
 */
export const saveData = (runId: string, data: unknown): Result<void, string> => {
	const dirResult = ensureRunDirectory(runId);
	if (!dirResult.success) {
		return dirResult;
	}

	const runDir = getRunDirectory(runId);
	const dataPath = join(runDir, DATA_FILENAME);

	try {
		writeFileSync(dataPath, JSON.stringify(data, null, 2), 'utf-8');
		return ok(undefined);
	} catch (error) {
		if (isNodeError(error)) {
			return err(`Failed to write data: ${error.message}`);
		}
		return err(`Failed to write data: ${String(error)}`);
	}
};

/**
 * Saves analysis output to analysis.json
 *
 * @param runId - Run identifier
 * @param analysis - AnalysisOutput from Analyser agent
 * @returns Result indicating success or failure
 */
export const saveAnalysis = (runId: string, analysis: AnalysisOutput): Result<void, string> => {
	const dirResult = ensureRunDirectory(runId);
	if (!dirResult.success) {
		return dirResult;
	}

	const runDir = getRunDirectory(runId);
	const analysisPath = join(runDir, ANALYSIS_FILENAME);

	try {
		writeFileSync(analysisPath, JSON.stringify(analysis, null, 2), 'utf-8');
		return ok(undefined);
	} catch (error) {
		if (isNodeError(error)) {
			return err(`Failed to write analysis: ${error.message}`);
		}
		return err(`Failed to write analysis: ${String(error)}`);
	}
};

/**
 * Saves component spec to output.json
 *
 * @param runId - Run identifier
 * @param spec - ComponentSpec from GenerateSigilIR agent
 * @returns Result indicating success or failure
 */
export const saveOutput = (runId: string, spec: ComponentSpec): Result<void, string> => {
	const dirResult = ensureRunDirectory(runId);
	if (!dirResult.success) {
		return dirResult;
	}

	const runDir = getRunDirectory(runId);
	const outputPath = join(runDir, OUTPUT_FILENAME);

	try {
		writeFileSync(outputPath, JSON.stringify(spec, null, 2), 'utf-8');
		return ok(undefined);
	} catch (error) {
		if (isNodeError(error)) {
			return err(`Failed to write output: ${error.message}`);
		}
		return err(`Failed to write output: ${String(error)}`);
	}
};

/**
 * Saves run metadata to metadata.json
 *
 * @param runId - Run identifier
 * @param metadata - RunMetadata summary information
 * @returns Result indicating success or failure
 */
export const saveMetadata = (runId: string, metadata: RunMetadata): Result<void, string> => {
	const dirResult = ensureRunDirectory(runId);
	if (!dirResult.success) {
		return dirResult;
	}

	const runDir = getRunDirectory(runId);
	const metadataPath = join(runDir, METADATA_FILENAME);

	try {
		writeFileSync(metadataPath, JSON.stringify(metadata, null, 2), 'utf-8');
		return ok(undefined);
	} catch (error) {
		if (isNodeError(error)) {
			return err(`Failed to write metadata: ${error.message}`);
		}
		return err(`Failed to write metadata: ${String(error)}`);
	}
};

/**
 * Type guard for Node.js filesystem errors
 */
const isNodeError = (error: unknown): error is NodeJS.ErrnoException => error instanceof Error;

/**
 * Loads a run artifact from disk
 *
 * Reads all files from the run directory and reconstructs the RunArtifact object.
 * Uses Zod schemas to validate data loaded from JSON files.
 *
 * @param runId - Run identifier
 * @returns Result containing RunArtifact or error message
 *
 * @example
 * ```typescript
 * const result = loadRunArtifact('20251108-143022-a3f9');
 * if (isOk(result)) {
 *   console.log(result.data.metadata.agent);
 * }
 * ```
 */
export const loadRunArtifact = (runId: string): Result<RunArtifact, string> => {
	const runDir = getRunDirectory(runId);

	if (!existsSync(runDir)) {
		return err(`Run directory not found: ${runId}`);
	}

	const inputPath = join(runDir, INPUT_FILENAME);
	const dataPath = join(runDir, DATA_FILENAME);
	const analysisPath = join(runDir, ANALYSIS_FILENAME);
	const outputPath = join(runDir, OUTPUT_FILENAME);
	const logsPath = join(runDir, LOGS_FILENAME);
	const metadataPath = join(runDir, METADATA_FILENAME);

	// Check required files exist
	if (!existsSync(inputPath)) {
		return err(`Missing ${INPUT_FILENAME} in run ${runId}`);
	}

	if (!existsSync(logsPath)) {
		return err(`Missing ${LOGS_FILENAME} in run ${runId}`);
	}

	if (!existsSync(metadataPath)) {
		return err(`Missing ${METADATA_FILENAME} in run ${runId}`);
	}

	// Load input as string (keep as-is, don't parse)
	let input: string;
	try {
		input = readFileSync(inputPath, 'utf-8');
	} catch (error) {
		if (isNodeError(error)) {
			return err(`Failed to read input: ${error.message}`);
		}
		return err(`Failed to read input: ${String(error)}`);
	}

	// Load data if present (may be null for failed runs)
	let data: unknown | null = null;
	if (existsSync(dataPath)) {
		try {
			const dataContent = readFileSync(dataPath, 'utf-8');
			data = JSON.parse(dataContent);
		} catch (error) {
			return err(`Failed to parse ${DATA_FILENAME}: ${String(error)}`);
		}
	}

	// Load analysis if present (may be null for failed runs)
	let analysis: AnalysisOutput | null = null;
	if (existsSync(analysisPath)) {
		try {
			const analysisContent = readFileSync(analysisPath, 'utf-8');
			const analysisParsed = JSON.parse(analysisContent);
			analysis = analysisParsed;
		} catch (error) {
			return err(`Failed to parse ${ANALYSIS_FILENAME}: ${String(error)}`);
		}
	}

	// Load output if present (may be null for failed runs)
	let output: ComponentSpec | null = null;
	if (existsSync(outputPath)) {
		try {
			const outputContent = readFileSync(outputPath, 'utf-8');
			const outputParsed = JSON.parse(outputContent);
			output = outputParsed;
		} catch (error) {
			return err(`Failed to parse ${OUTPUT_FILENAME}: ${String(error)}`);
		}
	}

	// Load and parse logs.jsonl
	let logsContent: string;
	try {
		logsContent = readFileSync(logsPath, 'utf-8');
	} catch (error) {
		if (isNodeError(error)) {
			return err(`Failed to read logs: ${error.message}`);
		}
		return err(`Failed to read logs: ${String(error)}`);
	}

	const logLines = logsContent.split('\n').filter((line) => line.trim() !== '');
	const logs = [];

	// Parse each line; index is 0-based, so add 1 for human-readable line numbers in errors
	for (const [index, line] of logLines.entries()) {
		let parsed: unknown;

		try {
			parsed = JSON.parse(line);
		} catch (error) {
			return err(`Malformed JSON in logs at line ${index + 1}: ${String(error)}`);
		}

		const logResult = SigilLogEntrySchema.safeParse(parsed);
		if (!logResult.success) {
			return err(`Invalid SigilLogEntry at line ${index + 1}: ${logResult.error.message}`);
		}

		logs.push(logResult.data);
	}

	// Load and parse metadata
	let metadataContent: string;
	try {
		metadataContent = readFileSync(metadataPath, 'utf-8');
	} catch (error) {
		if (isNodeError(error)) {
			return err(`Failed to read metadata: ${error.message}`);
		}
		return err(`Failed to read metadata: ${String(error)}`);
	}

	let metadataParsed: unknown;
	try {
		metadataParsed = JSON.parse(metadataContent);
	} catch (error) {
		return err(`Failed to parse ${METADATA_FILENAME}: ${String(error)}`);
	}

	const metadataResult = RunMetadataSchema.safeParse(metadataParsed);
	if (!metadataResult.success) {
		return err(`Invalid metadata: ${metadataResult.error.message}`);
	}

	return ok({
		runId,
		input,
		data,
		analysis,
		output,
		logs,
		metadata: metadataResult.data,
	});
};

/**
 * Scans runs directory for all available runs
 *
 * Lists all subdirectories matching the run ID pattern, loads each run artifact,
 * and returns them sorted by startTimestamp (newest first).
 *
 * Skips runs that fail to load. If DEBUG_RUN_SCANNING=true, logs warnings for
 * failed loads.
 *
 * @returns Result containing array of RunArtifact objects sorted newest first
 *
 * @example
 * ```typescript
 * const result = scanRuns();
 * if (isOk(result)) {
 *   for (const run of result.data) {
 *     console.log(run.runId, run.metadata.agent);
 *   }
 * }
 * ```
 */
export const scanRuns = (): Result<RunArtifact[], string> => {
	const runsDir = getRunsDirectory();

	if (!existsSync(runsDir)) {
		return ok([]);
	}

	const entries = readdirSync(runsDir);
	const artifacts: RunArtifact[] = [];

	for (const entry of entries) {
		const entryPath = join(runsDir, entry);

		if (!statSync(entryPath).isDirectory()) {
			continue;
		}

		if (!RUN_ID_PATTERN.test(entry)) {
			continue;
		}

		const runId = entry;
		const loadResult = loadRunArtifact(runId);

		if (!loadResult.success) {
			if (DEBUG_RUN_SCANNING) {
				console.warn(`⚠ Skipping ${runId}: ${loadResult.error}`);
			}
			continue;
		}

		artifacts.push(loadResult.data);
	}

	// Sort by startTimestamp descending (newest first)
	artifacts.sort((a, b) => b.metadata.startTimestamp - a.metadata.startTimestamp);

	return ok(artifacts);
};
