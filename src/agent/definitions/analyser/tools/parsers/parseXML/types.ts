import type {PrecisionValue} from '@sigil/src/agent/definitions/analyser/tools/common';

import type {DepthAwareStructureMetadata, ParserResult, ParserStructureMetadataDetails} from '../common';

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
 * Result of attempting to parse data as XML
 *
 * Discriminated union on the `valid` field:
 * - `{valid: false}` indicates parsing or validation failure
 * - `{valid: true}` indicates successful parse with metadata
 */
export type ParseXMLStructureMetadataDetails = ParserStructureMetadataDetails<XMLMetadata>;

/**
 * State update returned by parseXML implementation
 * Includes parsedData which is stored in state.run.parsedData
 */
export type ParseXMLResult = ParserResult<unknown, XMLMetadata>;
