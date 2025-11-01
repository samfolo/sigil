/**
 * Zod schemas and types for YAML parser
 *
 * Single source of truth for YAML parser structures.
 * Types are exported using z.infer to guarantee runtime/compile-time consistency.
 */

import {z} from 'zod';

import {parserResultSchema, parserStructureMetadataDetailsSchema, StructureMetadataSchema} from '../common';

/**
 * Result of attempting to parse data as YAML
 *
 * Discriminated union on the `valid` field:
 * - `{valid: false}` indicates parsing or validation failure
 * - `{valid: true}` indicates successful parse with metadata
 */
export const ParseYAMLStructureMetadataDetailsSchema = parserStructureMetadataDetailsSchema(StructureMetadataSchema);

export type ParseYAMLStructureMetadataDetails = z.infer<typeof ParseYAMLStructureMetadataDetailsSchema>;

/**
 * State update returned by parseYAML implementation
 * Includes parsedData which is stored in state.run.parsedData
 */
export const ParseYAMLResultSchema = parserResultSchema(z.unknown(), StructureMetadataSchema);

export type ParseYAMLResult = z.infer<typeof ParseYAMLResultSchema>;
