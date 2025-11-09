import {existsSync, readFileSync} from 'fs';
import {join} from 'path';

import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';

import {isErr} from '@sigil/src/common/errors/result';
import {LOGS_FILENAME} from '@sigil/src/common/run';
import {TempFSBuilder} from '@sigil/src/testing/fs';
import type {TempFSResult} from '@sigil/src/testing/fs';

import {SigilLogEntrySchema} from './events';
import {createSigilLogger} from './logger';

const POLL_INTERVAL_MS = 50;
const MAX_POLL_ATTEMPTS = 40;

interface ParsedLogEntry {
	agent: string;
	event: string;
	msg: string;
	traceId: string;
	level: number;
}

describe('createSigilLogger', () => {
	const TEST_AGENT_NAME = 'TestAgent';
	let originalEnv: NodeJS.ProcessEnv;
	let tempFS: TempFSResult | null = null;

	beforeEach(() => {
		// Store original environment
		originalEnv = {...process.env};

		// Create temp directory for test runs
		const fsResult = new TempFSBuilder().build();
		if (isErr(fsResult)) {
			throw new Error(`Failed to create temp filesystem: ${fsResult.error}`);
		}
		tempFS = fsResult.data;

		// Point run directory to temp location
		process.env.SIGIL_TEST_RUN_DIR = tempFS.root;
	});

	afterEach(() => {
		// Restore original environment
		process.env = originalEnv;
		vi.unstubAllEnvs();

		// Clean up temp filesystem
		if (tempFS) {
			tempFS.cleanup();
			tempFS = null;
		}
	});

	/**
	 * Polls for log file existence and validates content
	 *
	 * More robust than fixed timeouts - handles varying write speeds across systems
	 */
	const waitForLogFile = async (runId: string, minLines: number = 1): Promise<void> => {
		if (!tempFS) {
			throw new Error('Temp filesystem not initialised');
		}

		const logPath = join(tempFS.root, runId, LOGS_FILENAME);

		for (let attempt = 0; attempt < MAX_POLL_ATTEMPTS; attempt++) {
			if (existsSync(logPath)) {
				const content = readFileSync(logPath, 'utf-8').trim();
				const lines = content.split('\n').filter((line) => line.length > 0);

				if (lines.length >= minLines) {
					return;
				}
			}

			await new Promise((resolve) => {
				setTimeout(resolve, POLL_INTERVAL_MS);
			});
		}

		throw new Error(
			`Log file not found or incomplete after ${MAX_POLL_ATTEMPTS * POLL_INTERVAL_MS}ms`
		);
	};

	const readLogFile = (runId: string): string[] => {
		if (!tempFS) {
			throw new Error('Temp filesystem not initialised');
		}

		const logPath = join(tempFS.root, runId, LOGS_FILENAME);
		const content = readFileSync(logPath, 'utf-8');
		return content
			.trim()
			.split('\n')
			.filter((line) => line.length > 0);
	};

	/**
	 * Parses log lines using Zod schema for type safety
	 */
	const parseLogLines = (lines: string[]): ParsedLogEntry[] => {
		const parsed: ParsedLogEntry[] = [];

		for (const line of lines) {
			const result = SigilLogEntrySchema.safeParse(JSON.parse(line));
			if (result.success) {
				parsed.push({
					agent: result.data.agent,
					event: result.data.event,
					msg: result.data.msg,
					traceId: result.data.traceId,
					level: result.data.level,
				});
			}
		}

		return parsed;
	};

	it('should write to run directory when persist is true (default)', async () => {
		const runId = 'test-001';

		const logger = createSigilLogger(TEST_AGENT_NAME, runId);

		logger.info({event: 'preprocessing_start'}, 'Test message');
		logger.debug({event: 'embedding_progress', data: {current: 1, total: 10}}, 'Debug message');

		await waitForLogFile(runId, 2);

		if (!tempFS) {
			throw new Error('Temp filesystem not initialised');
		}

		const logPath = join(tempFS.root, runId, LOGS_FILENAME);
		expect(existsSync(logPath)).toBe(true);

		const lines = readLogFile(runId);
		const logs = parseLogLines(lines);

		// Verify agent name is correct
		expect(logs.every((log) => log.agent === TEST_AGENT_NAME)).toBe(true);

		// Verify events were logged
		const events = logs.map((log) => log.event);
		expect(events).toContain('preprocessing_start');
		expect(events).toContain('embedding_progress');

		// Verify all logs have the same traceId
		const traceIds = logs.map((log) => log.traceId);
		expect(new Set(traceIds).size).toBe(1);
	});

	it('should write to run directory when persist is explicitly true', async () => {
		const runId = 'test-002';

		const logger = createSigilLogger(TEST_AGENT_NAME, runId, {persist: true});

		logger.info({event: 'preprocessing_start'}, 'Test message');

		await waitForLogFile(runId);

		if (!tempFS) {
			throw new Error('Temp filesystem not initialised');
		}

		const logPath = join(tempFS.root, runId, LOGS_FILENAME);
		expect(existsSync(logPath)).toBe(true);
	});

	it('should not write to disk when persist is false', async () => {
		const runId = 'test-003';

		const logger = createSigilLogger(TEST_AGENT_NAME, runId, {persist: false});

		logger.info({event: 'preprocessing_start'}, 'Test message');

		// Wait a reasonable time to ensure no writes occur
		await new Promise((resolve) => {
			setTimeout(resolve, 300);
		});

		if (!tempFS) {
			throw new Error('Temp filesystem not initialised');
		}

		const logPath = join(tempFS.root, runId, LOGS_FILENAME);
		expect(existsSync(logPath)).toBe(false);
	});

	it('should use console-only in production regardless of persist option', async () => {
		vi.stubEnv('NODE_ENV', 'production');
		const runId = 'test-004';

		const logger = createSigilLogger(TEST_AGENT_NAME, runId, {persist: true});

		logger.info({event: 'preprocessing_start'}, 'Test message');

		// Wait to ensure no writes happen
		await new Promise((resolve) => {
			setTimeout(resolve, 300);
		});

		if (!tempFS) {
			throw new Error('Temp filesystem not initialised');
		}

		const logPath = join(tempFS.root, runId, LOGS_FILENAME);
		expect(existsSync(logPath)).toBe(false);
	});

	it('should respect LOG_LEVEL environment variable for console, but log all levels to file', async () => {
		vi.stubEnv('LOG_LEVEL', 'info');
		const runId = 'test-005';

		const logger = createSigilLogger(TEST_AGENT_NAME, runId);

		// Log at different levels
		logger.trace({event: 'embedding_progress', data: {current: 1, total: 10}}, 'Trace message');
		logger.debug({event: 'chunking_complete', data: {chunkCount: 5, dataSizeKB: '100'}}, 'Debug message');
		logger.info({event: 'preprocessing_start'}, 'Info message');
		logger.warn({event: 'unexpected_error', data: {error: 'test warning'}}, 'Warn message');

		await waitForLogFile(runId, 4);

		const lines = readLogFile(runId);
		const logs = parseLogLines(lines);
		const events = logs.map((log) => log.event);

		// File transport uses trace level, so all messages should be in file
		expect(events).toContain('embedding_progress');
		expect(events).toContain('chunking_complete');
		expect(events).toContain('preprocessing_start');
		expect(events).toContain('unexpected_error');
	});

	it('should create child logger that writes to same file with different agent name', async () => {
		const runId = 'test-006';

		const logger = createSigilLogger(TEST_AGENT_NAME, runId);
		const childLogger = logger.child('ChildAgent');

		logger.info({event: 'preprocessing_start'}, 'Parent message');
		childLogger.info({event: 'client_disconnected'}, 'Child message');

		await waitForLogFile(runId, 2);

		const lines = readLogFile(runId);
		const logs = parseLogLines(lines);

		expect(logs.length).toBe(2);

		const parentLog = logs.find((log) => log.event === 'preprocessing_start');
		const childLog = logs.find((log) => log.event === 'client_disconnected');

		expect(parentLog).toBeDefined();
		expect(childLog).toBeDefined();

		if (!parentLog || !childLog) {
			throw new Error('Expected logs not found');
		}

		// Verify agent names are different
		expect(parentLog.agent).toBe(TEST_AGENT_NAME);
		expect(childLog.agent).toBe('ChildAgent');

		// Verify they share the same traceId
		expect(parentLog.traceId).toBe(childLog.traceId);
	});

	it('should expose Pino flush method', async () => {
		const runId = 'test-007';

		const logger = createSigilLogger(TEST_AGENT_NAME, runId);

		logger.info({event: 'preprocessing_start'}, 'Test message');

		// Flush should be available and not throw
		expect(() => {
			logger.flush();
		}).not.toThrow();

		await waitForLogFile(runId);

		const lines = readLogFile(runId);
		expect(lines.length).toBeGreaterThan(0);
	});
});
