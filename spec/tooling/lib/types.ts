/**
 * Shared TypeScript types for spec scripts
 */

import {z} from 'zod';

/**
 * JSON Schema representation
 */
export interface JsonSchema {
  $schema?: string;
  $id?: string;
  $ref?: string;
  definitions?: Record<string, unknown>;
  discriminator?: {
    propertyName: string;
    mapping?: Record<string, string>;
  };
  [key: string]: unknown;
}

/**
 * Zod schema for validating config.json structure
 */
export const ConfigSchema = z.object({
	$schema: z.string().optional(),
	version: z.string(),
	description: z.string().optional(),
	entryPoint: z.string(),
	fragments: z.record(
		z.string(),
		z.object({
			path: z.string(),
			description: z.string(),
			dependencies: z.array(z.string()),
		})
	),
	discriminatedUnions: z.array(
		z.object({
			name: z.string(),
			location: z.string(),
			discriminator: z.string(),
			variants: z.array(
				z.object({
					value: z.string(),
					type: z.string(),
				})
			),
		})
	),
});

/**
 * Inferred TypeScript type from Zod schema
 */
export type Config = z.infer<typeof ConfigSchema>;

/**
 * Fragment metadata
 */
export interface FragmentMetadata {
  path: string;
  description: string;
  dependencies: string[];
}

/**
 * Discriminated union configuration
 */
export interface DiscriminatedUnion {
  name: string;
  location: string;
  discriminator: string;
  variants: Array<{
    value: string;
    type: string;
  }>;
}

/**
 * Validation result for error reporting
 */
export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

/**
 * Structured validation error
 */
export interface ValidationError {
  type: 'error' | 'warning';
  message: string;
  context?: {
    file?: string;
    fragment?: string;
    reference?: string;
  };
}
