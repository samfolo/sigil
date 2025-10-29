import type {PrecisionValue, SizeMetrics} from '@sigil/src/agent/definitions/analyser/tools/common';

/**
 * Base metadata shared across all structure analysis implementations
 */
export interface BaseStructureMetadata {
	/**
	 * Size metrics of the raw input data
	 */
	size: SizeMetrics;
}

/**
 * Base metadata for structures that calculate nesting depth
 */
export interface DepthAwareStructureMetadata extends BaseStructureMetadata {
	/**
	 * Maximum nesting depth of the structure
	 * Capped at maximum depth with exact: false when exceeded
	 */
	depth: PrecisionValue<number>;
}

/**
 * Metadata for array structures (JSON, YAML)
 */
export interface ArrayStructureMetadata extends DepthAwareStructureMetadata {
	structure: 'array';
	/**
	 * Number of elements in the array
	 */
	elementCount: number;
}

/**
 * Metadata for object structures (JSON, YAML)
 */
export interface ObjectStructureMetadata extends DepthAwareStructureMetadata {
	structure: 'object';
	/**
	 * First N keys alphabetically, each truncated to maximum length
	 * Configured via buildStructuredMetadata options
	 */
	topLevelKeys: PrecisionValue<string>[];
	/**
	 * Total count of keys (could be 10,000+)
	 */
	totalKeyCount: number;
}

/**
 * Metadata for primitive values (JSON, YAML)
 */
export type PrimitiveStructureMetadata =
	| {structure: 'string'; size: SizeMetrics}
	| {structure: 'number'; size: SizeMetrics}
	| {structure: 'boolean'; size: SizeMetrics}
	| {structure: 'null'; size: SizeMetrics};

/**
 * Metadata for structured data (JSON, YAML)
 * Discriminated union on 'structure' field
 */
export type StructureMetadata =
	| ArrayStructureMetadata
	| ObjectStructureMetadata
	| PrimitiveStructureMetadata;
