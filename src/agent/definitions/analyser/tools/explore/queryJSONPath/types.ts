import type {PrecisionValue} from '@sigil/src/agent/definitions/analyser/tools/common';

/**
 * Options for querying JSON data with JSONPath
 */
export interface QueryJSONPathOptions {
	/**
	 * JSONPath expression to query (must start with $)
	 */
	path: string;
}

/**
 * A single match from a JSONPath query
 */
export interface QueryJSONPathMatch {
	/**
	 * Resolved JSONPath to this match
	 */
	path: string;
	/**
	 * Stringified preview of the value, truncated if needed
	 */
	preview: string;
}

/**
 * Metadata about the query execution
 */
export interface QueryJSONPathMetadata {
	/**
	 * Original query string
	 */
	query: string;
	/**
	 * Total number of matches found before capping
	 */
	totalMatches: number;
}

/**
 * Result of querying JSON data with JSONPath
 */
export interface QueryJSONPathResult {
	/**
	 * Array of matches with resolved paths and value previews.
	 * exact is false if results were capped at maximum.
	 */
	matches: PrecisionValue<QueryJSONPathMatch[]>;
	/**
	 * Query metadata
	 */
	metadata: QueryJSONPathMetadata;
}
