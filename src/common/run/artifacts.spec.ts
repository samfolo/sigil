import {readFileSync, writeFileSync} from 'fs';
import {join} from 'path';

import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';

import type {AnalysisOutput} from '@sigil/src/agent/definitions/analyser';
import {isErr, isOk} from '@sigil/src/common/errors/result';
import {logEntry, VALID_COMPONENT_SPEC} from '@sigil/src/common/fixtures/fixture.mock';
import type {SigilLogEntry} from '@sigil/src/common/observability/logger';
import type {ComponentSpec} from '@sigil/src/lib/generated/types';
import {TempFSBuilder} from '@sigil/src/testing/fs';
import type {TempFSNode, TempFSResult} from '@sigil/src/testing/fs';

import {
	ANALYSIS_FILENAME,
	DATA_FILENAME,
	INPUT_FILENAME,
	LOGS_FILENAME,
	METADATA_FILENAME,
	OUTPUT_FILENAME,
	RUN_ID_PATTERN,
	loadRunArtifact,
	saveAnalysis,
	saveData,
	saveInput,
	saveMetadata,
	saveOutput,
	scanRuns,
} from './artifacts';
import {generateRunId} from './generateRunId';
import type {RunMetadata} from './schemas';

const VALID_ANALYSIS_OUTPUT: AnalysisOutput = {
	classification: {
		syntactic: 'json',
		semantic: 'Test analysis data',
	},
	parseResult: {
		valid: true,
		metadata: {
			structure: 'object',
			size: {
				bytes: 100,
				characters: 100,
				lines: 5,
			},
			depth: {value: 1, exact: true},
			topLevelKeys: [{value: 'id', exact: true}],
			totalKeyCount: 1,
		},
	},
	summary: 'This is a test analysis output with at least the minimum required length for validation',
	keyFields: [
		{
			path: '$.id',
			label: 'ID',
			description: 'Identifier field for test data entries',
			dataTypes: ['string'],
		},
	],
};

const VALID_RUN_METADATA: RunMetadata = {
	pipeline: 'TestPipeline',
	agents: ['TestAgent'],
	startTimestamp: 1000,
	endTimestamp: 2000,
	status: 'completed',
};

/**
 * Creates a run directory node with all required files
 */
const runDir = (
	runId: string,
	options: {
		input: string;
		analysis?: AnalysisOutput;
		output?: ComponentSpec;
		logs: string;
		metadata: RunMetadata;
	}
): TempFSNode => {
	const children: TempFSNode[] = [
		{type: 'file', name: INPUT_FILENAME, content: options.input},
		{type: 'file', name: LOGS_FILENAME, content: options.logs},
		{type: 'file', name: METADATA_FILENAME, content: JSON.stringify(options.metadata, null, 2)},
	];

	if (options.analysis) {
		children.push({
			type: 'file',
			name: ANALYSIS_FILENAME,
			content: JSON.stringify(options.analysis, null, 2),
		});
	}

	if (options.output) {
		children.push({
			type: 'file',
			name: OUTPUT_FILENAME,
			content: JSON.stringify(options.output, null, 2),
		});
	}

	return {type: 'directory', name: runId, children};
};

/**
 * Helper to save logs to a run directory
 *
 * Simulates Pino transport behaviour by writing logs as JSONL.
 */
const saveLogs = (tempFS: TempFSResult | null, runId: string, logs: SigilLogEntry[]): void => {
	const logsContent = logs.map((entry) => JSON.stringify(entry)).join('\n');
	const runDir = join(tempFS?.root ?? '', 'runs', runId);
	writeFileSync(join(runDir, LOGS_FILENAME), logsContent);
};

describe('generateRunId', () => {
	it('should generate unique IDs with correct format', () => {
		const ids = new Set<string>();
		const UNIQUENESS_TEST_RUN_COUNT = 100;

		for (let i = 0; i < UNIQUENESS_TEST_RUN_COUNT; i++) {
			const runId = generateRunId();

			expect(runId).toMatch(RUN_ID_PATTERN);
			ids.add(runId);
		}

		expect(ids.size).toBe(UNIQUENESS_TEST_RUN_COUNT);
	});
});

