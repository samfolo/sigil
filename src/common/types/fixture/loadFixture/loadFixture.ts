import {existsSync, readdirSync, statSync} from 'fs';
import {join} from 'path';

import type {Result} from '@sigil/src/common/errors/result';
import {err, isOk, ok} from '@sigil/src/common/errors/result';

import {extractSpec} from '../extractSpec';
import {parseLogFile} from '../parseLogFile';
import type {Fixture} from '../types';

const DATE_DIRECTORY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Loads a complete fixture by ID
 *
 * Searches for the fixture file in yyyy-MM-dd subdirectories of the specified prefix
 * directory (logs/ or fixtures/), parses the log file, extracts the spec, and
 * constructs a complete Fixture object.
 *
 * @param id - Fixture ID in format "prefix/filename" (e.g., "logs/MyAgent-123")
 * @returns Result containing complete Fixture object or error message
 */
export const loadFixture = (id: string): Result<Fixture, string> => {
	const parts = id.split('/');

	if (parts.length !== 2) {
		return err(`Invalid fixture ID format: ${id}. Expected "prefix/filename"`);
	}

	const [prefix, filename] = parts;

	if (!prefix || !filename) {
		return err(`Invalid fixture ID: ${id}`);
	}

	const projectRoot = process.cwd();
	const prefixPath = join(projectRoot, prefix);

	if (!existsSync(prefixPath)) {
		return err(`Directory not found: ${prefix}/`);
	}

	const entries = readdirSync(prefixPath);

	for (const entry of entries) {
		const entryPath = join(prefixPath, entry);

		if (!statSync(entryPath).isDirectory()) {
			continue;
		}

		if (!DATE_DIRECTORY_PATTERN.test(entry)) {
			continue;
		}

		const dateDir = entry;
		const filePath = join(entryPath, `${filename}.jsonl`);

		if (!existsSync(filePath)) {
			continue;
		}

		const parseResult = parseLogFile(filePath);
		if (!isOk(parseResult)) {
			return err(`Failed to parse log file: ${parseResult.error}`);
		}

		const logs = parseResult.data;

		if (logs.length === 0) {
			return err(`Log file is empty: ${id}`);
		}

		const specResult = extractSpec(logs);
		if (!isOk(specResult)) {
			return err(`Failed to extract spec: ${specResult.error}`);
		}

		const firstLog = logs.at(0);
		if (!firstLog) {
			return err(`Failed to access first log entry: ${id}`);
		}

		const fixture: Fixture = {
			id,
			displayName: id,
			date: dateDir,
			timestamp: firstLog.time,
			spec: specResult.data,
			logs,
		};

		return ok(fixture);
	}

	return err(`Fixture not found: ${id}`);
};
