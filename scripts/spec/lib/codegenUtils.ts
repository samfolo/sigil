/**
 * Code generation utilities for creating Zod schemas from JSON Schema
 */

import type { JsonSchema, Config } from './types';
import { mapJsonSchemaTypeToZod, toSchemaName, toTypeName } from './typeMapper';
import {
	isDiscriminatedUnion,
	generateDiscriminatedUnion,
	getDiscriminatedUnions,
	validateDiscriminatedUnionVariants,
} from './discriminatedUnions';
import { buildDependencyGraph, topologicalSort } from './dependencyAnalyser';

export interface CodegenOptions {
	config: Config;
	bundledSchema: JsonSchema;
}

export interface GeneratedCode {
	imports: string[];
	schemas: string[];
	exports: string[];
}

/**
 * Generates Zod schema code from a bundled JSON Schema
 */
export const generateZodSchemas = (options: CodegenOptions): GeneratedCode => {
	const { config, bundledSchema } = options;
	const definitions = (bundledSchema.definitions || {}) as Record<string, JsonSchema>;

	// Get discriminated union metadata
	const discriminatedUnions = getDiscriminatedUnions(config);

	// Validate discriminated unions
	for (const [name, union] of discriminatedUnions) {
		const validation = validateDiscriminatedUnionVariants(union, definitions);
		if (!validation.valid) {
			throw new Error(
				`Discriminated union "${name}" has missing variants: ${validation.missingVariants.join(', ')}`
			);
		}
	}

	// Build dependency graph and identify recursive schemas
	const definitionNames = Object.keys(definitions);
	const dependencyGraph = buildDependencyGraph(definitions);
	const recursiveSchemas = identifyRecursiveSchemas(definitionNames, dependencyGraph);
	const orderedNames = topologicalSort(definitionNames, dependencyGraph);

	// Generate schemas
	const schemas: string[] = [];
	const exports: string[] = [];

	for (const name of orderedNames) {
		const schema = definitions[name];
		const union = discriminatedUnions.get(name);
		const isRecursive = recursiveSchemas.has(name);

		if (union) {
			// Generate discriminated union
			const { code, exportCode } = generateDiscriminatedUnionSchema(name, union, schema, isRecursive);
			schemas.push(code);
			exports.push(exportCode);
		} else {
			// Generate regular schema
			const { code, exportCode } = generateRegularSchema(name, schema, isRecursive);
			schemas.push(code);
			exports.push(exportCode);
		}
	}

	return {
		imports: ["import { z } from 'zod';"],
		schemas,
		exports,
	};
};

/**
 * Generates code for a discriminated union schema
 */
const generateDiscriminatedUnionSchema = (
	name: string,
	union: import('./types').DiscriminatedUnion,
	schema: JsonSchema,
	isRecursive: boolean
): { code: string; exportCode: string } => {
	const schemaName = toSchemaName(name);
	const typeName = toTypeName(schemaName);

	// Generate description comment if available
	const description = schema.description ? generateDescriptionComment(schema.description as string) : '';

	// For recursive schemas, we need to use a different approach with getters on variants
	// But discriminated unions with recursive variants are handled differently
	// We just generate them normally - the recursion is in the variant schemas themselves
	const unionCode = generateDiscriminatedUnion(union);

	const code = `${description}export const ${schemaName} = ${unionCode};`;
	const exportCode = `export type ${typeName} = z.infer<typeof ${schemaName}>;`;

	return { code, exportCode };
};

/**
 * Generates code for a regular (non-discriminated-union) schema
 */