describe('artifact save and load functions', () => {
	let tempFS: TempFSResult | null = null;

	beforeEach(() => {
		const buildResult = new TempFSBuilder().build();
		expect(isOk(buildResult)).toBe(true);
		if (!isOk(buildResult)) {
			throw new Error(`Failed to create temp filesystem: ${buildResult.error}`);
		}
		tempFS = buildResult.data;
		vi.spyOn(process, 'cwd').mockImplementation(() => tempFS?.root ?? '/test');
		process.env.SIGIL_TEST_RUN_DIR = 'runs';
	});

	afterEach(() => {
		if (tempFS) {
			tempFS.cleanup();
			tempFS = null;
		}
		vi.mocked(process.cwd).mockRestore();
		delete process.env.SIGIL_TEST_RUN_DIR;
	});

	describe('saveInput', () => {
		it(`should save and load string input correctly to ${INPUT_FILENAME}`, () => {
			const runId = generateRunId();
			const inputData = 'test string data';

			const saveResult = saveInput(runId, inputData);
			expect(isOk(saveResult)).toBe(true);

			// Save minimal required files for loading
			const logs = [logEntry({event: 'preprocessing_start', time: 1000})];
			saveMetadata(runId, VALID_RUN_METADATA);
			saveOutput(runId, VALID_COMPONENT_SPEC);
			saveAnalysis(runId, VALID_ANALYSIS_OUTPUT);
			saveLogs(tempFS, runId, logs);

			const loadResult = loadRunArtifact(runId);
			expect(isOk(loadResult)).toBe(true);
			if (!isOk(loadResult)) {
				return;
			}

			expect(loadResult.data.input).toBe(inputData);
		});

		it('should stringify JSON objects before saving', () => {
			const runId = generateRunId();
			const inputData = {key: 'value', nested: {data: 123}};

			const saveResult = saveInput(runId, inputData);
			expect(isOk(saveResult)).toBe(true);

			// Save minimal required files
			const logs = [logEntry({event: 'preprocessing_start', time: 1000})];
			saveMetadata(runId, VALID_RUN_METADATA);
			saveLogs(tempFS, runId, logs);

			const loadResult = loadRunArtifact(runId);
			expect(isOk(loadResult)).toBe(true);
			if (!isOk(loadResult)) {
				return;
			}

			expect(loadResult.data.input).toBe(JSON.stringify(inputData));
		});

		it('should create run directory automatically', () => {
			const runId = generateRunId();
			const inputData = 'test';

			const result = saveInput(runId, inputData);
			expect(isOk(result)).toBe(true);

			const runDir = join(tempFS?.root ?? '', 'runs', runId);
			const inputPath = join(runDir, INPUT_FILENAME);

			expect(readFileSync(inputPath, 'utf-8')).toBe(inputData);
		});
	});

	describe('saveAnalysis', () => {
		it(`should save and load analysis correctly to ${ANALYSIS_FILENAME}`, () => {
			const runId = generateRunId();
			const analysis: AnalysisOutput = {
				classification: {
					syntactic: 'csv',
					semantic: 'CSV data analysis with structured rows',
				},
				parseResult: {
					valid: true,
					metadata: {
						size: {
							bytes: 500,
							characters: 500,
							lines: 100,
						},
						rowCount: 100,
						columnCount: 5,
						columns: [
							{index: 0, content: {value: 'id', exact: true}},
							{index: 1, content: {value: 'name', exact: true}},
							{index: 2, content: {value: 'email', exact: true}},
							{index: 3, content: {value: 'age', exact: true}},
							{index: 4, content: {value: 'city', exact: true}},
						],
					},
				},
				summary: 'CSV data analysis with structured rows and columns representing tabular information with headers',
				keyFields: [{path: '$.id', label: 'ID', description: 'Unique identifier field', dataTypes: ['string']}],
			};

			const saveResult = saveAnalysis(runId, analysis);
			expect(isOk(saveResult)).toBe(true);

			// Save other required files
			saveInput(runId, 'test');
			saveMetadata(runId, VALID_RUN_METADATA);

			const logs = [logEntry({event: 'preprocessing_start', time: 1000})];
	
			saveLogs(tempFS, runId, logs);

			const loadResult = loadRunArtifact(runId);
			expect(isOk(loadResult)).toBe(true);
			if (!isOk(loadResult)) {
				return;
			}

			expect(loadResult.data.analysis).toEqual(analysis);
		});
	});

	describe('saveOutput', () => {
		it(`should save and load output correctly to ${OUTPUT_FILENAME}`, () => {
			const runId = generateRunId();
			const spec = VALID_COMPONENT_SPEC;

			const saveResult = saveOutput(runId, spec);
			expect(isOk(saveResult)).toBe(true);

			// Save other required files
			saveInput(runId, 'test');
			saveMetadata(runId, VALID_RUN_METADATA);

			const logs = [logEntry({event: 'preprocessing_start', time: 1000})];
	
			saveLogs(tempFS, runId, logs);

			const loadResult = loadRunArtifact(runId);
			expect(isOk(loadResult)).toBe(true);
			if (!isOk(loadResult)) {
				return;
			}

			expect(loadResult.data.output).toEqual(spec);
		});
	});

	describe('saveData', () => {
		it(`should save and load data correctly to ${DATA_FILENAME}`, () => {
			const runId = generateRunId();
			const parsedData = {
				items: ['item1', 'item2', 'item3'],
				count: 3,
				metadata: {source: 'test'},
			};

			const saveResult = saveData(runId, parsedData);
			expect(isOk(saveResult)).toBe(true);

			// Save other required files
			saveInput(runId, 'test');
			saveMetadata(runId, VALID_RUN_METADATA);

			const logs = [logEntry({event: 'preprocessing_start', time: 1000})];

			saveLogs(tempFS, runId, logs);

			const loadResult = loadRunArtifact(runId);
			expect(isOk(loadResult)).toBe(true);
			if (!isOk(loadResult)) {
				return;
			}

			expect(loadResult.data.data).toEqual(parsedData);
		});

		it('should handle array data', () => {
			const runId = generateRunId();
			const parsedData = [
				['id', 'name', 'email'],
				['1', 'Alice', 'alice@example.com'],
				['2', 'Bob', 'bob@example.com'],
			];

			const saveResult = saveData(runId, parsedData);
			expect(isOk(saveResult)).toBe(true);

			// Save other required files
			saveInput(runId, 'test');
			saveMetadata(runId, VALID_RUN_METADATA);

			const logs = [logEntry({event: 'preprocessing_start', time: 1000})];

			saveLogs(tempFS, runId, logs);

			const loadResult = loadRunArtifact(runId);
			expect(isOk(loadResult)).toBe(true);
			if (!isOk(loadResult)) {
				return;
			}

			expect(loadResult.data.data).toEqual(parsedData);
		});

		it('should return error when write fails', () => {
			const runId = '/invalid/path/run123';
			const parsedData = {test: 'data'};

			const result = saveData(runId, parsedData);
			expect(isErr(result)).toBe(true);

			if (isErr(result)) {
				expect(result.error).toContain('Failed to write data');
			}
		});
	});

	describe('saveMetadata', () => {
		it(`should save and load metadata correctly to ${METADATA_FILENAME}`, () => {
			const runId = generateRunId();
			const metadata: RunMetadata = {
				pipeline: 'DataProcessingPipeline',
				agents: ['Analyser', 'GenerateSigilIR'],
				startTimestamp: 1699000000000,
				endTimestamp: 1699000060000,
				status: 'completed',
			};

			const saveResult = saveMetadata(runId, metadata);
			expect(isOk(saveResult)).toBe(true);

			// Save other required files
			saveInput(runId, 'test');

			const logs = [logEntry({event: 'preprocessing_start', time: 1000})];
	
			saveLogs(tempFS, runId, logs);

			const loadResult = loadRunArtifact(runId);
			expect(isOk(loadResult)).toBe(true);
			if (!isOk(loadResult)) {
				return;
			}

			expect(loadResult.data.metadata).toEqual(metadata);
		});

		it('should handle null endTimestamp for crashed runs', () => {
			const runId = generateRunId();
			const metadata: RunMetadata = {
				pipeline: 'TestPipeline',
				agents: [],
				startTimestamp: 1699000000000,
				endTimestamp: null,
				status: 'failed',
			};

			const saveResult = saveMetadata(runId, metadata);
			expect(isOk(saveResult)).toBe(true);

			// Save other required files
			saveInput(runId, 'test');

			const logs = [logEntry({event: 'preprocessing_start', time: 1000})];
	
			saveLogs(tempFS, runId, logs);

			const loadResult = loadRunArtifact(runId);
			expect(isOk(loadResult)).toBe(true);
			if (!isOk(loadResult)) {
				return;
			}

			expect(loadResult.data.metadata.endTimestamp).toBeNull();
			expect(loadResult.data.metadata.status).toBe('failed');
		});
	});
});

