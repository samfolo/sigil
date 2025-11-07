import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';

import {isOk} from '@sigil/src/common/errors/result';
import type {ComponentSpec} from '@sigil/src/lib/generated/types/specification';
import type {TempFSResult} from '@sigil/src/testing/fs';
import {TempFSBuilder} from '@sigil/src/testing/fs';

import {dateDir, logEntry, logFile} from '../fixture.mock';

import {scanFixtureDirectories} from './scanFixtures';

const VALID_COMPONENT_SPEC: ComponentSpec = {
	id: 'test-spec',
	created_at: '2025-11-07T10:00:00Z',
	title: 'Test',
	data_shape: {
		type: 'array',
		items: {type: 'object', properties: {}},
	},
	root: {component: 'data-table', props: {columns: []}},
};

describe('scanFixtureDirectories', () => {
	let tempFS: TempFSResult | null = null;

	beforeEach(() => {
		vi.spyOn(process, 'cwd').mockImplementation(() => tempFS?.root ?? '/test');
	});

	afterEach(() => {
		if (tempFS) {
			tempFS.cleanup();
			tempFS = null;
		}
		vi.mocked(process.cwd).mockRestore();
	});

	describe('with valid fixtures in both directories', () => {
		it('should return metadata from logs and fixtures sorted by timestamp', () => {
			const buildResult = new TempFSBuilder()
				.withDirectory('logs', [
					dateDir('2025-11-07', [
						logFile('fixture1.jsonl', [
							logEntry({event: 'preprocessing_start', time: 1000}),
							logEntry({event: 'spec_generated', time: 1100, data: {spec: VALID_COMPONENT_SPEC}}),
						]),
						logFile('fixture2.jsonl', [
							logEntry({event: 'preprocessing_start', time: 2000}),
							logEntry({event: 'spec_generated', time: 2100, data: {spec: VALID_COMPONENT_SPEC}}),
						]),
					]),
				])
				.withDirectory('fixtures', [
					dateDir('2025-11-06', [
						logFile('fixture3.jsonl', [
							logEntry({event: 'preprocessing_start', time: 1500}),
							logEntry({event: 'spec_generated', time: 1600, data: {spec: VALID_COMPONENT_SPEC}}),
						]),
					]),
				])
				.build();

			expect(isOk(buildResult)).toBe(true);
			if (!isOk(buildResult)) {
				return;
			}

			tempFS = buildResult.data;

			const result = scanFixtureDirectories();

			expect(isOk(result)).toBe(true);
			if (!isOk(result)) {
				return;
			}

			expect(result.data).toHaveLength(3);
			expect(result.data.at(0)?.id).toBe('logs/fixture2');
			expect(result.data.at(0)?.timestamp).toBe(2000);
			expect(result.data.at(0)?.date).toBe('2025-11-07');
			expect(result.data.at(1)?.id).toBe('fixtures/fixture3');
			expect(result.data.at(1)?.timestamp).toBe(1500);
			expect(result.data.at(2)?.id).toBe('logs/fixture1');
			expect(result.data.at(2)?.timestamp).toBe(1000);
		});
	});

	describe('with invalid date directory names', () => {
		it('should skip directories not matching yyyy-MM-dd pattern', () => {
			const buildResult = new TempFSBuilder()
				.withDirectory('logs', [
					dateDir('2025-11-07', [
						logFile('valid.jsonl', [
							logEntry({event: 'preprocessing_start', time: 1000}),
							logEntry({event: 'spec_generated', time: 1100, data: {spec: VALID_COMPONENT_SPEC}}),
						]),
					]),
					{type: 'directory', name: 'invalid-date', children: []},
					{type: 'directory', name: 'random', children: []},
				])
				.withDirectory('fixtures', [])
				.build();

			expect(isOk(buildResult)).toBe(true);
			if (!isOk(buildResult)) {
				return;
			}

			tempFS = buildResult.data;

			const result = scanFixtureDirectories();

			expect(isOk(result)).toBe(true);
			if (!isOk(result)) {
				return;
			}

			expect(result.data).toHaveLength(1);
			expect(result.data.at(0)?.date).toBe('2025-11-07');
		});
	});

	describe('with non-jsonl files', () => {
		it('should skip files without .jsonl extension', () => {
			const buildResult = new TempFSBuilder()
				.withDirectory('logs', [
					dateDir('2025-11-07', [
						logFile('valid.jsonl', [
							logEntry({event: 'preprocessing_start', time: 1000}),
							logEntry({event: 'spec_generated', time: 1100, data: {spec: VALID_COMPONENT_SPEC}}),
						]),
						{type: 'file', name: 'other.txt', content: 'not a log file'},
						{type: 'file', name: 'data.json', content: '{}'},
					]),
				])
				.withDirectory('fixtures', [])
				.build();

			expect(isOk(buildResult)).toBe(true);
			if (!isOk(buildResult)) {
				return;
			}

			tempFS = buildResult.data;

			const result = scanFixtureDirectories();

			expect(isOk(result)).toBe(true);
			if (!isOk(result)) {
				return;
			}

			expect(result.data).toHaveLength(1);
			expect(result.data.at(0)?.id).toBe('logs/valid');
		});
	});

	describe('with files that fail to parse', () => {
		it('should skip files with parse errors', () => {
			const buildResult = new TempFSBuilder()
				.withDirectory('logs', [
					dateDir('2025-11-07', [
						logFile('good.jsonl', [
							logEntry({event: 'preprocessing_start', time: 1000}),
							logEntry({event: 'spec_generated', time: 1100, data: {spec: VALID_COMPONENT_SPEC}}),
						]),
						{type: 'file', name: 'bad.jsonl', content: 'invalid content'},
					]),
				])
				.withDirectory('fixtures', [])
				.build();

			expect(isOk(buildResult)).toBe(true);
			if (!isOk(buildResult)) {
				return;
			}

			tempFS = buildResult.data;

			const result = scanFixtureDirectories();

			expect(isOk(result)).toBe(true);
			if (!isOk(result)) {
				return;
			}

			expect(result.data).toHaveLength(1);
			expect(result.data.at(0)?.id).toBe('logs/good');
		});
	});

	describe('with files where spec extraction fails', () => {
		it('should skip files without spec_generated events', () => {
			const buildResult = new TempFSBuilder()
				.withDirectory('logs', [
					dateDir('2025-11-07', [
						logFile('with-spec.jsonl', [
							logEntry({event: 'preprocessing_start', time: 1000}),
							logEntry({event: 'spec_generated', time: 1100, data: {spec: VALID_COMPONENT_SPEC}}),
						]),
						logFile('no-spec.jsonl', [
							logEntry({event: 'preprocessing_start', time: 2000}),
							logEntry({event: 'chunking_complete', time: 2100}),
						]),
					]),
				])
				.withDirectory('fixtures', [])
				.build();

			expect(isOk(buildResult)).toBe(true);
			if (!isOk(buildResult)) {
				return;
			}

			tempFS = buildResult.data;

			const result = scanFixtureDirectories();

			expect(isOk(result)).toBe(true);
			if (!isOk(result)) {
				return;
			}

			expect(result.data).toHaveLength(1);
			expect(result.data.at(0)?.id).toBe('logs/with-spec');
		});
	});

	describe('with empty log files', () => {
		it('should skip files with no log entries', () => {
			const buildResult = new TempFSBuilder()
				.withDirectory('logs', [
					dateDir('2025-11-07', [
						logFile('good.jsonl', [
							logEntry({event: 'preprocessing_start', time: 1000}),
							logEntry({event: 'spec_generated', time: 1100, data: {spec: VALID_COMPONENT_SPEC}}),
						]),
						{type: 'file', name: 'empty.jsonl', content: ''},
					]),
				])
				.withDirectory('fixtures', [])
				.build();

			expect(isOk(buildResult)).toBe(true);
			if (!isOk(buildResult)) {
				return;
			}

			tempFS = buildResult.data;

			const result = scanFixtureDirectories();

			expect(isOk(result)).toBe(true);
			if (!isOk(result)) {
				return;
			}

			expect(result.data).toHaveLength(1);
			expect(result.data.at(0)?.id).toBe('logs/good');
		});
	});

	describe('with missing directories', () => {
		it('should return empty array when directories do not exist', () => {
			const buildResult = new TempFSBuilder().build();

			expect(isOk(buildResult)).toBe(true);
			if (!isOk(buildResult)) {
				return;
			}

			tempFS = buildResult.data;

			const result = scanFixtureDirectories();

			expect(isOk(result)).toBe(true);
			if (!isOk(result)) {
				return;
			}

			expect(result.data).toHaveLength(0);
		});
	});

	describe('with empty directories', () => {
		it('should return empty array when directories are empty', () => {
			const buildResult = new TempFSBuilder()
				.withDirectory('logs', [])
				.withDirectory('fixtures', [])
				.build();

			expect(isOk(buildResult)).toBe(true);
			if (!isOk(buildResult)) {
				return;
			}

			tempFS = buildResult.data;

			const result = scanFixtureDirectories();

			expect(isOk(result)).toBe(true);
			if (!isOk(result)) {
				return;
			}

			expect(result.data).toHaveLength(0);
		});
	});
});
