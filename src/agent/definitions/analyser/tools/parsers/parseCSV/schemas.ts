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
	 * Values from the first data row to preview content
	 *
	 * Each value truncated to maximum length for concise metadata.
	 * Helps agent understand the semantics and types of data.
	 */
	columns: z.array(precisionValueSchema(z.string())).describe('Values from the first data row to preview content'),
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
