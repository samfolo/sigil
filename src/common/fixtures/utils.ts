import type {Result} from '@sigil/src/common/errors/result';
import {err, isOk, ok} from '@sigil/src/common/errors/result';
import type {SigilLogEntry} from '@sigil/src/common/observability/logger';
import type {ComponentSpec} from '@sigil/src/lib/generated/types/specification';

import {extractSpec} from './extractSpec';
import {parseLogFile} from './parseLogFile';

/**
 * Result of processing a fixture file
 */
export interface ProcessedFixtureData {
	/**
	 * All log entries from the file
	 */
	logs: SigilLogEntry[];

	/**
	 * Extracted ComponentSpec from spec_generated event
	 */
	spec: ComponentSpec;

	/**
	 * Unix timestamp in milliseconds from first log entry
	 */
	timestamp: number;
}

/**
 * Processes a fixture file and extracts logs, spec, and timestamp
 *
 * Shared logic for loadFixture and scanFixtures. Parses the log file,
 * validates it's non-empty, extracts the spec, and gets the timestamp
 * from the first log entry.
 *
 * @param filePath - Absolute path to .jsonl file
 * @returns Result containing processed data or error message
 */
export const processFixtureFile = (
	filePath: string
): Result<ProcessedFixtureData, string> => {
	const parseResult = parseLogFile(filePath);
	if (!isOk(parseResult)) {
		return err(`Failed to parse log file: ${parseResult.error}`);
	}

	const logs = parseResult.data;

	if (logs.length === 0) {
		return err('Log file is empty');
	}

	const specResult = extractSpec(logs);
	if (!isOk(specResult)) {
		return err(`Failed to extract spec: ${specResult.error}`);
	}

	const firstLog = logs.at(0);
	if (!firstLog) {
		return err('Failed to access first log entry');
	}

	return ok({
		logs,
		spec: specResult.data,
		timestamp: firstLog.time,
	});
};
