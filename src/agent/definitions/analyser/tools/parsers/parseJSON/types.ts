import type {SizeMetrics, TruncatedValue} from '@sigil/src/agent/definitions/analyser/tools/common';

/**
 * Maximum depth for JSON structure analysis
 * Depth calculation is capped at this value to prevent excessive recursion
 */
export const MAX_JSON_DEPTH = 20;

/**
 * Depth information for JSON structures
 */
export interface JSONDepth {
	/**
	 * Maximum nesting depth (capped at MAX_JSON_DEPTH)
	 */
	value: number;

	/**
	 * Whether the depth value is exact
	 * Set to false when actual depth exceeds MAX_JSON_DEPTH
	 */
	exact: boolean;
}

/**
 * Metadata for JSON array structures
 */
export interface JSONArrayMetadata {
	structure: 'array';
	/**
	 * Number of elements in the array
	 */
	elementCount: number;
	/**
	 * Maximum nesting depth of the array structure
	 */
	depth: JSONDepth;
	/**
	 * Size metrics for the raw JSON string
	 */
	size: SizeMetrics;
}

/**
 * Metadata for JSON object structures
 */
export interface JSONObjectMetadata {
	structure: 'object';
	/**
	 * First 50 keys alphabetically, each truncated to 100 characters
	 */
	topLevelKeys: TruncatedValue[];
	/**
	 * Total count of keys (could be 10,000+)
	 */
	totalKeyCount: number;
	/**
	 * Maximum nesting depth of the object structure
	 */
	depth: JSONDepth;
	/**
	 * Size metrics for the raw JSON string
	 */
	size: SizeMetrics;
}

/**
 * Metadata for JSON primitive values
 */
export type JSONPrimitiveMetadata =
	| {structure: 'string'; size: SizeMetrics}
	| {structure: 'number'; size: SizeMetrics}
	| {structure: 'boolean'; size: SizeMetrics}
	| {structure: 'null'; size: SizeMetrics};

/**
 * Metadata for valid JSON structures
 * Discriminated union on 'structure' field
 */
export type JSONMetadata =
	| JSONArrayMetadata
	| JSONObjectMetadata
	| JSONPrimitiveMetadata;

/**
 * Result of JSON parsing operation
 * Discriminated union on 'valid' field
 */
export type ParseJSONResult =
	| {valid: false; error: string}
	| {valid: true; metadata: JSONMetadata};
