import type {ParserResult, ParserStructureMetadataDetails, StructureMetadata} from '@sigil/src/agent/definitions/analyser/tools/parsers/common';

/**
 * Result of attempting to parse data as JSON
 *
 * Discriminated union on the `valid` field:
 * - `{valid: false}` indicates parsing or validation failure
 * - `{valid: true}` indicates successful parse with metadata
 */
export type ParseJSONStructureMetadataDetails = ParserStructureMetadataDetails<StructureMetadata>;

/**
 * State update returned by parseJSON implementation
 * Includes parsedData which is stored in state.run.parsedData
 */
export type ParseJSONResult = ParserResult<unknown, StructureMetadata>;
