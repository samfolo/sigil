/**
 * Row-oriented binding strategy for CSV array-of-arrays data
 */

import type {SpecError} from '@sigil/src/common/errors';
import {err, isErr, ok} from '@sigil/src/common/errors/result';
import type {Result} from '@sigil/src/common/errors/result';
import type {FieldMetadata} from '@sigil/src/lib/generated/types/specification';

import type {CellValue, Column, Row} from '../types';
import {queryJSONPath} from '../utils/queryJSONPath';

import {applyValueMapping, convertWildcardToRowAccessor, enrichQueryErrors, isCSVWithHeader} from './utils';

/**
 * Binds array-of-arrays (CSV) data using row-oriented strategy
 *
 * Row-oriented binding queries each row individually for each column.
 * This ensures missing array indices are correctly represented as undefined,
 * maintaining column alignment.
 *
 * Note: JSONPath-Plus filters out missing array indices just like missing
 * object properties, so column-oriented queries cannot preserve structure.
 *
 * CSV detection: if first row is array, treat it as header row
 *
 * @param data - Array-of-arrays data
 * @param columns - Column definitions with index accessors
 * @param accessorBindings - Field metadata containing value_mappings
 * @param pathContext - JSONPath segments for error context
 * @returns Result containing array of processed rows, or accumulated errors
 */
export const bindArrayOfArrays = (
	data: unknown[],
	columns: Column[],
	accessorBindings: Record<string, FieldMetadata>,
	pathContext: string[],
): Result<Row[], SpecError[]> => {
	const errors: SpecError[] = [];
	const rows: Row[] = [];

	// Detect CSV header row
	const hasHeader = isCSVWithHeader(data, columns);
	const startIndex = hasHeader ? 1 : 0;
	const dataRowCount = hasHeader ? Math.max(0, data.length - 1) : data.length;

	// Iterate through each row
	for (let rowIndex = 0; rowIndex < dataRowCount; rowIndex++) {
		const actualDataIndex = startIndex + rowIndex;
		const rowData = data[actualDataIndex];
		const rowId = `row-${rowIndex}`;
		const cells: Record<string, CellValue> = {};

		// Query each column for this row
		for (const column of columns) {
			const metadata = accessorBindings[column.id];
			const rowAccessor = convertWildcardToRowAccessor(column.id);

			// Query this specific row
			const result = queryJSONPath(rowData, rowAccessor);

			// Collect errors (continues processing with undefined)
			const queryErrors = enrichQueryErrors(result, pathContext, actualDataIndex);
			errors.push(...queryErrors);

			const rawValue = isErr(result) ? undefined : result.data;

			cells[column.id] = {
				raw: rawValue,
				display: applyValueMapping(rawValue, metadata),
				format: metadata?.format,
				dataType: metadata?.data_types.at(0),
			};
		}

		rows.push({
			id: rowId,
			cells,
		});
	}

	// Return errors if any were collected
	if (errors.length > 0) {
		return err(errors);
	}

	return ok(rows);
};
