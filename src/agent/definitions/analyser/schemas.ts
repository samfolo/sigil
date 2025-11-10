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

import type {ParserState} from '@sigil/src/agent/definitions/analyser/tools/parsers/common';
import type {ParseCSVStructureMetadata} from '@sigil/src/agent/definitions/analyser/tools/parsers/parseCSV/parseCSV.tool';
import type {ParseJSONStructureMetadata} from '@sigil/src/agent/definitions/analyser/tools/parsers/parseJSON/parseJSON.tool';
import type {ParseXMLStructureMetadata} from '@sigil/src/agent/definitions/analyser/tools/parsers/parseXML/parseXML.tool';
import type {ParseYAMLStructureMetadata} from '@sigil/src/agent/definitions/analyser/tools/parsers/parseYAML/parseYAML.tool';
import {SamplerStateSchema, VignetteSchema} from '@sigil/src/agent/definitions/analyser/tools/sampler/common';
import type {SampleRetrieverState} from '@sigil/src/agent/definitions/analyser/tools/sampler/requestMoreSamples/schemas';
import type {EmptyObject} from '@sigil/src/common/types';

import {ParseCSVStructureMetadataDetailsSchema} from './tools/parsers/parseCSV';
import {ParseJSONStructureMetadataDetailsSchema} from './tools/parsers/parseJSON';
import {ParseXMLStructureMetadataDetailsSchema} from './tools/parsers/parseXML';
import {ParseYAMLStructureMetadataDetailsSchema} from './tools/parsers/parseYAML';

/**
 * Validation constraints for analysis output
 *
 * Length constraints use TARGET values in prompts to guide LLM brevity,
 * and MAX values in validation to provide buffer for LLM counting errors.
 *
 * Buffer formula (scaled by field length):
 * - Short fields (target <100): +50% buffer
 * - Medium fields (target 100-300): +75% buffer
 * - Long fields (target 300+): +100% buffer
 *
 * This accounts for LLMs being poor at measuring their own output length
 * during generation, whilst still preventing runaway generation.
 */
export const MIN_SEMANTIC_DESCRIPTION_LENGTH = 5;
export const TARGET_SEMANTIC_DESCRIPTION_LENGTH = 100;
export const MAX_SEMANTIC_DESCRIPTION_LENGTH = 175;

export const MIN_SUMMARY_LENGTH = 20;
export const TARGET_SUMMARY_LENGTH = 350;
export const MAX_SUMMARY_LENGTH = 700;

export const MIN_FIELD_LABEL_LENGTH = 3;
export const TARGET_FIELD_LABEL_LENGTH = 20;
export const MAX_FIELD_LABEL_LENGTH = 30;

export const MIN_FIELD_DESCRIPTION_LENGTH = 10;
export const TARGET_FIELD_DESCRIPTION_LENGTH = 150;
export const MAX_FIELD_DESCRIPTION_LENGTH = 260;

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
	label: z.string().min(MIN_FIELD_LABEL_LENGTH).max(MAX_FIELD_LABEL_LENGTH).describe('Human-readable field name for display'),

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

/**
 * Discriminated union of all parser tool metadata types
 *
 * Each parser tool produces metadata with a unique `tool` discriminator field:
 * - 'parse_json' for JSON parser
 * - 'parse_csv' for CSV parser
 * - 'parse_yaml' for YAML parser
 * - 'parse_xml' for XML parser
 *
 * TypeScript can narrow this union based on the `tool` field to access
 * tool-specific metadata in a type-safe manner.
 */
export type AnalyserStructureMetadata =
	| ParseJSONStructureMetadata
	| ParseCSVStructureMetadata
	| ParseYAMLStructureMetadata
	| ParseXMLStructureMetadata;


export type AnalyserParserState =
	| ParserState<ParseJSONStructureMetadata>
	| ParserState<ParseCSVStructureMetadata>
	| ParserState<ParseYAMLStructureMetadata>
	| ParserState<ParseXMLStructureMetadata>

/**
 * Run-level state for the Analyser Agent
 *
 * Combines parser state and sampler state via intersection, providing:
 * - `raw`: Original data string to parse
 * - `parsedData`: In-memory parsed representation (JSON.parse, Papa.parse, etc.)
 * - `structureMetadata`: Metadata from successful parser tool execution
 * - `samplerState`: Embeddings and chunking state for diversity sampling
 *
 * All fields persist across validation retry attempts because both parsing
 * (JSON.parse, Papa.parse) and embedding (transformers.js) are expensive
 * operations that should not be repeated.
 */
export type AnalyserRunState = AnalyserParserState & SampleRetrieverState;

/**
 * Attempt-level state for the Analyser Agent
 *
 * Empty because this agent doesn't need per-attempt working state.
 * All expensive computations (parsing, embedding) live in run state to
 * avoid recomputation across validation retries.
 */
export type AnalyserAttemptState = EmptyObject;

/**
 * Input to the Analyser Agent
 *
 * Contains preprocessed data required before agent execution:
 * - `rawData`: Original user-uploaded data string for parsing
 * - `initialVignettes`: Pre-generated diverse samples from `generateInitialVignettes`
 * - `samplerState`: Sampler state from preprocessing for request_more_samples tool
 *
 * The preprocessing step (generateInitialVignettes) happens before the agent
 * starts, ensuring the agent has immediate access to diverse data samples
 * without needing to perform expensive embedding operations on first attempt.
 */
export const AnalyserAgentInputSchema = z.object({
	/**
	 * Original user-uploaded data string
	 */
	rawData: z.string().min(1).describe('Original user-uploaded data string'),

	/**
	 * Pre-generated diverse samples from preprocessing
	 *
	 * Generated by `generateInitialVignettes` before agent execution.
	 * Each vignette contains text content, position metadata, and embedding vector.
	 */
	initialVignettes: z
		.array(VignetteSchema)
		.min(1)
		.describe('Pre-generated diverse samples with embeddings from preprocessing'),

	/**
	 * Sampler state from preprocessing
	 *
	 * Contains embeddings and chunks from `generateInitialVignettes`.
	 * Passed through to run state for use by request_more_samples tool.
	 */
	samplerState: SamplerStateSchema.describe('Sampler state from preprocessing'),
});

export type AnalyserAgentInput = z.infer<typeof AnalyserAgentInputSchema>;
