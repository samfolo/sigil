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
	semantic: z.string().min(5).max(200).describe('Human-readable description of data meaning'),
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
	label: z.string().min(1).describe('Human-readable field name for display'),

	/**
	 * Semantic explanation of what the field represents
	 */
	description: z.string().min(10).max(300).describe('Semantic explanation of what the field represents'),

	/**
	 * Priority-ordered list of field data types
	 */
	dataTypes: z.array(z.string()).min(1).describe('Priority-ordered list of field data types'),
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
	 * Parser output from tool execution, or null if parsing was not performed
	 */
	parseResult: z
		.union([
			ParseJSONStructureMetadataDetailsSchema,
			ParseCSVStructureMetadataDetailsSchema,
			ParseYAMLStructureMetadataDetailsSchema,
			ParseXMLStructureMetadataDetailsSchema,
			z.null(),
		])
		.describe('Parser output from tool execution, or null if parsing was not performed'),

	/**
	 * High-level summary of the data
	 */
	summary: z.string().min(20).max(500).describe('High-level summary of the data'),

	/**
	 * Key fields with semantic descriptions
	 */
	keyFields: z.array(KeyFieldSchema).min(1).max(10).describe('Key fields with semantic descriptions'),
});

/**
 * TypeScript type for AnalysisOutput
 *
 * Inferred from the Zod schema to ensure type safety
 */
export type AnalysisOutput = z.infer<typeof AnalysisOutputSchema>;
