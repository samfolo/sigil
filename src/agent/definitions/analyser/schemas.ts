/**
 * Zod schemas for Analyser Agent output validation
 *
 * Validates the complete analysis output from the Analyser Agent, which includes:
 * - Data format classification (syntactic and semantic)
 * - Parser results from tool execution (JSON, CSV, YAML, XML)
 * - Data summary and semantic description
 * - Key fields with semantic descriptions for downstream IR generation
 *
 * Composes schemas from parser tools to ensure consistency with runtime tool outputs.
 */

import {z} from 'zod';

import {ParseCSVStructureMetadataDetailsSchema} from './tools/parsers/parseCSV';
import {ParseJSONStructureMetadataDetailsSchema} from './tools/parsers/parseJSON';
import {ParseXMLStructureMetadataDetailsSchema} from './tools/parsers/parseXML';
import {ParseYAMLStructureMetadataDetailsSchema} from './tools/parsers/parseYAML';

/**
 * Validation constraints for analysis output
 */
export const MIN_SEMANTIC_DESCRIPTION_LENGTH = 5;
export const MAX_SEMANTIC_DESCRIPTION_LENGTH = 200;
export const MIN_SUMMARY_LENGTH = 20;
export const MAX_SUMMARY_LENGTH = 500;
export const MIN_FIELD_DESCRIPTION_LENGTH = 10;
export const MAX_FIELD_DESCRIPTION_LENGTH = 300;
export const MIN_FIELD_LABEL_LENGTH = 3;
export const MIN_KEY_FIELDS = 1;
export const MAX_KEY_FIELDS = 10;

/**
 * Known data types that can appear in field metadata
 */
export const FIELD_DATA_TYPES = ['string', 'number', 'boolean', 'null', 'array', 'object', 'date'] as const;

/**
 * Data format classification
 *
 * - syntactic: Technical data format (json, csv, yaml, xml)
 * - semantic: Human-readable description of data meaning
 */
const ClassificationSchema = z.object({
	/**
	 * Technical data format
	 */
	syntactic: z.enum(['json', 'csv', 'yaml', 'xml']).describe('Technical data format'),

	/**
	 * Human-readable description of data meaning
	 */
	semantic: z
		.string()
		.min(MIN_SEMANTIC_DESCRIPTION_LENGTH)
		.max(MAX_SEMANTIC_DESCRIPTION_LENGTH)
		.describe('Human-readable description of data meaning'),
});

/**
 * Key field in the dataset with semantic description
 *
 * Describes important data fields for downstream IR generation:
 * - path: JSONPath expression for field access
 * - label: Human-readable field name for display
 * - description: Semantic explanation of what the field represents
 * - dataTypes: Priority-ordered list of field data types
 */
const KeyFieldSchema = z.object({
	/**
	 * JSONPath expression for field access
	 */
	path: z.string().min(1).describe('JSONPath expression for field access'),

	/**
	 * Human-readable field name for display
	 */
	label: z.string().min(MIN_FIELD_LABEL_LENGTH).describe('Human-readable field name for display'),

	/**
	 * Semantic explanation of what the field represents
	 */
	description: z
		.string()
		.min(MIN_FIELD_DESCRIPTION_LENGTH)
		.max(MAX_FIELD_DESCRIPTION_LENGTH)
		.describe('Semantic explanation of what the field represents'),

	/**
	 * Priority-ordered list of field data types
	 */
	dataTypes: z.array(z.enum(FIELD_DATA_TYPES)).min(1).describe('Priority-ordered list of field data types'),
});

/**
 * Complete analysis output from Analyser Agent
 *
 * Includes data classification, parser results, summary, and key fields
 * with semantic descriptions for downstream processing.
 */
export const AnalysisOutputSchema = z.object({
	/**
	 * Data format classification (syntactic and semantic)
	 */
	classification: ClassificationSchema.describe('Data format classification'),

	/**
	 * Parser output from tool execution
	 *
	 * Contains structured metadata about the parsed data format (JSON, CSV, YAML, or XML).
	 * May be null if the agent determines parsing is unnecessary or if data format cannot
	 * be classified into one of the supported syntactic formats.
	 *
	 * Note: In practice, this should rarely be null since the analyser agent is expected
	 * to classify and parse all supported data formats. Consider removing null from the
	 * union if it's never actually used in production.
	 */
	parseResult: z
		.union([
			ParseJSONStructureMetadataDetailsSchema,
			ParseCSVStructureMetadataDetailsSchema,
			ParseYAMLStructureMetadataDetailsSchema,
			ParseXMLStructureMetadataDetailsSchema,
			z.null(),
		])
		.describe(
			'Parser output from tool execution, or null if parsing was not performed or data format unsupported'
		),

	/**
	 * High-level summary of the data
	 */
	summary: z.string().min(MIN_SUMMARY_LENGTH).max(MAX_SUMMARY_LENGTH).describe('High-level summary of the data'),

	/**
	 * Key fields with semantic descriptions
	 */
	keyFields: z
		.array(KeyFieldSchema)
		.min(MIN_KEY_FIELDS)
		.max(MAX_KEY_FIELDS)
		.describe('Key fields with semantic descriptions'),
});

/**
 * TypeScript type for AnalysisOutput
 *
 * Inferred from the Zod schema to ensure type safety
 */
export type AnalysisOutput = z.infer<typeof AnalysisOutputSchema>;
