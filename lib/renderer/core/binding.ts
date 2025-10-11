/**
 * Data binding utilities for the core renderer
 *
 * These functions transform ComponentSpec metadata and raw data into the
 * RenderTree intermediate representation. They handle:
 * - Column extraction from DataTableColumn configs
 * - Data mapping to rows using JSONPath accessors
 * - Value transformations (value_mappings)
 *
 * Uses lodash/get for safe nested property access with JSONPath-like syntax.
 */

import get from 'lodash/get';

import type {DataTableColumn, FieldMetadata} from '@sigil/lib/generated/types/specification';

import type {CellValue, Column, Row} from './types';

/**
 * Extracts column definitions from DataTableColumn configs
 *
 * Column order is preserved from the config array
 *
 * @param columns - Column configurations from DataTableConfig
 * @returns Array of column definitions for RenderTree
 */
export const extractColumns = (columns: DataTableColumn[]): Column[] => {
	return columns.map((col) => ({
		id: col.accessor,
		label: col.label,
		dataType: 'unknown', // Will be enriched from accessor_bindings in buildRenderTree
	}));
};

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
): Column[] => {
	return columns.map((col) => {
		const metadata = accessorBindings[col.id];
		return {
			...col,
			dataType: metadata?.data_types.at(0) ?? 'unknown',
		};
	});
};

/**
 * Binds raw data to rows based on column definitions
 *
 * For each row in the data:
 * 1. Generates a unique row ID
 * 2. Extracts values using JSONPath accessors (via lodash/get)
 * 3. Applies value_mappings if present in FieldMetadata
 * 4. Returns structured Row objects
 *
 * Handles nested data structures using lodash/get for safe access.
 * Supports JSONPath-like syntax: "user.profile.email", "items[0].name"
 *
 * @param data - Raw data array (can be flat or nested objects)
 * @param columns - Column definitions with accessors
 * @param accessorBindings - Field metadata containing value_mappings
 * @returns Array of processed rows
 */
export const bindData = (
	data: unknown[],
	columns: Column[],
	accessorBindings: Record<string, FieldMetadata>,
): Row[] => {
	return data.map((rowData, index) => {
		// Generate unique row ID from index
		const rowId = `row-${index}`;

		// Extract cell values for each column
		const cells: Record<string, CellValue> = {};

		for (const column of columns) {
			const rawValue = extractValue(rowData, column.id);
			const metadata = accessorBindings[column.id];

			cells[column.id] = {
				raw: rawValue,
				display: applyValueMapping(rawValue, metadata),
			};
		}

		return {
			id: rowId,
			cells,
		};
	});
};

/**
 * Extracts a value from a data object using a JSONPath accessor
 *
 * Uses lodash/get for safe nested property access with dot notation.
 * Supports:
 * - Simple properties: "name"
 * - Nested objects: "user.profile.email"
 * - Array indices: "items[0]", "users[5].name"
 * - Mixed: "data.users[0].contacts[1].email"
 *
 * @param data - Data object (can be nested)
 * @param accessor - JSONPath-style accessor string
 * @returns Value at accessor, or undefined if not found
 */
const extractValue = (data: unknown, accessor: string): unknown => {
	if (typeof data !== 'object' || data === null) {
		return undefined;
	}

	// lodash/get handles dot notation and array indexing
	return get(data, accessor);
};

/**
 * Applies value mapping transformation if defined in FieldMetadata
 *
 * Value mapping process:
 * 1. Convert raw value to string key
 * 2. Look up in metadata.value_mappings
 * 3. Return display_value if found, otherwise stringify raw value
 *
 * Phase 1: Only uses display_value, ignores display_config
 *
 * @param rawValue - Original value from data
 * @param metadata - Field metadata containing value_mappings
 * @returns Display string
 */
const applyValueMapping = (rawValue: unknown, metadata?: FieldMetadata): string => {
	// Handle null/undefined
	if (rawValue === null || rawValue === undefined) {
		return '';
	}

	// Check for value mapping
	if (metadata?.value_mappings) {
		const key = String(rawValue);
		const mapping = metadata.value_mappings[key];

		if (mapping) {
			return mapping.display_value;
		}
	}

	// Default: stringify the raw value
	return String(rawValue);
};
