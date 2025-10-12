/**
 * Code generation utilities for creating Zod schemas from JSON Schema
 */

import {isErr} from '../../../../lib/errors';

import {buildDependencyGraph, topologicalSort} from '../../lib/dependencyAnalyser';
import {
	generateDiscriminatedUnion,
	getDiscriminatedUnions,
	validateDiscriminatedUnionVariants,
} from '../../lib/discriminatedUnions';
import {mapJsonSchemaTypeToZod, toSchemaName} from '../../lib/typeMapper';
import type {JsonSchema, Config, DiscriminatedUnion} from '../../lib/types';


export interface CodegenOptions {
	config: Config;
	bundledSchema: JsonSchema;
}

export interface GeneratedCode {
	imports: string[];
	schemas: string[];
}

/**
 * Generates Zod schema code from a bundled JSON Schema
 */
export const generateZodSchemas = (options: CodegenOptions): GeneratedCode => {
	const {config, bundledSchema} = options;
	const definitions = (bundledSchema.definitions || {}) as Record<string, JsonSchema>;

	// Get discriminated union metadata
	const discriminatedUnions = getDiscriminatedUnions(config);

	// Validate discriminated unions
	for (const [name, union] of discriminatedUnions) {
		const validation = validateDiscriminatedUnionVariants(union, definitions);
		if (isErr(validation)) {
			throw new Error(
				`Discriminated union "${name}" has missing variants: ${validation.error.join(', ')}`
			);
		}
	}

	// Build dependency graph for topological ordering
	const definitionNames = Object.keys(definitions);
	const dependencyGraph = buildDependencyGraph(definitions);
	const orderedNames = topologicalSort(definitionNames, dependencyGraph);

	/**
	 * Identify recursive schemas (schemas involved in dependency cycles)
	 *
	 * Algorithm: Modified Depth-First Search (DFS) cycle detection
	 *
	 * For each schema, we perform a DFS traversal following $ref dependencies.
	 * We maintain a "path" set representing the current traversal path from the
	 * starting schema to the current schema.
	 *
	 * If we encounter a schema already in the current path, we've found a cycle.
	 * All schemas in the cycle portion of the path are marked as recursive.
	 *
	 * Example cycle: A -> B -> C -> B
	 * When visiting B the second time, path = [A, B, C]
	 * We detect B is already in path, so B and C form the cycle.
	 *
	 * Why this matters:
	 * Recursive schemas need special handling in Zod using z.lazy() to prevent
	 * infinite recursion during schema construction.
	 *
	 * Time complexity: O(V + E) where V = schemas, E = dependencies
	 */
	const recursiveSchemas = new Set<string>();
	const visited = new Set<string>(); // Schemas we've fully explored from

	/**
	 * Recursively explores dependencies to find cycles
	 *
	 * @param start - The schema we started exploration from (for visited tracking)
	 * @param current - The schema currently being explored
	 * @param path - Set of schemas in the current traversal path (for cycle detection)
	 */
	const findCycles = (start: string, current: string, path: Set<string>): void => {
		// Cycle detected: current schema is already in our traversal path
		if (path.has(current)) {
			// Mark all schemas in the cycle as recursive
			const cycleSchemas = Array.from(path);
			const cycleStartIndex = cycleSchemas.indexOf(current);

			// Only mark schemas from the cycle start onwards
			// e.g., if path = [A, B, C, D] and we revisit B, only B, C, D are in the cycle
			for (let i = cycleStartIndex; i < cycleSchemas.length; i++) {
				recursiveSchemas.add(cycleSchemas[i]);
			}
			return;
		}

		// Already fully explored this schema from this starting point
		if (visited.has(current)) {
			return;
		}

		// Add current schema to path (for cycle detection)
		path.add(current);

		// Explore all dependencies
		const deps = dependencyGraph.get(current);
		if (deps) {
			for (const dep of deps) {
				// Create a new path Set for each dependency to handle branching correctly
				// This ensures different paths don't interfere with each other
				findCycles(start, dep, new Set(path));
			}
		}

		// Remove current from path as we backtrack
		path.delete(current);

		// Mark as visited only when we return to the starting schema
		// This ensures we fully explore all paths from this starting point
		if (current === start) {
			visited.add(current);
		}
	};

	// Find cycles starting from each schema
	for (const name of definitionNames) {
		if (!visited.has(name)) {
			findCycles(name, name, new Set());
		}
	}

	// Generate schemas
	const schemas: string[] = [];

	for (const name of orderedNames) {
		const schema = definitions[name];
		const union = discriminatedUnions.get(name);
		const isRecursive = recursiveSchemas.has(name);

		if (union) {
			// Generate discriminated union
			const code = generateDiscriminatedUnionSchema(name, union, schema, isRecursive);
			schemas.push(code);
		} else {
			// Generate regular schema
			const code = generateRegularSchema(name, schema, isRecursive);
			schemas.push(code);
		}
	}

	return {
		imports: [
			"import {z} from 'zod';",
		],
		schemas,
	};
};

/**
 * Generates code for a discriminated union schema
 */
const generateDiscriminatedUnionSchema = (
	name: string,
	union: DiscriminatedUnion,
	schema: JsonSchema,
	isRecursive: boolean
): string => {
	const schemaName = toSchemaName(name);

	// Generate description comment if available
	const description = schema.description ? generateDescriptionComment(schema.description as string) : '';

	// For recursive discriminated unions, use z.lazy() with any type hint to avoid circular reference errors
	if (isRecursive) {
		const unionCode = generateDiscriminatedUnion(union);
		return `${description}export const ${schemaName}: any = z.lazy(() => ${unionCode});`;
	}

	// Generate discriminated union - simple, no special recursive handling
	const unionCode = generateDiscriminatedUnion(union);
	return `${description}export const ${schemaName} = ${unionCode};`;
};

/**
 * Generates code for a regular (non-discriminated-union) schema
 */
const generateRegularSchema = (
	name: string,
	schema: JsonSchema,
	isRecursive: boolean
): string => {
	const schemaName = toSchemaName(name);

	// Generate description comment if available
	const description = schema.description ? generateDescriptionComment(schema.description as string) : '';

	// For recursive schemas, use z.lazy() with any type hint to avoid circular reference errors
	if (isRecursive) {
		const zodCode = mapJsonSchemaTypeToZod(schema, name);
		return `${description}export const ${schemaName}: any = z.lazy(() => ${zodCode});`;
	}

	// Map the schema to Zod code - simple, no special recursive handling
	const zodCode = mapJsonSchemaTypeToZod(schema, name);
	return `${description}export const ${schemaName} = ${zodCode};`;
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
	parts.push(' *');
	parts.push(' * Note: TypeScript types are generated separately in lib/generated/types/');
	parts.push(' * Import types from @sigil/lib/generated/types, not from z.infer<>');
	parts.push(' */');
	parts.push('');

	// Add imports
	parts.push(...generated.imports);
	parts.push('');

	// Add schemas only (no type exports)
	parts.push(...generated.schemas);
	parts.push('');

	return parts.join('\n');
};


/**
 * Generates an index.ts that re-exports Zod schemas
 */
export const generateIndexFile = (): string => {
	return `/**
 * Generated Zod schemas for runtime validation
 * DO NOT EDIT MANUALLY
 *
 * For TypeScript types, import from @sigil/lib/generated/types instead
 */

export * from './specification';
`;
};
