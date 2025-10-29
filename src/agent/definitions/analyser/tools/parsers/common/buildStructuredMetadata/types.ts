import type {PrecisionValue, SizeMetrics} from '@sigil/src/agent/definitions/analyser/tools/common';

/**
 * Base metadata shared by array and object structures
 */
interface BaseStructuredMetadata {
	/**
	 * Maximum nesting depth of the structure
	 * Capped at maxDepth with exact: false when exceeded
	 */
	depth: PrecisionValue<number>;
	/**
	 * Size metrics for the raw input string
	 */
	size: SizeMetrics;
}

/**
 * Metadata for array structures (JSON, YAML)
 */
export interface StructuredArrayMetadata extends BaseStructuredMetadata {
	structure: 'array';
	/**
	 * Number of elements in the array
	 */
	elementCount: number;
}

/**
 * Metadata for object structures (JSON, YAML)
 */
export interface StructuredObjectMetadata extends BaseStructuredMetadata {
	structure: 'object';
	/**
	 * First N keys alphabetically (default 50), each truncated to M characters (default 100)
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
export type StructuredPrimitiveMetadata =
	| {structure: 'string'; size: SizeMetrics}
	| {structure: 'number'; size: SizeMetrics}
	| {structure: 'boolean'; size: SizeMetrics}
	| {structure: 'null'; size: SizeMetrics};

/**
 * Metadata for structured data (JSON, YAML)
 * Discriminated union on 'structure' field
 */
export type StructuredMetadata =
	| StructuredArrayMetadata
	| StructuredObjectMetadata
	| StructuredPrimitiveMetadata;
