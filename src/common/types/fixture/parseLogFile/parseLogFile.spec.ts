import {describe, expect, it, vi} from 'vitest';

import {isErr, isOk} from '@sigil/src/common/errors/result';

import {parseLogFile} from './parseLogFile';
import {
	EMPTY_CONTENT,
	INVALID_LOG_ENTRY_CONTENT,
	MALFORMED_JSON_CONTENT,
	VALID_JSONL_CONTENT,
	VALID_LOG_ENTRY,
	VALID_LOG_ENTRY_WITH_DATA,
	WHITESPACE_ONLY_CONTENT,
} from './parseLogFile.fixtures';

vi.mock('fs', () => ({
	readFileSync: vi.fn(),
}));

const {readFileSync} = await import('fs');

describe('parseLogFile', () => {
	describe('with valid JSONL content', () => {
		it('should parse and return array of SigilLogEntry objects', () => {
			vi.mocked(readFileSync).mockReturnValue(VALID_JSONL_CONTENT);

			const result = parseLogFile('/test/file.jsonl');

			expect(isOk(result)).toBe(true);
			if (!isOk(result)) {
				return;
			}

			expect(result.data).toHaveLength(2);
			expect(result.data.at(0)).toEqual(VALID_LOG_ENTRY);
			expect(result.data.at(1)).toEqual(VALID_LOG_ENTRY_WITH_DATA);
		});
	});

	describe('with malformed JSON lines', () => {
		it('should skip invalid lines and return valid entries', () => {
			vi.mocked(readFileSync).mockReturnValue(MALFORMED_JSON_CONTENT);

			const result = parseLogFile('/test/file.jsonl');

			expect(isOk(result)).toBe(true);
			if (!isOk(result)) {
				return;
			}

			expect(result.data).toHaveLength(2);
			expect(result.data.at(0)).toEqual(VALID_LOG_ENTRY);
			expect(result.data.at(1)).toEqual(VALID_LOG_ENTRY_WITH_DATA);
		});
	});

	describe('with invalid SigilLogEntry structures', () => {
		it('should skip invalid structures and return valid entries', () => {
			vi.mocked(readFileSync).mockReturnValue(INVALID_LOG_ENTRY_CONTENT);

			const result = parseLogFile('/test/file.jsonl');

			expect(isOk(result)).toBe(true);
			if (!isOk(result)) {
				return;
			}

			expect(result.data).toHaveLength(2);
			expect(result.data.at(0)).toEqual(VALID_LOG_ENTRY);
			expect(result.data.at(1)).toEqual(VALID_LOG_ENTRY_WITH_DATA);
		});
	});

	describe('with empty content', () => {
		it('should return empty array', () => {
			vi.mocked(readFileSync).mockReturnValue(EMPTY_CONTENT);

			const result = parseLogFile('/test/file.jsonl');

			expect(isOk(result)).toBe(true);
			if (!isOk(result)) {
				return;
			}

			expect(result.data).toHaveLength(0);
		});
	});

	describe('with whitespace only content', () => {
		it('should return empty array', () => {
			vi.mocked(readFileSync).mockReturnValue(WHITESPACE_ONLY_CONTENT);

			const result = parseLogFile('/test/file.jsonl');

			expect(isOk(result)).toBe(true);
			if (!isOk(result)) {
				return;
			}

			expect(result.data).toHaveLength(0);
		});
	});

	describe('with file not found error', () => {
		it('should return error with file not found message', () => {
			const error = new Error('ENOENT: no such file or directory');
			(error as NodeJS.ErrnoException).code = 'ENOENT';
			vi.mocked(readFileSync).mockImplementation(() => {
				throw error;
			});

			const result = parseLogFile('/test/missing.jsonl');

			expect(isErr(result)).toBe(true);
			if (!isErr(result)) {
				return;
			}

			expect(result.error).toBe('File not found: /test/missing.jsonl');
		});
	});

	describe('with permission denied error', () => {
		it('should return error with permission denied message', () => {
			const error = new Error('EACCES: permission denied');
			(error as NodeJS.ErrnoException).code = 'EACCES';
			vi.mocked(readFileSync).mockImplementation(() => {
				throw error;
			});

			const result = parseLogFile('/test/forbidden.jsonl');

			expect(isErr(result)).toBe(true);
			if (!isErr(result)) {
				return;
			}

			expect(result.error).toBe('Permission denied: /test/forbidden.jsonl');
		});
	});

	describe('with other filesystem errors', () => {
		it('should return error with error message', () => {
			const error = new Error('Some other filesystem error');
			vi.mocked(readFileSync).mockImplementation(() => {
				throw error;
			});

			const result = parseLogFile('/test/error.jsonl');

			expect(isErr(result)).toBe(true);
			if (!isErr(result)) {
				return;
			}

			expect(result.error).toBe('Failed to read file: Some other filesystem error');
		});
	});
});
