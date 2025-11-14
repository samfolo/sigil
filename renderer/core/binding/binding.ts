/**
 * Data binding utilities for the core renderer
 *
 * These functions transform ComponentSpec metadata and raw data into the
 * RenderTree intermediate representation. They handle:
 * - Column extraction from DataTableColumn configs
 * - Data mapping to rows using JSONPath accessors
 * - Value transformations (value_mappings)
 *
 * Uses jsonpath-plus for full JSONPath specification support.
 */

import {ERROR_CODES} from '@sigil/src/common/errors';
import type {SpecError} from '@sigil/src/common/errors';
import {err, isErr, ok} from '@sigil/src/common/errors/result';
import type {Result} from '@sigil/src/common/errors/result';
import type {DataTableColumn, FieldMetadata} from '@sigil/src/lib/generated/types/specification';

import type {CellValue, Column, Row} from '../types';
import {queryJSONPath} from '../utils/queryJSONPath';
import {stringifyCellValue} from '../utils/stringifyCellValue';

/**
 * Extracts column definitions from DataTableColumn configs
 *
 * Column order is preserved from the config array
 *
 * @param columns - Column configurations from DataTableConfig
 * @returns Array of column definitions for RenderTree
 */
export const extractColumns = (columns: DataTableColumn[]): Column[] => columns.map((col) => ({
	id: col.accessor,
	label: col.label,
	dataType: 'unknown', // Will be enriched from accessor_bindings in buildRenderTree
	alignment: col.alignment,
}));

/**
 * Enriches column definitions with metadata from accessor_bindings
 *
 * Adds data type information from FieldMetadata
 *
 * @param columns - Column definitions from extractColumns()
 * @param accessorBindings - Field metadata from ComponentSpec
 * @returns Enriched column definitions
 */
export const enrichColumns = (
	columns: Column[],
	accessorBindings: Record<string, FieldMetadata>,
): Column[] => columns.map((col) => {
	const metadata = accessorBindings[col.id];
	return {
		...col,
		dataType: metadata?.data_types.at(0) ?? 'unknown',
	};
});

/**
 * Binds tabular data to rows based on column definitions
 *
 * Detects accessor pattern to determine binding strategy:
 * - Array-of-arrays: $[*][0], $[*][1] (CSV data) - queries full dataset per column
 * - Array-of-objects: $.name, $.email (JSON data) - queries per row
 *
 * @param data - Raw data (must be an array for tabular rendering)
 * @param columns - Column definitions with accessors
 * @param accessorBindings - Field metadata containing value_mappings
 * @param pathContext - JSONPath segments for error context
 * @returns Result containing array of processed rows, or accumulated errors
 */
export const bindTabularData = (
	data: unknown,
	columns: Column[],
	accessorBindings: Record<string, FieldMetadata>,
	pathContext: string[],
): Result<Row[], SpecError[]> => {
	// Validate that data is an array (required for tabular rendering)
	if (!Array.isArray(data)) {
		return err([{
			code: ERROR_CODES.NOT_ARRAY,
			severity: 'error',
			category: 'data',
			path: pathContext.join(''),
			context: {
				actualType: typeof data,
				value: data,
			},
		}]);
	}

	// Detect accessor pattern to determine binding strategy
	const hasWildcardAccessors = columns.some(column =>
		/^\$\[\*\]\[\d+\]$/.test(column.id)
	);

	if (hasWildcardAccessors) {
		// Array-of-arrays binding strategy (CSV data)
		return bindArrayOfArraysData(data, columns, accessorBindings, pathContext);
	}

	// Array-of-objects binding strategy (existing logic)
	const errors: SpecError[] = [];
	const rows: Row[] = [];

	for (let index = 0; index < data.length; index++) {
		const rowData = data[index];

		// Construct row-level path context (e.g., ['$', '[0]'])
		const rowPath = [...pathContext, `[${index}]`];

		// Generate unique row ID from index
		const rowId = `row-${index}`;

		// Extract cell values for each column
		const cells: Record<string, CellValue> = {};

		for (const column of columns) {
			const result = queryJSONPath(rowData, column.id);
			const metadata = accessorBindings[column.id];

			if (isErr(result)) {
				// Enrich errors with full path context
				const enrichedErrors = result.error.map((error) => {
					// For INVALID_ACCESSOR errors, the path doesn't start with '$'
					// so we just use the row path without appending the accessor
					if (!error.path || !error.path.startsWith('$')) {
						return {
							...error,
							path: rowPath.join(''),
						};
					}

					// Strip '$' or '$.' prefix from accessor to avoid double-root
					let accessorPath: string;
					if (error.path.startsWith('$.')) {
						accessorPath = error.path.slice(1); // '$.user.name' → '.user.name'
					} else if (error.path === '$') {
						accessorPath = ''; // Root accessor becomes empty
					} else {
						accessorPath = error.path.slice(1); // '$[0]' → '[0]'
					}

					return {
						...error,
						path: rowPath.join('') + accessorPath, // '$[5].user.name'
					};
				});

				errors.push(...enrichedErrors);

				// Use fallback values
				cells[column.id] = {
					raw: null,
					display: stringifyCellValue(null, metadata?.format, metadata?.data_types.at(0)),
					format: metadata?.format,
					dataType: metadata?.data_types.at(0),
				};

				continue; // Skip to next column
			}

			// Success case - use result.data as rawValue
			const rawValue = result.data;

			cells[column.id] = {
				raw: rawValue,
				display: applyValueMapping(rawValue, metadata),
				format: metadata?.format,
				dataType: metadata?.data_types.at(0), // Store primary type for reference
			};
		}

		rows.push({
			id: rowId,
			cells,
		});
	}

	// Return accumulated errors if any occurred
	if (errors.length > 0) {
		return err(errors);
	}

	return ok(rows);
};

