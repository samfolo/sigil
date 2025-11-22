/**
 * Row-oriented binding strategy for object-based data
 */

import type {SpecError} from '@sigil/src/common/errors';
import {err, isErr, ok} from '@sigil/src/common/errors/result';
import type {Result} from '@sigil/src/common/errors/result';
import type {FieldMetadata} from '@sigil/src/lib/generated/types/specification';

import type {CellValue, Column, Row} from '../types';
import {queryJSONPath} from '../utils/queryJSONPath';

import {applyValueMapping, convertWildcardToRowAccessor, enrichQueryErrors} from './utils';

/**
 * Binds object-based data (object-of-objects, object-of-arrays) using row-oriented strategy
 *
 * Row-oriented binding iterates through object keys and queries each value.
 * Handles $[*]~ accessor specially to return the key itself.
 *
 * @param data - Object-based data
 * @param columns - Column definitions with property/index accessors
 * @param accessorBindings - Field metadata containing value_mappings
 * @param pathContext - JSONPath segments for error context
 * @returns Result containing array of processed rows, or accumulated errors
 */
export const bindObjectBased = (
	data: Record<string, unknown>,
	columns: Column[],
	accessorBindings: Record<string, FieldMetadata>,
	pathContext: string[],
): Result<Row[], SpecError[]> => {
	const keys = Object.keys(data);
	const errors: SpecError[] = [];
	const rows: Row[] = [];

	// Iterate through each object key
	for (let rowIndex = 0; rowIndex < keys.length; rowIndex++) {
		const key = keys[rowIndex];
		const rowData = data[key];
		const rowId = `row-${rowIndex}`;
		const cells: Record<string, CellValue> = {};

		// Query each column for this row
		for (const column of columns) {
			const metadata = accessorBindings[column.id];
			let rawValue: unknown;

			// Special handling for keys accessor
			if (column.id === '$[*]~') {
				rawValue = key;
			} else {
				const rowAccessor = convertWildcardToRowAccessor(column.id);
				const result = queryJSONPath(rowData, rowAccessor);

				// Collect errors (continues processing with undefined)
				const queryErrors = enrichQueryErrors(result, pathContext, key);
				errors.push(...queryErrors);

				rawValue = isErr(result) ? undefined : result.data;
			}

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
