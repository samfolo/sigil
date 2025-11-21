import {isErr, ok} from '@sigil/src/common/errors/result';
import type {Result} from '@sigil/src/common/errors/result';
import type {SpecError} from '@sigil/src/common/errors';
import type {DataTableConfig, FieldMetadata} from '@sigil/src/lib/generated/types/specification';

import {bindTabularData, enrichColumns, extractColumns} from '../../binding';
import type {TableProps} from '../../types';
import type {ComponentBuilder} from '../types';

/**
 * Builder for data-table components
 *
 * Transforms DataTableConfig and raw data into TableProps ready for React rendering.
 * Reuses existing binding utilities for column extraction, enrichment, and data binding.
 */
export class DataTableBuilder implements ComponentBuilder<DataTableConfig, TableProps> {
	/**
	 * Builds TableProps from configuration and data
	 *
	 * Flow:
	 * 1. Extract columns from config.columns
	 * 2. Enrich columns with accessor_bindings metadata
	 * 3. Bind data to rows using enriched columns
	 * 4. Return TableProps with title, description, columns, and data
	 *
	 * @param config - DataTableConfig from validated spec
	 * @param data - Raw data to bind to table
	 * @param bindings - Field metadata for accessor binding
	 * @param pathContext - JSONPath segments for error context
	 * @returns Result containing TableProps or accumulated binding errors
	 */
	build(
		config: DataTableConfig,
		data: unknown,
		bindings: Record<string, FieldMetadata>,
		pathContext: string[]
	): Result<TableProps, SpecError[]> {
		// Extract columns from config
		const columns = extractColumns(config.columns);

		// Enrich columns with metadata
		const enrichedColumns = enrichColumns(columns, bindings);

		// Bind data to rows
		const rowsResult = bindTabularData(data, enrichedColumns, bindings, pathContext);

		// Propagate binding errors
		if (isErr(rowsResult)) {
			return rowsResult;
		}

		// Build TableProps
		return ok({
			title: config.title,
			description: config.description,
			columns: enrichedColumns,
			data: rowsResult.data,
		});
	}
}
