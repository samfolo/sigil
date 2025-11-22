/**
 * Utility functions for data binding
 */

import type {FieldMetadata} from '@sigil/src/lib/generated/types/specification';

import type {Column} from '../types';
import {stringifyCellValue} from '../utils/stringifyCellValue';

/**
 * Checks if accessor contains wildcard notation
 *
 * @param accessor - JSONPath accessor string
 * @returns True if accessor contains wildcard [*]
 */
export const hasWildcardAccessor = (accessor: string): boolean => accessor.includes('[*]');

/**
 * Detects if data represents CSV with header row
 *
 * CSV data is array-of-arrays where first element contains column headers
 *
 * @param data - Raw data
 * @param columns - Column definitions with accessors
 * @returns True if data is CSV with header row pattern
 */
export const isCsvWithHeader = (data: unknown, columns: Column[]): boolean => {
	return Array.isArray(data) &&
		data.length > 0 &&
		Array.isArray(data[0]) &&
		columns.some(col => /^\$\[\*\]\[\d+\]$/.test(col.id));
};

/**
 * Converts wildcard accessor to row-level accessor
 *
 * Examples:
 * - $[*].name → $.name
 * - $[*][0] → $[0]
 * - $[*]~ → $~
 *
 * @param accessor - Wildcard accessor
 * @returns Row-level accessor
 */
export const convertWildcardToRowAccessor = (accessor: string): string => accessor.replace(/^\$\[\*\]/, '$');

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
export const applyValueMapping = (rawValue: unknown, metadata?: FieldMetadata): string => {
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
