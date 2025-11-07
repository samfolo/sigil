import {existsSync, readdirSync, statSync} from 'fs';
import {join} from 'path';

import type {Result} from '@sigil/src/common/errors/result';
import {isOk, ok} from '@sigil/src/common/errors/result';

import {extractSpec} from '../extractSpec';
import {parseLogFile} from '../parseLogFile';
import type {FixtureMetadata} from '../types';

const DATE_DIRECTORY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Scans a specific root directory for fixture files
 *
 * @param rootPath - Absolute path to root directory (logs/ or fixtures/)
 * @param prefix - Prefix for fixture IDs ("logs" or "fixtures")
 * @returns Array of FixtureMetadata objects from this directory
 */
const scanDirectory = (rootPath: string, prefix: string): FixtureMetadata[] => {
	if (!existsSync(rootPath)) {
		return [];
	}

	const metadata: FixtureMetadata[] = [];

	const entries = readdirSync(rootPath);

	for (const entry of entries) {
		const entryPath = join(rootPath, entry);

		if (!statSync(entryPath).isDirectory()) {
			continue;
		}

		if (!DATE_DIRECTORY_PATTERN.test(entry)) {
			continue;
		}

		const dateDir = entry;
		const dateDirPath = entryPath;

		const files = readdirSync(dateDirPath);

		for (const file of files) {
			if (!file.endsWith('.jsonl')) {
				continue;
			}

			const filePath = join(dateDirPath, file);
			const filename = file.replace(/\.jsonl$/, '');

			const parseResult = parseLogFile(filePath);
			if (!isOk(parseResult)) {
				continue;
			}

			const logs = parseResult.data;

			if (logs.length === 0) {
				continue;
			}

			const specResult = extractSpec(logs);
			if (!isOk(specResult)) {
				continue;
			}

			const firstLog = logs.at(0);
			if (!firstLog) {
				continue;
			}

			const id = `${prefix}/${filename}`;

			metadata.push({
				id,
				displayName: id,
				date: dateDir,
				timestamp: firstLog.time,
			});
		}
	}

	return metadata;
};

/**
 * Scans fixture directories for available fixtures
 *
 * Scans both logs/ and fixtures/ directories from project root, enumerates yyyy-MM-dd
 * subdirectories, and builds metadata for all parseable fixture files.
 *
 * @returns Result containing array of FixtureMetadata sorted by timestamp (newest first)
 */
export const scanFixtureDirectories = (): Result<FixtureMetadata[], string> => {
	const projectRoot = process.cwd();
	const logsPath = join(projectRoot, 'logs');
	const fixturesPath = join(projectRoot, 'fixtures');

	const logsMetadata = scanDirectory(logsPath, 'logs');
	const fixturesMetadata = scanDirectory(fixturesPath, 'fixtures');

	const allMetadata = [...logsMetadata, ...fixturesMetadata];

	allMetadata.sort((a, b) => b.timestamp - a.timestamp);

	return ok(allMetadata);
};