const generateRegularSchema = (
	name: string,
	schema: JsonSchema,
	isRecursive: boolean
): { code: string; exportCode: string } => {
	const schemaName = toSchemaName(name);
	const typeName = toTypeName(schemaName);

	// Generate description comment if available
	const description = schema.description ? generateDescriptionComment(schema.description as string) : '';

	// For recursive object schemas, we need to handle them specially
	// Check if this is an object with recursive properties or references to unions it's part of
	if (schema.type === 'object' && schema.properties) {
		const needsRecursiveHandling = checkIfNeedsRecursiveHandling(name, schema, isRecursive);
		if (needsRecursiveHandling.hasRecursiveProps) {
			const code = generateRecursiveObjectSchema(name, schema, description, needsRecursiveHandling.recursiveRefs);
			const exportCode = `export type ${typeName} = z.infer<typeof ${schemaName}>;`;
			return { code, exportCode };
		}
	}

	// Map the schema to Zod code
	const zodCode = mapJsonSchemaTypeToZod(schema, name);

	const code = `${description}export const ${schemaName} = ${zodCode};`;
	const exportCode = `export type ${typeName} = z.infer<typeof ${schemaName}>;`;

	return { code, exportCode };
};

/**
 * Generates a JSDoc description comment
 */
const generateDescriptionComment = (description: string): string => {
	// Split into lines for multi-line descriptions
	const lines = description.split('\n');

	if (lines.length === 1) {
		return `/** ${description} */\n`;
	}

	return `/**\n${lines.map((line) => ` * ${line}`).join('\n')}\n */\n`;
};

/**
 * Assembles the final generated file content
 */
export const assembleGeneratedFile = (generated: GeneratedCode): string => {
	const parts: string[] = [];

	// Add header comment
	parts.push('/**');
	parts.push(' * Generated Zod schemas from JSON Schema specification');
	parts.push(' * DO NOT EDIT MANUALLY - This file is auto-generated');
	parts.push(' * Run `npm run spec:codegen` to regenerate');
	parts.push(' */');
	parts.push('');

	// Add imports
	parts.push(...generated.imports);
	parts.push('');

	// Add schemas
	parts.push(...generated.schemas);
	parts.push('');

	// Add type exports at the end
	parts.push('// Inferred TypeScript types');
	parts.push(...generated.exports);
	parts.push('');

	return parts.join('\n');
};

/**
 * Checks if a schema needs recursive handling (uses forward references)
 */
