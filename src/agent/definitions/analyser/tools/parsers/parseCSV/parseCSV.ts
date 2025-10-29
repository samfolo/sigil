import Papa from 'papaparse';

import {calculateSize, truncateString} from '@sigil/src/agent/definitions/analyser/tools/common';
import type {Result} from '@sigil/src/common/errors';
import {ok} from '@sigil/src/common/errors';

import type {ParseCSVResult} from './types';
import {MAX_STRUCTURE_VALUE_LENGTH} from './types';

/**
 * Type guard to check if parsed data is an array of arrays
 */
const isArrayArray = (data: unknown): data is unknown[][] => {
	if (!Array.isArray(data)) {
		return false;
	}
	const firstItem = data.at(0);
	return firstItem !== undefined && Array.isArray(firstItem);
};

/**
 * Parses raw data as CSV and extracts metadata
 *
 * Attempts to parse the provided data as CSV using the specified delimiter.
 * Always parses as array of arrays (header: false) to preserve raw 2D structure.
 * The agent can determine semantically whether the first row represents headers.
 *
 * On success, returns metadata including row count, column count, first row values,
 * and size metrics. On failure, returns validation error with details.
 *
 * Always returns Ok - parsing failures are reported as {valid: false} in the result.
 *
 * @param rawData - Raw string data to parse as CSV
 * @param delimiter - CSV delimiter character (defaults to comma)
 * @returns Result containing parse outcome and metadata (never returns Err)
 *
 * @example
 * ```typescript
 * // Valid CSV
 * parseCSV('name,age\nJohn,30\nJane,25')
 * // → ok({valid: true, metadata: {rowCount: 3, columnCount: 2, columns: ['name', 'age'], ...}})
 *
 * // Custom delimiter
 * parseCSV('name\tage\nJohn\t30', '\t')
 * // → ok({valid: true, metadata: {rowCount: 2, columnCount: 2, ...}})
 *
 * // Empty input
 * parseCSV('')
 * // → ok({valid: false, error: 'No data rows found after parsing'})
 * ```
 */
export const parseCSV = (
	rawData: string,
	delimiter = ','
): Result<ParseCSVResult, string> => {
	// Calculate size from raw input
	const size = calculateSize(rawData);

	// Attempt to parse CSV (always as array of arrays)
	const parseResult = Papa.parse(rawData, {
		header: false,
		dynamicTyping: true,
		skipEmptyLines: true,
		delimiter,
	});

	// Check for parse errors
	if (parseResult.errors.length > 0) {
		const firstError = parseResult.errors.at(0);
		const errorMessage = firstError
			? `${firstError.message} (row ${firstError.row})`
			: 'Unknown parsing error';
		return ok({valid: false, error: errorMessage});
	}

	// Check data structure and extract rows
	if (!isArrayArray(parseResult.data)) {
		return ok({valid: false, error: 'Unexpected data structure from parser'});
	}

	const data = parseResult.data;

	// Check if we have any data rows
	if (data.length === 0) {
		return ok({valid: false, error: 'No data rows found after parsing'});
	}

	// Extract first row to get column information
	const firstRow = data.at(0);
	if (firstRow == null || firstRow.length === 0) {
		return ok({valid: false, error: 'No data rows found after parsing'});
	}

	const columnCount = firstRow.length;

	// Extract first row values and truncate each
	const columns = firstRow.map((value) => {
		const stringValue = value == null ? '' : String(value);
		return truncateString(stringValue, MAX_STRUCTURE_VALUE_LENGTH);
	});

	return ok({
		valid: true,
		metadata: {
			rowCount: data.length,
			columnCount,
			columns,
			size,
		},
	});
};
