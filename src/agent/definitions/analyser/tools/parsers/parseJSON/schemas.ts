/**
 * Zod schemas and types for JSON parser
 *
 * Single source of truth for JSON parser structures.
 * Types are exported using z.infer to guarantee runtime/compile-time consistency.
 */

import {z} from 'zod';

import {parserResultSchema, parserStructureMetadataDetailsSchema, StructureMetadataSchema} from '../common';

/**
 * Result of attempting to parse data as JSON
 *
 * Discriminated union on the `valid` field:
 * - `{valid: false}` indicates parsing or validation failure
 * - `{valid: true}` indicates successful parse with metadata
 */
export const ParseJSONStructureMetadataDetailsSchema = parserStructureMetadataDetailsSchema(StructureMetadataSchema);

export type ParseJSONStructureMetadataDetails = z.infer<typeof ParseJSONStructureMetadataDetailsSchema>;

/**
 * State update returned by parseJSON implementation
 * Includes parsedData which is stored in state.run.parsedData
 */
export const ParseJSONResultSchema = parserResultSchema(z.unknown(), StructureMetadataSchema);

export type ParseJSONResult = z.infer<typeof ParseJSONResultSchema>;
