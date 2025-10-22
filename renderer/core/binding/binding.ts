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

import type {SpecError} from '@sigil/src/common/errors';
import type {Result} from '@sigil/src/common/errors/result';
import {err, isErr, ok} from '@sigil/src/common/errors/result';
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
 * Binds raw data to rows based on column definitions
 *
 * For each row in the data:
 * 1. Generates a unique row ID
 * 2. Extracts values using JSONPath accessors (via queryJSONPath)
 * 3. Applies value_mappings if present in FieldMetadata
 * 4. Returns structured Row objects
 *
 * Handles nested data structures using jsonpath-plus for full JSONPath support.
 * Supports complete JSONPath specification: wildcards, filters, recursive descent.
 *
 * Error handling:
 * - Accumulates all errors across rows and columns
 * - Enriches error paths with row context (e.g., '$[0].user.name')
 * - Uses fallback values (raw: null, display: '') when queries fail
 * - Returns all errors at end if any occurred
 *
 * @param data - Raw data array (can be flat or nested objects)
 * @param columns - Column definitions with accessors
 * @param accessorBindings - Field metadata containing value_mappings
 * @param pathContext - JSONPath segments representing location in data structure (e.g., ['$'] or ['$', '[0]', '.users'])
 * @returns Result containing array of processed rows, or accumulated errors
 */
export const bindData = (
	data: unknown[],
	columns: Column[],
	accessorBindings: Record<string, FieldMetadata>,
	pathContext: string[],
): Result<Row[], SpecError[]> => {
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
