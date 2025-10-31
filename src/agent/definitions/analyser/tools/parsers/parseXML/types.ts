import type {PrecisionValue} from '@sigil/src/agent/definitions/analyser/tools/common';

import type {DepthAwareStructureMetadata} from '../common';

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
	 * Preserves document order, capped for performance
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
	| {valid: true; parsedData: unknown; metadata: XMLMetadata};