describe('loadRunArtifact', () => {
	let tempFS: TempFSResult | null = null;

	beforeEach(() => {
		vi.spyOn(process, 'cwd').mockImplementation(() => tempFS?.root ?? '/test');
		process.env.SIGIL_TEST_RUN_DIR = 'runs';
	});

	afterEach(() => {
		if (tempFS) {
			tempFS.cleanup();
			tempFS = null;
		}
		vi.mocked(process.cwd).mockRestore();
		delete process.env.SIGIL_TEST_RUN_DIR;
	});

	it('should return error for non-existent run directory', () => {
		const buildResult = new TempFSBuilder().build();
		expect(isOk(buildResult)).toBe(true);
		if (!isOk(buildResult)) {
			return;
		}
		tempFS = buildResult.data;

		const result = loadRunArtifact('20251108-143022000-a3f9');

		expect(isErr(result)).toBe(true);
		if (!isErr(result)) {
			return;
		}

		expect(result.error).toContain('Run directory not found');
	});

	it(`should return error when ${INPUT_FILENAME} is missing`, () => {
		const logs = [logEntry({event: 'preprocessing_start', time: 1000})];
		const logsContent = logs.map((entry) => JSON.stringify(entry)).join('\n');

		const buildResult = new TempFSBuilder()
			.withDirectory('runs', [
				{
					type: 'directory',
					name: '20251108-143022000-a3f9',
					children: [
						{type: 'file', name: LOGS_FILENAME, content: logsContent},
						{type: 'file', name: METADATA_FILENAME, content: JSON.stringify(VALID_RUN_METADATA)},
					],
				},
			])
			.build();

		expect(isOk(buildResult)).toBe(true);
		if (!isOk(buildResult)) {
			return;
		}
		tempFS = buildResult.data;

		const result = loadRunArtifact('20251108-143022000-a3f9');

		expect(isErr(result)).toBe(true);
		if (!isErr(result)) {
			return;
		}

		expect(result.error).toContain(`Missing ${INPUT_FILENAME}`);
	});

	it(`should return error when ${LOGS_FILENAME} is missing`, () => {
		const buildResult = new TempFSBuilder()
			.withDirectory('runs', [
				{
					type: 'directory',
					name: '20251108-143022000-a3f9',
					children: [
						{type: 'file', name: INPUT_FILENAME, content: 'test'},
						{type: 'file', name: METADATA_FILENAME, content: JSON.stringify(VALID_RUN_METADATA)},
					],
				},
			])
			.build();

		expect(isOk(buildResult)).toBe(true);
		if (!isOk(buildResult)) {
			return;
		}
		tempFS = buildResult.data;

		const result = loadRunArtifact('20251108-143022000-a3f9');

		expect(isErr(result)).toBe(true);
		if (!isErr(result)) {
			return;
		}

		expect(result.error).toContain(`Missing ${LOGS_FILENAME}`);
	});

	it(`should return error when ${METADATA_FILENAME} is missing`, () => {
		const logs = [logEntry({event: 'preprocessing_start', time: 1000})];
		const logsContent = logs.map((entry) => JSON.stringify(entry)).join('\n');

		const buildResult = new TempFSBuilder()
			.withDirectory('runs', [
				{
					type: 'directory',
					name: '20251108-143022000-a3f9',
					children: [
						{type: 'file', name: INPUT_FILENAME, content: 'test'},
						{type: 'file', name: LOGS_FILENAME, content: logsContent},
					],
				},
			])
			.build();

		expect(isOk(buildResult)).toBe(true);
		if (!isOk(buildResult)) {
			return;
		}
		tempFS = buildResult.data;

		const result = loadRunArtifact('20251108-143022000-a3f9');

		expect(isErr(result)).toBe(true);
		if (!isErr(result)) {
			return;
		}

		expect(result.error).toContain(`Missing ${METADATA_FILENAME}`);
	});

	it('should load run with no analysis (Analyser failed)', () => {
		const logs = [
			logEntry({event: 'preprocessing_start', time: 1000}),
			logEntry({event: 'unexpected_error', time: 1100, data: {error: 'Test error'}}),
		];
		const logsContent = logs.map((entry) => JSON.stringify(entry)).join('\n');

		const buildResult = new TempFSBuilder()
			.withDirectory('runs', [
				runDir('20251108-143022000-a3f9', {
					input: 'test input',
					logs: logsContent,
					metadata: {...VALID_RUN_METADATA, status: 'failed'},
				}),
			])
			.build();

		expect(isOk(buildResult)).toBe(true);
		if (!isOk(buildResult)) {
			return;
		}
		tempFS = buildResult.data;

		const result = loadRunArtifact('20251108-143022000-a3f9');

		expect(isOk(result)).toBe(true);
		if (!isOk(result)) {
			return;
		}

		expect(result.data.analysis).toBeNull();
		expect(result.data.output).toBeNull();
		expect(result.data.metadata.status).toBe('failed');
	});

	it('should load run with analysis but no output (GenerateSigilIR failed)', () => {
		const logs = [
			logEntry({event: 'preprocessing_start', time: 1000}),
			logEntry({event: 'unexpected_error', time: 1100, data: {error: 'Test error'}}),
		];
		const logsContent = logs.map((entry) => JSON.stringify(entry)).join('\n');

		const buildResult = new TempFSBuilder()
			.withDirectory('runs', [
				runDir('20251108-143022000-a3f9', {
					input: 'test input',
					analysis: VALID_ANALYSIS_OUTPUT,
					logs: logsContent,
					metadata: {...VALID_RUN_METADATA, status: 'failed'},
				}),
			])
			.build();

		expect(isOk(buildResult)).toBe(true);
		if (!isOk(buildResult)) {
			return;
		}
		tempFS = buildResult.data;

		const result = loadRunArtifact('20251108-143022000-a3f9');

		expect(isOk(result)).toBe(true);
		if (!isOk(result)) {
			return;
		}

		expect(result.data.analysis).toEqual(VALID_ANALYSIS_OUTPUT);
		expect(result.data.output).toBeNull();
		expect(result.data.metadata.status).toBe('failed');
	});

	it('should load complete successful run', () => {
		const logs = [
			logEntry({event: 'preprocessing_start', time: 1000}),
			logEntry({event: 'spec_generated', time: 1100, data: {spec: VALID_COMPONENT_SPEC}}),
		];
		const logsContent = logs.map((entry) => JSON.stringify(entry)).join('\n');

		const buildResult = new TempFSBuilder()
			.withDirectory('runs', [
				runDir('20251108-143022000-a3f9', {
					input: 'test input',
					analysis: VALID_ANALYSIS_OUTPUT,
					output: VALID_COMPONENT_SPEC,
					logs: logsContent,
					metadata: VALID_RUN_METADATA,
				}),
			])
			.build();

		expect(isOk(buildResult)).toBe(true);
		if (!isOk(buildResult)) {
			return;
		}
		tempFS = buildResult.data;

		const result = loadRunArtifact('20251108-143022000-a3f9');

		expect(isOk(result)).toBe(true);
		if (!isOk(result)) {
			return;
		}

		expect(result.data.runId).toBe('20251108-143022000-a3f9');
		expect(result.data.input).toBe('test input');
		expect(result.data.analysis).toEqual(VALID_ANALYSIS_OUTPUT);
		expect(result.data.output).toEqual(VALID_COMPONENT_SPEC);
		expect(result.data.logs).toHaveLength(2);
		expect(result.data.metadata).toEqual(VALID_RUN_METADATA);
	});
});

