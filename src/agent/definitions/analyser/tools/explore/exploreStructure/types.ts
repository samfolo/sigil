import type {PrecisionValue} from '@sigil/src/agent/definitions/analyser/tools/common';

/**
 * Options for exploring data structure
 */
export interface ExploreStructureOptions {
	/**
	 * Maximum depth to traverse
	 */
	maxDepth: number;

	/**
	 * Optional JSONPath prefix to scope exploration
	 *
	 * When provided, exploration starts from the resolved location.
	 * Null, undefined, empty string, and single dollar treated as no prefix.
	 */
	prefix?: string;
}

/**
 * Metadata about structure exploration
 */
export interface ExploreStructureResultMetadata {
	/**
	 * Total number of paths returned
	 */
	totalPathsReturned: number;

	/**
	 * Echoed prefix if provided
	 */
	prefix?: string;
}

/**
 * Result from exploring data structure
 */
export interface ExploreStructureResult {
	/**
	 * JSONPath expressions to leaf nodes
	 *
	 * Sorted by depth descending, then alphabetically.
	 * Capped at maximum paths.
	 */
	paths: PrecisionValue<string[]>;

	/**
	 * Metadata about the exploration
	 */
	metadata: ExploreStructureResultMetadata;
}
