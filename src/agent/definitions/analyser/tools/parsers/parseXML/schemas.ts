/**
 * Zod schemas and types for XML parser
 *
 * Single source of truth for XML metadata structures.
 * Types are exported using z.infer to guarantee runtime/compile-time consistency.
 */

import {z} from 'zod';

import {precisionValueSchema} from '@sigil/src/agent/definitions/analyser/tools/common';

import {parserResultSchema, parserStructureMetadataDetailsSchema} from '../common';
import {DepthAwareStructureMetadataSchema} from '../common/structure';

/**
 * Metadata extracted from successfully parsed XML document
 * Inherits depth and size from DepthAwareStructureMetadata
 */
export const XMLMetadataSchema = DepthAwareStructureMetadataSchema.extend({
	/**
	 * Name of the root XML element
	 * Set to FRAGMENT_SENTINEL when multiple root elements exist
	 */
	rootElement: z.string().describe('Name of the root XML element'),

	/**
	 * Names of immediate child tags under the root element
	 * Preserves document order, capped for performance
	 * Excludes special internal keys from the parser
	 */
	topLevelNodeTags: z.array(precisionValueSchema(z.string())).describe('Names of immediate child tags under the root element'),
});

export type XMLMetadata = z.infer<typeof XMLMetadataSchema>;

/**
 * Result of attempting to parse data as XML
 *
 * Discriminated union on the `valid` field:
 * - `{valid: false}` indicates parsing or validation failure
 * - `{valid: true}` indicates successful parse with metadata
 */
export const ParseXMLStructureMetadataDetailsSchema = parserStructureMetadataDetailsSchema(XMLMetadataSchema);

export type ParseXMLStructureMetadataDetails = z.infer<typeof ParseXMLStructureMetadataDetailsSchema>;

/**
 * State update returned by parseXML implementation
 * Includes parsedData which is stored in state.run.parsedData
 */
export const ParseXMLResultSchema = parserResultSchema(z.unknown(), XMLMetadataSchema);

export type ParseXMLResult = z.infer<typeof ParseXMLResultSchema>;
