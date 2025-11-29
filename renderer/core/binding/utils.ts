/**
 * Utility functions for data binding
 */

import type {SpecError} from '@sigil/src/common/errors';
import {isErr} from '@sigil/src/common/errors/result';
import type {Result} from '@sigil/src/common/errors/result';
import type {FieldMetadata, TextFormat} from '@sigil/src/lib/generated/types/specification';

import {JSONPATH_ROOT} from '../constants';
import type {Column, FormattedValue} from '../types';
import {formatTextValue} from '../utils/formatTextValue';

/**
 * Type guard to check if value is a Record<string, unknown>
 *
 * @param value - Value to check
 * @returns True if value is a non-null object
 */
export const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);

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
 * CSV data is array-of-arrays where first element contains column headers.
 * Matches patterns like $[*][0], $[*][1], and $[*][0].property
 *
 * @param data - Raw data
 * @param columns - Column definitions with accessors
 * @returns True if data is CSV with header row pattern
 */
export const isCSVWithHeader = (data: unknown, columns: Column[]): boolean => Array.isArray(data) &&
		data.length > 0 &&
		Array.isArray(data[0]) &&
		columns.some(col => /\$\[\*\]\[\d+\]/.test(col.id));

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
export const convertWildcardToRowAccessor = (accessor: string): string => accessor.replace(/^\$\[\*\]/, JSONPATH_ROOT);

/**
 * Enriches query errors with path context
 *
 * Extracts errors from failed query result and enriches them with full path context.
 * Path format depends on row identifier type:
 * - Array index: `pathContext[rowIndex].fieldPath`
 * - Object key: `pathContext['keyName'].fieldPath`
 *
 * @param result - Query result (ok or error)
 * @param pathContext - Base path context segments
 * @param rowIdentifier - Row identifier (array index or object key)
 * @returns Enriched errors array (empty if result is ok)
 */
export const enrichQueryErrors = (
	result: Result<unknown, SpecError[]>,
	pathContext: string[],
	rowIdentifier: string | number,
): SpecError[] => {
	if (!isErr(result)) {
		return [];
	}

	// Format row path based on identifier type
	const rowPath = typeof rowIdentifier === 'string'
		? `['${rowIdentifier}']`  // Object key: ['user_123']
		: `[${rowIdentifier}]`;   // Array index: [0]

	return result.error.map((error) => ({
		...error,
		path: pathContext.join('') + rowPath + (error.path?.startsWith(JSONPATH_ROOT) ? error.path.slice(1) : error.path || ''),
	}));
};

/**
 * Formats a cell value for display
 *
 * Processing order:
 * 1. Check value_mappings first (allows mapping null/undefined to placeholders)
 * 2. Pass through null/undefined if no mapping exists
 * 3. Apply format via formatTextValue if provided
 * 4. Otherwise, stringify the raw value
 *
 * @param rawValue - Original value from data
 * @param metadata - Field metadata containing value_mappings
 * @param format - Optional TextFormat from Column.body.format
 * @returns Display string, null, or undefined
 */
export const formatCellValue = (
	rawValue: unknown,
	metadata?: FieldMetadata,
	format?: TextFormat,
): FormattedValue => {
	// Check for value mapping first (takes precedence, including for null/undefined)
	// String(null) → "null", String(undefined) → "undefined"
	if (metadata?.value_mappings) {
		const key = String(rawValue);
		const mapping = metadata.value_mappings[key];

		if (mapping) {
			return mapping.display_value;
		}
	}

	// Pass through null/undefined - let renderers decide presentation
	if (rawValue === null) {
		return null;
	}
	if (rawValue === undefined) {
		return undefined;
	}

	// Apply format if provided, otherwise stringify
	return formatTextValue(rawValue, format);
};
