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
 * Checks if accessor contains wildcard notation
 *
 * @param accessor - JSONPath accessor string
 * @returns True if accessor contains wildcard [*]
 */
const hasWildcardAccessor = (accessor: string): boolean => accessor.includes('[*]');

/**
 * Detects if data represents CSV with header row
 *
 * CSV data is array-of-arrays where first element contains column headers
 *
 * @param data - Raw data
 * @param columns - Column definitions with accessors
 * @returns True if data is CSV with header row pattern
 */
const isCsvWithHeader = (data: unknown, columns: Column[]): boolean => {
	return Array.isArray(data) &&
		data.length > 0 &&
		Array.isArray(data[0]) &&
		columns.some(col => /^\$\[\*\]\[\d+\]$/.test(col.id));
};

/**
 * Binds tabular data to rows based on column definitions
 *
 * Uses unified column-oriented binding strategy for all tabular data:
 * - Queries full dataset once per column using wildcard accessors
 * - Distributes column values to rows
 * - Handles arrays, objects, and nested structures uniformly
 *
 * All tabular accessors must use wildcard notation:
 * - Array-of-objects: $[*].name, $[*].user.email
 * - Array-of-arrays: $[*][0], $[*][1] (CSV data)
 * - Object-of-objects: $[*].name, $[*]~ (keys)
 * - Mixed: $[*][0].property, $[*].items[0]
 *
 * @param data - Raw data (array or object for tabular rendering)
 * @param columns - Column definitions with wildcard accessors
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
	// Validate that all columns use wildcard accessors
	const nonWildcardColumns = columns.filter(col => !hasWildcardAccessor(col.id));
	if (nonWildcardColumns.length > 0) {
		return err(nonWildcardColumns.map(col => ({
			code: ERROR_CODES.INVALID_ACCESSOR,
			severity: 'error',
			category: 'spec',
			path: pathContext.join(''),
			context: {
				accessor: col.id,
				columnLabel: col.label,
				reason: 'Tabular data requires column-oriented wildcard accessors',
			},
			suggestion: 'Use wildcard notation: $[*].property for objects, $[*][N] for arrays',
		})));
	}

	const errors: SpecError[] = [];
	const rows: Row[] = [];

	// Extract all column values from full dataset (column-oriented queries)
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

	// Determine row count and whether to skip header row
	const numRows = Math.max(...Object.values(columnValues).map(values => values.length));
	const hasHeader = isCsvWithHeader(data, columns);
	const startIndex = hasHeader ? 1 : 0;
	const dataRowCount = hasHeader ? Math.max(0, numRows - 1) : numRows;

	// Create rows from column values
	for (let rowIndex = 0; rowIndex < dataRowCount; rowIndex++) {
		const actualDataIndex = startIndex + rowIndex;
		const rowId = `row-${rowIndex}`;
		const cells: Record<string, CellValue> = {};

		for (const column of columns) {
			const metadata = accessorBindings[column.id];
			const columnData = columnValues[column.id];

			// Get value for this row
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
