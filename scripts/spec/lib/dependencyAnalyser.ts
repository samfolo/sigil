/**
 * Dependency analysis for schema generation order
 *
 * Analyses $ref dependencies to determine the correct generation order
 */

import type { JsonSchema } from './types';
import { extractRefName } from './typeMapper';

/**
 * Extracts all $ref dependencies from a schema
 */
export const extractDependencies = (schema: JsonSchema): Set<string> => {
	const deps = new Set<string>();

	const traverse = (obj: unknown) => {
		if (!obj || typeof obj !== 'object') {
			return;
		}

		if (Array.isArray(obj)) {
			obj.forEach(traverse);
			return;
		}

		const record = obj as Record<string, unknown>;

		// Check for $ref
		if (record.$ref && typeof record.$ref === 'string') {
			const refName = extractRefName(record.$ref);
			if (refName) {
				deps.add(refName);
			}
		}

		// Recursively traverse all values
		Object.values(record).forEach(traverse);
	};

	traverse(schema);
	return deps;
};

/**
 * Builds a dependency graph for all definitions
 */
export const buildDependencyGraph = (
	definitions: Record<string, JsonSchema>
): Map<string, Set<string>> => {
	const graph = new Map<string, Set<string>>();

	for (const [name, schema] of Object.entries(definitions)) {
		const deps = extractDependencies(schema);
		graph.set(name, deps);
	}

	return graph;
};

/**
 * Performs topological sort to determine generation order
 * Returns schemas in dependency order (dependencies first)
 */
export const topologicalSort = (
	names: string[],
	dependencyGraph: Map<string, Set<string>>
): string[] => {
	const result: string[] = [];
	const visited = new Set<string>();
	const visiting = new Set<string>(); // For cycle detection

	const visit = (name: string) => {
		// Already processed
		if (visited.has(name)) {
			return;
		}

		// Cycle detected
		if (visiting.has(name)) {
			console.warn(`Warning: Circular dependency detected involving "${name}"`);
			return;
		}

		visiting.add(name);

		// Visit dependencies first
		const deps = dependencyGraph.get(name) || new Set();
		for (const dep of deps) {
			// Only visit if it's in the list of names to generate
			if (names.includes(dep)) {
				visit(dep);
			}
		}

		visiting.delete(name);
		visited.add(name);
		result.push(name);
	};

	for (const name of names) {
		visit(name);
	}

	return result;
};
