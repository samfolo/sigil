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
export const validateDiscriminatedUnionVariants = (
	union: DiscriminatedUnion,
	definitions: Record<string, unknown>
): { valid: boolean; missingVariants: string[] } => {
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

/**
 * Gets the topological order for generating schemas with discriminated unions
 *
 * Ensures variant schemas are generated before the discriminated union itself
 */
export const getGenerationOrder = (
	definitionNames: string[],
	discriminatedUnions: Map<string, DiscriminatedUnion>
): string[] => {
	const dependencies = new Map<string, Set<string>>();
	const processed = new Set<string>();
	const result: string[] = [];

	// Build dependency graph
	for (const name of definitionNames) {
		dependencies.set(name, new Set());

		const union = discriminatedUnions.get(name);
		if (union) {
			// Discriminated union depends on its variants
			for (const variant of union.variants) {
				dependencies.get(name)!.add(variant.type);
			}
		}
	}

	// Topological sort using DFS
	const visit = (name: string) => {
		if (processed.has(name)) {
			return;
		}

		const deps = dependencies.get(name);
		if (deps) {
			for (const dep of deps) {
				if (definitionNames.includes(dep)) {
					visit(dep);
				}
			}
		}

		processed.add(name);
		result.push(name);
	};

	for (const name of definitionNames) {
		visit(name);
	}

	return result;
};
