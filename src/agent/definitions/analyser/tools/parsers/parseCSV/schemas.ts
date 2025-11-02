/**
 * Zod schemas and types for CSV parser
 *
 * Single source of truth for CSV metadata structures.
 * Types are exported using z.infer to guarantee runtime/compile-time consistency.
 */

import {z} from 'zod';

import {precisionValueSchema} from '@sigil/src/agent/definitions/analyser/tools/common';

import {parserResultSchema, parserStructureMetadataDetailsSchema} from '../common';
import {BaseStructureMetadataSchema} from '../common/structure';

/**
 * Column metadata from CSV first row
 *
 * Contains the column index and content (name or value) from the first row.
 * Index enables direct mapping to JSONPath queries for array access.
 */
export const CSVMetadataColumnSchema = z.object({
	/**
	 * Zero-based column index
	 */
	index: z.number().int().nonnegative().describe('Zero-based column index'),

	/**
	 * Column content from first row
	 */
	content: precisionValueSchema(z.string()).describe('Column content from first row'),
});

export type CSVMetadataColumn = z.infer<typeof CSVMetadataColumnSchema>;

/**
 * Metadata extracted from successfully parsed CSV data
 * Inherits size from BaseStructureMetadata
 *
 * Provides structural information to help the analyser agent understand
 * the CSV format without nested discriminated unions (flat structure).
 */
export const CSVMetadataSchema = BaseStructureMetadataSchema.extend({
	/**
	 * Number of data rows returned by parser
	 *
	 * When using header mode, this is total rows minus one (first row used for field names).
	 */
	rowCount: z.number().int().nonnegative().describe('Number of data rows returned by parser'),

	/**
	 * Number of columns
	 */
	columnCount: z.number().int().nonnegative().describe('Number of columns'),

	/**
	 * Column metadata from first data row
	 *
	 * Each entry includes zero-based index and content (truncated to maximum length).
	 * Index enables direct JSONPath construction (e.g., column at index 0 → path $[*][0]).
	 */
	columns: z.array(CSVMetadataColumnSchema).describe('Column metadata from first data row'),
});

export type CSVMetadata = z.infer<typeof CSVMetadataSchema>;

/**
 * Result of attempting to parse data as CSV
 *
 * Discriminated union on the `valid` field:
 * - `{valid: false}` indicates parsing or validation failure
 * - `{valid: true}` indicates successful parse with metadata
 */
export const ParseCSVStructureMetadataDetailsSchema = parserStructureMetadataDetailsSchema(CSVMetadataSchema);

export type ParseCSVStructureMetadataDetails = z.infer<typeof ParseCSVStructureMetadataDetailsSchema>;

/**
 * State update returned by parseCSV implementation
 * Includes parsedData which is stored in state.run.parsedData
 */
export const ParseCSVResultSchema = parserResultSchema(z.array(z.array(z.unknown())), CSVMetadataSchema);

export type ParseCSVResult = z.infer<typeof ParseCSVResultSchema>;
