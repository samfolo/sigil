import type {StructuredMetadata} from '@sigil/src/agent/definitions/analyser/tools/parsers/common';

/**
 * Result of JSON parsing operation
 * Discriminated union on 'valid' field
 */
export type ParseJSONResult =
	| {valid: false; error: string}
	| {valid: true; metadata: StructuredMetadata};