/**
 * Binds array-of-arrays data (CSV format) to table rows
 *
 * Queries full dataset per column, then distributes values to rows. Skips header row.
 *
 * @param data - Array of arrays (CSV-style data)
 * @param columns - Column definitions with $[*][N] style accessors
 * @param accessorBindings - Field metadata containing value_mappings
 * @param pathContext - JSONPath segments for error context
 * @returns Result containing array of processed rows, or accumulated errors
 */
const bindArrayOfArraysData = (
	data: unknown[],
	columns: Column[],
	accessorBindings: Record<string, FieldMetadata>,
	pathContext: string[],
): Result<Row[], SpecError[]> => {
	const errors: SpecError[] = [];
	const rows: Row[] = [];

	// Extract all column values from full dataset
	const columnValues: Record<string, unknown[]> = {};

	for (const column of columns) {
		const result = queryJSONPath(data, column.id);

		if (isErr(result)) {
			// Add errors for this column
			const enrichedErrors = result.error.map((error) => ({
				...error,
				path: pathContext.join('') + (error.path?.startsWith('$') ? error.path.slice(1) : error.path || ''),
			}));
			errors.push(...enrichedErrors);
			columnValues[column.id] = []; // Empty values for failed column
			continue;
		}

		// Store column values (should be an array for wildcard accessors)
		columnValues[column.id] = Array.isArray(result.data) ? result.data : [result.data];
	}

	// Return errors early if column extraction failed
	if (errors.length > 0) {
		return err(errors);
	}

	// Determine number of data rows (skip header row at index 0)
	const numRows = Math.max(...Object.values(columnValues).map(values => values.length));
	const dataRowCount = Math.max(0, numRows - 1); // Subtract 1 for header

	// Create rows from column values (skip index 0 which is header)
	for (let rowIndex = 0; rowIndex < dataRowCount; rowIndex++) {
		const actualDataIndex = rowIndex + 1; // Skip header row
		const rowId = `row-${rowIndex}`;
		const cells: Record<string, CellValue> = {};

		for (const column of columns) {
			const metadata = accessorBindings[column.id];
			const columnData = columnValues[column.id];

			// Get value for this row (accounting for header skip)
			const rawValue = actualDataIndex < columnData.length ? columnData[actualDataIndex] : null;

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

	return ok(rows);
};

/**
 * Applies value mapping transformation if defined in FieldMetadata
 *
 * Value mapping process:
 * 1. Convert raw value to string key
 * 2. Look up in metadata.value_mappings
 * 3. Return display_value if found
 * 4. Otherwise, format the raw value using data type hints and format strings
 *
 * Tries each data type in order for type coercion/formatting
 *
 * Phase 1: Only uses display_value, ignores display_config
 *
 * @param rawValue - Original value from data
 * @param metadata - Field metadata containing value_mappings and format info
 * @returns Display string
 */
const applyValueMapping = (rawValue: unknown, metadata?: FieldMetadata): string => {
	// Handle null/undefined
	if (rawValue === null || rawValue === undefined) {
		return '';
	}

	// Check for value mapping first (takes precedence)
	if (metadata?.value_mappings) {
		const key = String(rawValue);
		const mapping = metadata.value_mappings[key];

		if (mapping) {
			return mapping.display_value;
		}
	}

	// Try formatting with each data type in order
	if (metadata?.data_types && metadata.data_types.length > 0) {
		for (const dataType of metadata.data_types) {
			const formatted = stringifyCellValue(rawValue, metadata.format, dataType);

			// If formatting succeeded (not fallback), use it
			// Simple heuristic: if it's not the same as String(rawValue), we formatted it
			if (formatted !== String(rawValue) || dataType === metadata.data_types.at(-1)) {
				return formatted;
			}
		}
	}

	// Final fallback: stringify with no type hints
	return stringifyCellValue(rawValue);
};
