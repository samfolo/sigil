import type {StructureMetadata} from '@sigil/src/agent/definitions/analyser/tools/parsers/common';

/**
 * Result of YAML parsing operation
 * Discriminated union on 'valid' field
 */
export type ParseYAMLResult =
	| {valid: false; error: string}
	| {valid: true; metadata: StructureMetadata};
