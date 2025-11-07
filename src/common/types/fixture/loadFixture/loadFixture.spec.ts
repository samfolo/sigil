import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';

import {isErr, isOk} from '@sigil/src/common/errors/result';
import type {ComponentSpec} from '@sigil/src/lib/generated/types/specification';
import type {TempFSResult} from '@sigil/src/testing/fs';
import {TempFSBuilder} from '@sigil/src/testing/fs';

import {dateDir, logEntry, logFile} from '../fixture.mock';

import {loadFixture} from './loadFixture';

const VALID_COMPONENT_SPEC: ComponentSpec = {
	id: 'test-spec',
	created_at: '2025-11-07T10:00:00Z',
	title: 'Test Spec',
	data_shape: 'hierarchical',
	description: 'Test component spec',
	root: {
		accessor_bindings: {},
		layout: {
			id: 'root-layout',
			type: 'stack',
			direction: 'vertical',
			spacing: 'normal',
			children: [],
		},
		nodes: {},
	},
};

describe('loadFixture', () => {
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

	describe('with valid fixture in logs directory', () => {
		it('should load complete fixture', () => {
			const buildResult = new TempFSBuilder()
				.withDirectory('logs', [
					dateDir('2025-11-07', [
						logFile('MyAgent-123.jsonl', [
							logEntry({event: 'preprocessing_start', time: 1000}),
							logEntry({event: 'spec_generated', time: 1100, data: {spec: VALID_COMPONENT_SPEC}}),
						]),
					]),
				])
				.build();

			expect(isOk(buildResult)).toBe(true);
			if (!isOk(buildResult)) {
				return;
			}

			tempFS = buildResult.data;

			const result = loadFixture('logs/MyAgent-123');

			expect(isOk(result)).toBe(true);
			if (!isOk(result)) {
				return;
			}

			expect(result.data.id).toBe('logs/MyAgent-123');
			expect(result.data.displayName).toBe('logs/MyAgent-123');
			expect(result.data.date).toBe('2025-11-07');
			expect(result.data.timestamp).toBe(1000);
			expect(result.data.spec).toEqual(VALID_COMPONENT_SPEC);
			expect(result.data.logs).toHaveLength(2);
		});
	});

	describe('with valid fixture in fixtures directory', () => {
		it('should load complete fixture', () => {
			const buildResult = new TempFSBuilder()
				.withDirectory('fixtures', [
					dateDir('2025-11-06', [
						logFile('example-fixture.jsonl', [
							logEntry({event: 'preprocessing_start', time: 2000}),
							logEntry({event: 'spec_generated', time: 2100, data: {spec: VALID_COMPONENT_SPEC}}),
						]),
					]),
				])
				.build();

			expect(isOk(buildResult)).toBe(true);
			if (!isOk(buildResult)) {
				return;
			}

			tempFS = buildResult.data;

			const result = loadFixture('fixtures/example-fixture');

			expect(isOk(result)).toBe(true);
			if (!isOk(result)) {
				return;
			}

			expect(result.data.id).toBe('fixtures/example-fixture');
			expect(result.data.date).toBe('2025-11-06');
			expect(result.data.timestamp).toBe(2000);
		});
	});

	describe('with invalid ID format', () => {
		it('should return error for missing prefix', () => {
			const buildResult = new TempFSBuilder().build();

			expect(isOk(buildResult)).toBe(true);
			if (!isOk(buildResult)) {
				return;
			}

			tempFS = buildResult.data;

			const result = loadFixture('invalid-id');

			expect(isErr(result)).toBe(true);
			if (!isErr(result)) {
				return;
			}

			expect(result.error).toContain('Invalid fixture ID format');
		});

		it('should return error for too many slashes', () => {
			const buildResult = new TempFSBuilder().build();

			expect(isOk(buildResult)).toBe(true);
			if (!isOk(buildResult)) {
				return;
			}

			tempFS = buildResult.data;

			const result = loadFixture('logs/sub/file');

			expect(isErr(result)).toBe(true);
			if (!isErr(result)) {
				return;
			}

			expect(result.error).toContain('Invalid fixture ID format');
		});
	});

	describe('with missing prefix directory', () => {
		it('should return error', () => {
			const buildResult = new TempFSBuilder().build();

			expect(isOk(buildResult)).toBe(true);
			if (!isOk(buildResult)) {
				return;
			}

			tempFS = buildResult.data;

			const result = loadFixture('logs/missing');

			expect(isErr(result)).toBe(true);
			if (!isErr(result)) {
				return;
			}

			expect(result.error).toContain('Directory not found');
		});
	});

	describe('with file not found', () => {
		it('should return error when fixture does not exist', () => {
			const buildResult = new TempFSBuilder()
				.withDirectory('logs', [
					dateDir('2025-11-07', [
						logFile('existing.jsonl', [
							logEntry({event: 'preprocessing_start', time: 1000}),
							logEntry({event: 'spec_generated', time: 1100, data: {spec: VALID_COMPONENT_SPEC}}),
						]),
					]),
				])
				.build();

			expect(isOk(buildResult)).toBe(true);
			if (!isOk(buildResult)) {
				return;
			}

			tempFS = buildResult.data;

			const result = loadFixture('logs/missing');

			expect(isErr(result)).toBe(true);
			if (!isErr(result)) {
				return;
			}

			expect(result.error).toContain('Fixture not found');
		});
	});

	describe('with parse errors', () => {
		it('should return error when log file fails to parse', () => {
			const buildResult = new TempFSBuilder()
				.withDirectory('logs', [
					dateDir('2025-11-07', [
						{type: 'file', name: 'bad.jsonl', content: 'invalid content'},
					]),
				])
				.build();

			expect(isOk(buildResult)).toBe(true);
			if (!isOk(buildResult)) {
				return;
			}

			tempFS = buildResult.data;

			const result = loadFixture('logs/bad');

			expect(isErr(result)).toBe(true);
			if (!isErr(result)) {
				return;
			}

			expect(result.error).toContain('Log file is empty');
		});
	});

	describe('with spec extraction errors', () => {
		it('should return error when spec is missing', () => {
			const buildResult = new TempFSBuilder()
				.withDirectory('logs', [
					dateDir('2025-11-07', [
						logFile('no-spec.jsonl', [
							logEntry({event: 'preprocessing_start', time: 1000}),
							logEntry({
								event: 'chunking_complete',
								time: 1100,
								data: {chunkCount: 5, dataSizeKB: '25.50'},
							}),
						]),
					]),
				])
				.build();

			expect(isOk(buildResult)).toBe(true);
			if (!isOk(buildResult)) {
				return;
			}

			tempFS = buildResult.data;

			const result = loadFixture('logs/no-spec');

			expect(isErr(result)).toBe(true);
			if (!isErr(result)) {
				return;
			}

			expect(result.error).toContain('Failed to extract spec');
		});
	});

	describe('with empty log files', () => {
		it('should return error', () => {
			const buildResult = new TempFSBuilder()
				.withDirectory('logs', [
					dateDir('2025-11-07', [
						{type: 'file', name: 'empty.jsonl', content: ''},
					]),
				])
				.build();

			expect(isOk(buildResult)).toBe(true);
			if (!isOk(buildResult)) {
				return;
			}

			tempFS = buildResult.data;

			const result = loadFixture('logs/empty');

			expect(isErr(result)).toBe(true);
			if (!isErr(result)) {
				return;
			}

			expect(result.error).toContain('Log file is empty');
		});
	});
});