const checkIfNeedsRecursiveHandling = (
	name: string,
	schema: JsonSchema,
	isRecursive: boolean
): { hasRecursiveProps: boolean; recursiveRefs: Set<string> } => {
	const recursiveRefs = new Set<string>();
	const properties = schema.properties as Record<string, JsonSchema> | undefined;

	if (!properties) {
		return { hasRecursiveProps: false, recursiveRefs };
	}

	// Check each property for forward references
	for (const [_key, propSchema] of Object.entries(properties)) {
		// Direct $ref to same or forward-declared schema
		if (propSchema.$ref && typeof propSchema.$ref === 'string') {
			const refName = propSchema.$ref.match(/#\/definitions\/(.+)$/)?.[1];
			if (refName) {
				recursiveRefs.add(refName);
			}
		}

		// Array items with $ref
		if (
			propSchema.type === 'array' &&
			propSchema.items &&
			typeof propSchema.items === 'object' &&
			'$ref' in propSchema.items &&
			typeof propSchema.items.$ref === 'string'
		) {
			const refName = propSchema.items.$ref.match(/#\/definitions\/(.+)$/)?.[1];
			if (refName) {
				recursiveRefs.add(refName);
			}
		}
	}

	return {
		hasRecursiveProps: recursiveRefs.size > 0 && (isRecursive || recursiveRefs.has(name)),
		recursiveRefs,
	};
};

/**
 * Generates a recursive object schema using Zod v4 getter syntax
 */
const generateRecursiveObjectSchema = (
	name: string,
	schema: JsonSchema,
	description: string,
	recursiveRefs: Set<string>
): string => {
	const schemaName = toSchemaName(name);
	const properties = schema.properties as Record<string, JsonSchema>;
	const required = (schema.required as string[]) || [];
	const additionalProperties = schema.additionalProperties;

	// Build property entries, using getters for forward references
	const propEntries: string[] = [];
	let hasGetterProperties = false;

	for (const [key, propSchema] of Object.entries(properties)) {
		const isRequired = required.includes(key);

		// Check if this property references a forward-declared or recursive schema
		let refSchemaName: string | null = null;
		let isArray = false;

		if (propSchema.$ref && typeof propSchema.$ref === 'string') {
			const refName = propSchema.$ref.match(/#\/definitions\/(.+)$/)?.[1];
			if (refName && recursiveRefs.has(refName)) {
				refSchemaName = toSchemaName(refName);
			}
		} else if (
			propSchema.type === 'array' &&
			propSchema.items &&
			typeof propSchema.items === 'object' &&
			'$ref' in propSchema.items &&
			typeof propSchema.items.$ref === 'string'
		) {
			const refName = propSchema.items.$ref.match(/#\/definitions\/(.+)$/)?.[1];
			if (refName && recursiveRefs.has(refName)) {
				refSchemaName = toSchemaName(refName);
				isArray = true;
			}
		}

		if (refSchemaName) {
			// Use getter for forward-referenced properties with explicit type annotation
			hasGetterProperties = true;
			const zodBaseType = isArray ? `z.ZodArray<typeof ${refSchemaName}>` : `typeof ${refSchemaName}`;
			const zodType = isArray ? `z.array(${refSchemaName})` : refSchemaName;
			const zodTypeName = isRequired ? zodBaseType : `z.ZodOptional<${zodBaseType}>`;
			const finalType = isRequired ? zodType : `${zodType}.optional()`;

			if (propSchema.description) {
				const escapedDesc = JSON.stringify(propSchema.description as string);
				propEntries.push(
					`  get ${JSON.stringify(key)}(): ${zodTypeName} { return ${finalType}.describe(${escapedDesc}) as ${zodTypeName}; }`
				);
			} else {
				propEntries.push(`  get ${JSON.stringify(key)}(): ${zodTypeName} { return ${finalType}; }`);
			}
		} else {
			// Regular property
			let zodSchema = mapJsonSchemaTypeToZod(propSchema, undefined, true);

			if (!isRequired) {
				zodSchema = `${zodSchema}.optional()`;
			}

			if (propSchema.description) {
				const escapedDesc = JSON.stringify(propSchema.description as string);
				zodSchema = `${zodSchema}.describe(${escapedDesc})`;
			}

			propEntries.push(`  ${JSON.stringify(key)}: ${zodSchema}`);
		}
	}

	const objectCode = `z.object({\n${propEntries.join(',\n')}\n})`;

	// For schemas with getters, we can't use .strict() directly on the definition
	// because it evaluates getters during construction
	// Instead, use type assertion to indicate strict mode
	const finalCode = additionalProperties === false && hasGetterProperties
		? `${objectCode} as z.ZodObject<any, "strict">`
		: additionalProperties === false
			? `${objectCode}.strict()`
			: objectCode;

	return `${description}export const ${schemaName} = ${finalCode};`;
};

/**
 * Identifies recursive schemas by detecting cycles in the dependency graph
 */
const identifyRecursiveSchemas = (
	names: string[],
	dependencyGraph: Map<string, Set<string>>
): Set<string> => {
	const recursive = new Set<string>();

	// Check each schema for self-references or cycles
	for (const name of names) {
		const deps = dependencyGraph.get(name);
		if (!deps) {continue;}

		// Direct self-reference
		if (deps.has(name)) {
			recursive.add(name);
			continue;
		}

		// Check for cycles through dependencies
		const visited = new Set<string>();
		const visiting = new Set<string>();

		const hasCycle = (current: string): boolean => {
			if (visited.has(current)) {return false;}
			if (visiting.has(current)) {return true;}

			visiting.add(current);
			const currentDeps = dependencyGraph.get(current);
			if (currentDeps) {
				for (const dep of currentDeps) {
					if (dep === name || hasCycle(dep)) {
						return true;
					}
				}
			}
			visiting.delete(current);
			visited.add(current);
			return false;
		};

		if (hasCycle(name)) {
			recursive.add(name);
		}
	}

	return recursive;
};

/**
 * Generates an index.ts that re-exports everything
 */
export const generateIndexFile = (): string => {
	return `/**
 * Generated Zod schemas and types
 * DO NOT EDIT MANUALLY
 */

export * from './specification';
`;
};
