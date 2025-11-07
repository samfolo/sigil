import {readFileSync} from 'fs';

import type {SigilLogEntry} from '@sigil/src/common/observability/logger';
import {isSigilLogEntry} from '@sigil/src/common/observability/logger';

import type {Result} from '@sigil/src/common/errors/result';
import {err, ok} from '@sigil/src/common/errors/result';

const LOG_FIXTURE_PARSING = process.env.LOG_FIXTURE_PARSING === 'true';

/**
 * Type guard for Node.js filesystem errors
 */
const isNodeError = (error: unknown): error is NodeJS.ErrnoException => {
	return error instanceof Error;
};

/**
 * Parses a JSONL log file into an array of validated SigilLogEntry objects
 *
 * Reads the file line-by-line, parses each line as JSON, and validates it against
 * the SigilLogEntry schema. Invalid lines are skipped silently unless LOG_FIXTURE_PARSING
 * environment variable is set to 'true'.
 *
 * @param filePath - Absolute path to the JSONL file
 * @returns Result containing array of SigilLogEntry objects or error message
 */
export const parseLogFile = (filePath: string): Result<SigilLogEntry[], string> => {
	let content: string;

	try {
		content = readFileSync(filePath, 'utf-8');
	} catch (error) {
		if (isNodeError(error)) {
			if (error.code === 'ENOENT') {
				return err(`File not found: ${filePath}`);
			}
			if (error.code === 'EACCES') {
				return err(`Permission denied: ${filePath}`);
			}
			return err(`Failed to read file: ${error.message}`);
		}
		return err(`Failed to read file: ${String(error)}`);
	}

	const lines = content.split('\n').filter((line) => line.trim() !== '');
	const entries: SigilLogEntry[] = [];

	for (const [index, line] of lines.entries()) {
		let parsed: unknown;

		try {
			parsed = JSON.parse(line);
		} catch (error) {
			if (LOG_FIXTURE_PARSING) {
				console.error(`× Malformed JSON at line ${index + 1}:`, error);
			}
			continue;
		}

		if (isSigilLogEntry(parsed)) {
			entries.push(parsed);
		} else {
			if (LOG_FIXTURE_PARSING) {
				console.error(`× Invalid SigilLogEntry at line ${index + 1}`);
			}
		}
	}

	return ok(entries);
};
