import type {PrecisionValue} from '@sigil/src/agent/definitions/analyser/tools/common';

import type {BaseStructureMetadata, ParserResult, ParserStructureMetadataDetails} from '../common';

/**
 * Result of attempting to parse data as CSV
 *
 * Discriminated union on the `valid` field:
 * - `{valid: false}` indicates parsing or validation failure
 * - `{valid: true}` indicates successful parse with metadata
 */
export type ParseCSVStructureMetadataDetails = ParserStructureMetadataDetails<CSVMetadata>;

/**
 * State update returned by parseCSV implementation
 * Includes parsedData which is stored in state.run.parsedData
 */
export type ParseCSVResult = ParserResult<unknown[][], CSVMetadata>;

/**
 * Metadata extracted from successfully parsed CSV data
 * Inherits size from BaseStructureMetadata
 *
 * Provides structural information to help the analyser agent understand
 * the CSV format without nested discriminated unions (flat structure).
 */
export interface CSVMetadata extends BaseStructureMetadata {
	/**
	 * Number of data rows returned by parser
	 *
	 * When using header mode, this is total rows minus one (first row used for field names).
	 */
	rowCount: number;

	/**
	 * Number of columns
	 */
	columnCount: number;

	/**
	 * Values from the first data row to preview content
	 *
	 * Each value truncated to maximum length for concise metadata.
	 * Helps agent understand the semantics and types of data.
	 */
	columns: PrecisionValue<string>[];
}
