import type {PrecisionValue, SizeMetrics} from '@sigil/src/agent/definitions/analyser/tools/common';

/**
 * Maximum length for column values in first row preview
 *
 * Longer values are truncated with ellipsis to keep metadata concise
 * whilst still providing meaningful preview to the agent.
 */
export const MAX_COLUMN_VALUE_LENGTH = 100;

/**
 * Result of attempting to parse data as CSV
 *
 * Discriminated union on the `valid` field:
 * - `{valid: false}` indicates parsing or validation failure
 * - `{valid: true}` indicates successful parse with metadata
 */
export type ParseCSVResult =
	| {
			valid: false;
			error: string;
	  }
	| {
			valid: true;
			metadata: CSVMetadata;
	  };

/**
 * Metadata extracted from successfully parsed CSV data
 *
 * Provides structural information to help the analyser agent understand
 * the CSV format without nested discriminated unions (flat structure).
 */
export interface CSVMetadata {
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
	 * Each value truncated to MAX_COLUMN_VALUE_LENGTH characters.
	 * Helps agent understand the semantics and types of data.
	 */
	columns: PrecisionValue<string>[];

	/**
	 * Size metrics of the raw CSV data
	 */
	size: SizeMetrics;
}
