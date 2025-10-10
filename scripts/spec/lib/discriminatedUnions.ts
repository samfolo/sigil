/**
 * Discriminated union handling for Zod codegen
 *
 * Uses config.json metadata to identify and generate proper z.discriminatedUnion() calls
 */

import type { Config, DiscriminatedUnion } from './types';
import { toSchemaName } from './typeMapper';

/**
 * Checks if a definition is a discriminated union based on config
 */
export const isDiscriminatedUnion = (
	definitionName: string,
	config: Config
): DiscriminatedUnion | null => {
	return config.discriminatedUnions.find((u) => u.name === definitionName) || null;
};

/**
 * Generates Zod code for a discriminated union
 */
export const generateDiscriminatedUnion = (
	union: DiscriminatedUnion,
	indent: string = ''
): string => {
	const discriminator = JSON.stringify(union.discriminator);

	// Get schema names for all variants
	const variantSchemas = union.variants.map((v) => toSchemaName(v.type)).join(',\n  ');

	return `${indent}z.discriminatedUnion(${discriminator}, [\n  ${variantSchemas}\n${indent}])`;
};

/**
 * Gets all discriminated union definitions from config
 */
export const getDiscriminatedUnions = (config: Config): Map<string, DiscriminatedUnion> => {
	const map = new Map<string, DiscriminatedUnion>();
	for (const union of config.discriminatedUnions) {
		map.set(union.name, union);
	}
	return map;
};

/**
 * Validates that a discriminated union's variants exist in the schema
 */
interface ValidationResult {
	valid: boolean;
	missingVariants: string[];
}

export const validateDiscriminatedUnionVariants = (
	union: DiscriminatedUnion,
	definitions: Record<string, unknown>
): ValidationResult => {
	const missingVariants: string[] = [];

	for (const variant of union.variants) {
		if (!definitions[variant.type]) {
			missingVariants.push(variant.type);
		}
	}

	return {
		valid: missingVariants.length === 0,
		missingVariants,
	};
};
