/**
 * Zod schemas for validation layer types
 *
 * Single source of truth for validation layer metadata used in
 * multi-layer validation system and observability callbacks.
 */

import {z} from 'zod';

/**
 * Type of validation layer
 *
 * - `zod`: Schema validation (Layer 2 in agent pipeline)
 * - `custom`: Custom validation (Layer 3+ in agent pipeline)
 */
export const ValidationLayerTypeSchema = z.enum(['zod', 'custom']);

export type ValidationLayerType = z.infer<typeof ValidationLayerTypeSchema>;

/**
 * Metadata about a validation layer
 *
 * Describes a validation layer's identity and type for observability
 * and error reporting.
 */
export const ValidationLayerMetadataSchema = z.object({
	/**
	 * Name of the validation layer
	 */
	name: z.string().describe('Name of the validation layer'),

	/**
	 * Human-readable description of the layer's purpose
	 */
	description: z.string().describe("Human-readable description of the layer's purpose"),

	/**
	 * Type of validation layer
	 */
	type: ValidationLayerTypeSchema.describe('Type of validation layer'),
});

export type ValidationLayerMetadata = z.infer<typeof ValidationLayerMetadataSchema>;
