import type {PrecisionValue, SizeMetrics} from '@sigil/src/agent/definitions/analyser/tools/common';

/**
 * Maximum number of top-level node tags to extract
 */
export const MAX_TOP_LEVEL_TAGS = 50;

/**
 * Maximum length for extracted tag names
 *
 * Longer tag names are truncated with ellipsis.
 */
export const MAX_TAG_NAME_LENGTH = 100;

/**
 * Maximum depth to probe when calculating nesting depth
 */
export const MAX_DEPTH = 20;

/**
 * Sentinel value used as rootElement when multiple root elements exist
 */
export const FRAGMENT_SENTINEL = '(fragment)';

/**
 * Prefix used for XML attributes in parsed structure
 */
export const ATTRIBUTE_PREFIX = '@__';

/**
 * Special key used for text content in parsed structure
 */
export const TEXT_NODE_KEY = '#text';

/**
 * Metadata extracted from successfully parsed XML document
 */
export interface XMLMetadata {
	/**
	 * Name of the root XML element
	 * Set to FRAGMENT_SENTINEL when multiple root elements exist
	 */
	rootElement: string;

	/**
	 * Names of immediate child tags under the root element
	 * Alphabetically sorted, capped at MAX_TOP_LEVEL_TAGS
	 * Excludes special internal keys from the parser
	 */
	topLevelNodeTags: PrecisionValue<string>[];

	/**
	 * Maximum nesting depth of the XML structure
	 * Capped at MAX_DEPTH for performance
	 */
	depth: PrecisionValue<number>;

	/**
	 * Size metrics of the raw XML data
	 */
	size: SizeMetrics;
}

/**
 * Result of XML parsing operation
 * Discriminated union on 'valid' field
 */
export type ParseXMLResult =
	| {valid: false; error: string}
	| {valid: true; metadata: XMLMetadata};
