/**
 * Row-oriented binding strategy for array-of-objects data
 */

import type {SpecError} from '@sigil/src/common/errors';
import {err, isErr, ok} from '@sigil/src/common/errors/result';
import type {Result} from '@sigil/src/common/errors/result';
import type {FieldMetadata} from '@sigil/src/lib/generated/types/specification';

import type {CellValue, Column, Row} from '../types';
import {queryJSONPath} from '../utils/queryJSONPath';

import {applyValueMapping, convertWildcardToRowAccessor, enrichQueryErrors} from './utils';

/**
 * Binds array-of-objects data using row-oriented strategy
 *
 * Row-oriented binding queries each row individually for each column.
 * This ensures missing properties are correctly represented as undefined,
 * maintaining row alignment.
 *
 * @param data - Array-of-objects data
 * @param columns - Column definitions with property accessors
 * @param accessorBindings - Field metadata containing value_mappings
 * @param pathContext - JSONPath segments for error context
 * @returns Result containing array of processed rows, or accumulated errors
 */
export const bindArrayOfObjects = (
	data: unknown[],
	columns: Column[],
	accessorBindings: Record<string, FieldMetadata>,
	pathContext: string[],
): Result<Row[], SpecError[]> => {
	const errors: SpecError[] = [];
	const rows: Row[] = [];

	// Iterate through each row
	for (let rowIndex = 0; rowIndex < data.length; rowIndex++) {
		const rowData = data[rowIndex];
		const rowId = `row-${rowIndex}`;
		const cells: Record<string, CellValue> = {};

		// Query each column for this row
		for (const column of columns) {
			const metadata = accessorBindings[column.id];
			const rowAccessor = convertWildcardToRowAccessor(column.id);

			// Query this specific row
			const result = queryJSONPath(rowData, rowAccessor);

			// Collect errors (continues processing with undefined)
			const queryErrors = enrichQueryErrors(result, pathContext, rowIndex);
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
