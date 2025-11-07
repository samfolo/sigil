import {afterEach, beforeEach, describe, expect, it} from 'vitest';

import {isErr, isOk} from '@sigil/src/common/errors/result';
import type {TempFSResult} from '@sigil/src/testing/fs';
import {TempFSBuilder} from '@sigil/src/testing/fs';

import {logEntry, logFile} from '../fixture.mock';

import {parseLogFile} from './parseLogFile';

describe('parseLogFile', () => {
	let tempFS: TempFSResult | null = null;

	afterEach(() => {
		if (tempFS) {
			tempFS.cleanup();
			tempFS = null;
		}
	});

	describe('with valid JSONL content', () => {
		it('should parse and return array of SigilLogEntry objects', () => {
			const entry1 = logEntry({event: 'preprocessing_start', time: 1000});
			const entry2 = logEntry({
				event: 'spec_generated',
				time: 2000,
				data: {spec: {id: 'test'}},
			});

			const buildResult = new TempFSBuilder()
				.with(logFile('test.jsonl', [entry1, entry2]))
				.build();

			expect(isOk(buildResult)).toBe(true);
			if (!isOk(buildResult)) {
				return;
			}

			tempFS = buildResult.data;

			const result = parseLogFile(`${tempFS.root}/test.jsonl`);

			expect(isOk(result)).toBe(true);
			if (!isOk(result)) {
				return;
			}

			expect(result.data).toHaveLength(2);
			expect(result.data.at(0)?.event).toBe('preprocessing_start');
			expect(result.data.at(1)?.event).toBe('spec_generated');
		});
	});

	describe('with malformed JSON lines', () => {
		it('should skip invalid lines and return valid entries', () => {
			const entry1 = logEntry({event: 'attempt_start', time: 1000});
			const entry2 = logEntry({event: 'success', time: 2000});

			const content = `${JSON.stringify(entry1)}\n{this is not valid json}\n${JSON.stringify(entry2)}`;

			const buildResult = new TempFSBuilder()
				.withFile('malformed.jsonl', content)
				.build();

			expect(isOk(buildResult)).toBe(true);
			if (!isOk(buildResult)) {
				return;
			}

			tempFS = buildResult.data;

			const result = parseLogFile(`${tempFS.root}/malformed.jsonl`);

			expect(isOk(result)).toBe(true);
			if (!isOk(result)) {
				return;
			}

			expect(result.data).toHaveLength(2);
			expect(result.data.at(0)?.event).toBe('attempt_start');
			expect(result.data.at(1)?.event).toBe('success');
		});
	});

	describe('with invalid SigilLogEntry structures', () => {
		it('should skip invalid structures and return valid entries', () => {
			const entry1 = logEntry({event: 'tool_call', time: 1000});
			const invalidEntry = {some: 'invalid', structure: true};
			const entry2 = logEntry({event: 'tool_result', time: 2000});

			const content = `${JSON.stringify(entry1)}\n${JSON.stringify(invalidEntry)}\n${JSON.stringify(entry2)}`;

			const buildResult = new TempFSBuilder()
				.withFile('invalid.jsonl', content)
				.build();

			expect(isOk(buildResult)).toBe(true);
			if (!isOk(buildResult)) {
				return;
			}

			tempFS = buildResult.data;

			const result = parseLogFile(`${tempFS.root}/invalid.jsonl`);

			expect(isOk(result)).toBe(true);
			if (!isOk(result)) {
				return;
			}

			expect(result.data).toHaveLength(2);
			expect(result.data.at(0)?.event).toBe('tool_call');
			expect(result.data.at(1)?.event).toBe('tool_result');
		});
	});

	describe('with empty content', () => {
		it('should return empty array', () => {
			const buildResult = new TempFSBuilder()
				.withFile('empty.jsonl', '')
				.build();

			expect(isOk(buildResult)).toBe(true);
			if (!isOk(buildResult)) {
				return;
			}

			tempFS = buildResult.data;

			const result = parseLogFile(`${tempFS.root}/empty.jsonl`);

			expect(isOk(result)).toBe(true);
			if (!isOk(result)) {
				return;
			}

			expect(result.data).toHaveLength(0);
		});
	});

	describe('with whitespace only content', () => {
		it('should return empty array', () => {
			const buildResult = new TempFSBuilder()
				.withFile('whitespace.jsonl', '   \n\n  \n')
				.build();

			expect(isOk(buildResult)).toBe(true);
			if (!isOk(buildResult)) {
				return;
			}

			tempFS = buildResult.data;

			const result = parseLogFile(`${tempFS.root}/whitespace.jsonl`);

			expect(isOk(result)).toBe(true);
			if (!isOk(result)) {
				return;
			}

			expect(result.data).toHaveLength(0);
		});
	});

	describe('with file not found error', () => {
		beforeEach(() => {
			const buildResult = new TempFSBuilder().build();

			expect(isOk(buildResult)).toBe(true);
			if (!isOk(buildResult)) {
				return;
			}

			tempFS = buildResult.data;
		});

		it('should return error with file not found message', () => {
			const result = parseLogFile(`${tempFS?.root}/missing.jsonl`);

			expect(isErr(result)).toBe(true);
			if (!isErr(result)) {
				return;
			}

			expect(result.error).toContain('File not found');
		});
	});
});