describe('scanRuns', () => {
	let tempFS: TempFSResult | null = null;

	beforeEach(() => {
		vi.spyOn(process, 'cwd').mockImplementation(() => tempFS?.root ?? '/test');
		process.env.SIGIL_TEST_RUN_DIR = 'runs';
	});

	afterEach(() => {
		if (tempFS) {
			tempFS.cleanup();
			tempFS = null;
		}
		vi.mocked(process.cwd).mockRestore();
		delete process.env.SIGIL_TEST_RUN_DIR;
	});

	it('should return empty array when runs directory does not exist', () => {
		const buildResult = new TempFSBuilder().build();
		expect(isOk(buildResult)).toBe(true);
		if (!isOk(buildResult)) {
			return;
		}
		tempFS = buildResult.data;

		const result = scanRuns();

		expect(isOk(result)).toBe(true);
		if (!isOk(result)) {
			return;
		}

		expect(result.data).toHaveLength(0);
	});

	it('should return empty array when runs directory is empty', () => {
		const buildResult = new TempFSBuilder().withDirectory('runs', []).build();
		expect(isOk(buildResult)).toBe(true);
		if (!isOk(buildResult)) {
			return;
		}
		tempFS = buildResult.data;

		const result = scanRuns();

		expect(isOk(result)).toBe(true);
		if (!isOk(result)) {
			return;
		}

		expect(result.data).toHaveLength(0);
	});

	it('should skip invalid directory names', () => {
		const logs = [logEntry({event: 'preprocessing_start', time: 1000})];
		const logsContent = logs.map((entry) => JSON.stringify(entry)).join('\n');

		const buildResult = new TempFSBuilder()
			.withDirectory('runs', [
				runDir('20251108-143022000-a3f9', {
					input: 'test',
					logs: logsContent,
					metadata: VALID_RUN_METADATA,
				}),
				{type: 'directory', name: 'invalid-name', children: []},
				{type: 'directory', name: 'random', children: []},
			])
			.build();

		expect(isOk(buildResult)).toBe(true);
		if (!isOk(buildResult)) {
			return;
		}
		tempFS = buildResult.data;

		const result = scanRuns();

		expect(isOk(result)).toBe(true);
		if (!isOk(result)) {
			return;
		}

		expect(result.data).toHaveLength(1);
		expect(result.data.at(0)?.runId).toBe('20251108-143022000-a3f9');
	});

	it('should skip runs with missing required files', () => {
		const logs = [logEntry({event: 'preprocessing_start', time: 1000})];
		const logsContent = logs.map((entry) => JSON.stringify(entry)).join('\n');

		const buildResult = new TempFSBuilder()
			.withDirectory('runs', [
				runDir('20251108-143022000-a3f9', {
					input: 'test',
					logs: logsContent,
					metadata: VALID_RUN_METADATA,
				}),
				{
					type: 'directory',
					name: '20251108-143023-b4e0',
					children: [
						{type: 'file', name: LOGS_FILENAME, content: logsContent},
						{type: 'file', name: METADATA_FILENAME, content: JSON.stringify(VALID_RUN_METADATA)},
					],
				},
			])
			.build();

		expect(isOk(buildResult)).toBe(true);
		if (!isOk(buildResult)) {
			return;
		}
		tempFS = buildResult.data;

		const result = scanRuns();

		expect(isOk(result)).toBe(true);
		if (!isOk(result)) {
			return;
		}

		expect(result.data).toHaveLength(1);
		expect(result.data.at(0)?.runId).toBe('20251108-143022000-a3f9');
	});

	it('should sort runs by startTimestamp descending (newest first)', () => {
		const logs = [logEntry({event: 'preprocessing_start', time: 1000})];
		const logsContent = logs.map((entry) => JSON.stringify(entry)).join('\n');

		const buildResult = new TempFSBuilder()
			.withDirectory('runs', [
				runDir('20251108-143022000-a3f9', {
					input: 'test1',
					logs: logsContent,
					metadata: {...VALID_RUN_METADATA, startTimestamp: 1000},
				}),
				runDir('20251108-143023000-b4e0', {
					input: 'test2',
					logs: logsContent,
					metadata: {...VALID_RUN_METADATA, startTimestamp: 3000},
				}),
				runDir('20251108-143024000-c5f1', {
					input: 'test3',
					logs: logsContent,
					metadata: {...VALID_RUN_METADATA, startTimestamp: 2000},
				}),
			])
			.build();

		expect(isOk(buildResult)).toBe(true);
		if (!isOk(buildResult)) {
			return;
		}
		tempFS = buildResult.data;

		const result = scanRuns();

		expect(isOk(result)).toBe(true);
		if (!isOk(result)) {
			return;
		}

		expect(result.data).toHaveLength(3);
		expect(result.data.at(0)?.runId).toBe('20251108-143023000-b4e0');
		expect(result.data.at(0)?.metadata.startTimestamp).toBe(3000);
		expect(result.data.at(1)?.runId).toBe('20251108-143024000-c5f1');
		expect(result.data.at(1)?.metadata.startTimestamp).toBe(2000);
		expect(result.data.at(2)?.runId).toBe('20251108-143022000-a3f9');
		expect(result.data.at(2)?.metadata.startTimestamp).toBe(1000);
	});

	it('should handle runs at different completion stages', () => {
		const logs = [logEntry({event: 'preprocessing_start', time: 1000})];
		const logsContent = logs.map((entry) => JSON.stringify(entry)).join('\n');

		const buildResult = new TempFSBuilder()
			.withDirectory('runs', [
				// Complete run
				runDir('20251108-143022000-a3f9', {
					input: 'test1',
					analysis: VALID_ANALYSIS_OUTPUT,
					output: VALID_COMPONENT_SPEC,
					logs: logsContent,
					metadata: {...VALID_RUN_METADATA, startTimestamp: 3000},
				}),
				// Failed before Analyser
				runDir('20251108-143023000-b4e0', {
					input: 'test2',
					logs: logsContent,
					metadata: {...VALID_RUN_METADATA, startTimestamp: 2000, status: 'failed'},
				}),
				// Failed after Analyser
				runDir('20251108-143024000-c5f1', {
					input: 'test3',
					analysis: VALID_ANALYSIS_OUTPUT,
					logs: logsContent,
					metadata: {...VALID_RUN_METADATA, startTimestamp: 1000, status: 'failed'},
				}),
			])
			.build();

		expect(isOk(buildResult)).toBe(true);
		if (!isOk(buildResult)) {
			return;
		}
		tempFS = buildResult.data;

		const result = scanRuns();

		expect(isOk(result)).toBe(true);
		if (!isOk(result)) {
			return;
		}

		expect(result.data).toHaveLength(3);

		// Check complete run
		expect(result.data.at(0)?.analysis).toEqual(VALID_ANALYSIS_OUTPUT);
		expect(result.data.at(0)?.output).toEqual(VALID_COMPONENT_SPEC);

		// Check run that failed before Analyser
		expect(result.data.at(1)?.analysis).toBeNull();
		expect(result.data.at(1)?.output).toBeNull();

		// Check run that failed after Analyser
		expect(result.data.at(2)?.analysis).toEqual(VALID_ANALYSIS_OUTPUT);
		expect(result.data.at(2)?.output).toBeNull();
	});
});
