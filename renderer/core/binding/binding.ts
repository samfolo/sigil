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
import {err} from '@sigil/src/common/errors/result';
import type {Result} from '@sigil/src/common/errors/result';
import type {DataTableColumn, FieldMetadata} from '@sigil/src/lib/generated/types/specification';

import type {Column, Row} from '../types';

import {bindArrayOfArrays} from './bindArrayOfArrays';
import {bindArrayOfObjects} from './bindArrayOfObjects';
import {bindObjectBased} from './bindObjectBased';
import {hasWildcardAccessor, isRecord} from './utils';

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
 * Uses row-oriented binding for all data structures. Each row is queried
 * individually for each column, ensuring missing values are correctly
 * represented as undefined.
 *
 * Note: Column-oriented binding (querying full dataset with wildcards) cannot
 * be used because JSONPath-Plus filters out missing values for both object
 * properties and array indices, breaking row alignment.
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

	// Dispatch to appropriate binding strategy based on data structure
	if (Array.isArray(data)) {
		// Detect CSV array-of-arrays vs array-of-objects
		const hasIndexAccessors = columns.some(col => /^\$\[\*\]\[\d+\]$/.test(col.id));

		if (hasIndexAccessors) {
			// CSV array-of-arrays: column-oriented (preserves structure)
			return bindArrayOfArrays(data, columns, accessorBindings, pathContext);
		} else {
			// Array-of-objects: row-oriented (handles missing properties)
			return bindArrayOfObjects(data, columns, accessorBindings, pathContext);
		}
	} else if (isRecord(data)) {
		// Object-based (object-of-objects, object-of-arrays): row-oriented
		return bindObjectBased(data, columns, accessorBindings, pathContext);
	}

	// Invalid data type
	return err([{
		code: ERROR_CODES.TYPE_MISMATCH,
		severity: 'error',
		category: 'data',
		path: pathContext.join(''),
		context: {
			expected: 'array or object',
			received: typeof data,
		},
		suggestion: 'Tabular data must be an array or object',
	}]);
};
