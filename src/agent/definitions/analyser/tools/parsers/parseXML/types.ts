import type {PrecisionValue} from '@sigil/src/agent/definitions/analyser/tools/common';

import type {DepthAwareStructureMetadata} from '../common';

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
 * Inherits depth and size from DepthAwareStructureMetadata
 */
export interface XMLMetadata extends DepthAwareStructureMetadata {
	/**
	 * Name of the root XML element
	 * Set to FRAGMENT_SENTINEL when multiple root elements exist
	 */
	rootElement: string;

	/**
	 * Names of immediate child tags under the root element
	 * Alphabetically sorted, capped for performance
	 * Excludes special internal keys from the parser
	 */
	topLevelNodeTags: PrecisionValue<string>[];
}

/**
 * Result of XML parsing operation
 * Discriminated union on 'valid' field
 */
export type ParseXMLResult =
	| {valid: false; error: string}
	| {valid: true; metadata: XMLMetadata};
