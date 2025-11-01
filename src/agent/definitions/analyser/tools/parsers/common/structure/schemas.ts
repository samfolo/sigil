/**
 * Zod schemas and types for structure metadata
 *
 * Single source of truth for structure metadata used by JSON, YAML, CSV, and XML parsers.
 * Types are exported using z.infer to guarantee runtime/compile-time consistency.
 */

import {z} from 'zod';

import {precisionValueSchema, SizeMetricsSchema} from '@sigil/src/agent/definitions/analyser/tools/common';

/**
 * Base metadata shared across all structure analysis implementations
 */
export const BaseStructureMetadataSchema = z.object({
	/**
	 * Size metrics of the raw input data
	 */
	size: SizeMetricsSchema.describe('Size metrics of the raw input data'),
});

export type BaseStructureMetadata = z.infer<typeof BaseStructureMetadataSchema>;

/**
 * Base metadata for structures that calculate nesting depth
 */
export const DepthAwareStructureMetadataSchema = BaseStructureMetadataSchema.extend({
	/**
	 * Maximum nesting depth of the structure
	 * Capped at maximum depth with exact: false when exceeded
	 */
	depth: precisionValueSchema(z.number().int().nonnegative()).describe('Maximum nesting depth of the structure'),
});

export type DepthAwareStructureMetadata = z.infer<typeof DepthAwareStructureMetadataSchema>;

/**
 * Metadata for array structures (JSON, YAML)
 */
export const ArrayStructureMetadataSchema = DepthAwareStructureMetadataSchema.extend({
	structure: z.literal('array'),
	/**
	 * Number of elements in the array
	 */
	elementCount: z.number().int().nonnegative().describe('Number of elements in the array'),
});

export type ArrayStructureMetadata = z.infer<typeof ArrayStructureMetadataSchema>;

/**
 * Metadata for object structures (JSON, YAML)
 */
export const ObjectStructureMetadataSchema = DepthAwareStructureMetadataSchema.extend({
	structure: z.literal('object'),
	/**
	 * First N keys alphabetically, each truncated to maximum length
	 * Configured via buildStructuredMetadata options
	 */
	topLevelKeys: z.array(precisionValueSchema(z.string())).describe('First N keys alphabetically, each truncated to maximum length'),
	/**
	 * Total count of keys (could be 10,000+)
	 */
	totalKeyCount: z.number().int().nonnegative().describe('Total count of keys'),
});

export type ObjectStructureMetadata = z.infer<typeof ObjectStructureMetadataSchema>;

/**
 * Metadata for primitive values (JSON, YAML)
 */
export const PrimitiveStructureMetadataSchema = z.discriminatedUnion('structure', [
	z.object({
		structure: z.literal('string'),
		size: SizeMetricsSchema,
	}),
	z.object({
		structure: z.literal('number'),
		size: SizeMetricsSchema,
	}),
	z.object({
		structure: z.literal('boolean'),
		size: SizeMetricsSchema,
	}),
	z.object({
		structure: z.literal('null'),
		size: SizeMetricsSchema,
	}),
]);

export type PrimitiveStructureMetadata = z.infer<typeof PrimitiveStructureMetadataSchema>;

/**
 * Metadata for structured data (JSON, YAML)
 * Discriminated union on 'structure' field
 */
export const StructureMetadataSchema = z.discriminatedUnion('structure', [
	ArrayStructureMetadataSchema,
	ObjectStructureMetadataSchema,
	...PrimitiveStructureMetadataSchema.options,
]);

export type StructureMetadata = z.infer<typeof StructureMetadataSchema>;
