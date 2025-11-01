import {JSONPath} from 'jsonpath-plus';

import type {Result} from '@sigil/src/common/errors';
import {err, ok} from '@sigil/src/common/errors';

import type {ExploreStructureOptions, ExploreStructureResult} from './types';

/**
 * Maximum number of object keys to traverse per node
 */
export const MAX_OBJECT_KEYS = 50;

/**
 * Maximum number of array elements to traverse per node
 */
export const MAX_ARRAY_ELEMENTS = 5;

/**
 * Maximum total paths to return
 */
export const MAX_TOTAL_PATHS = 100;

/**
 * Node in BFS queue with path and depth tracking
 */
interface QueueNode {
	value: unknown;
	path: string;
	depth: number;
}

/**
 * Leaf path with depth for sorting
 */
interface LeafPath {
	path: string;
	depth: number;
}

/**
 * Checks if a value is a leaf node
 *
 * Leaf nodes are:
 * - Primitives (string, number, boolean, null, undefined)
 * - Empty collections (empty arrays or empty objects)
 */
const isLeaf = (value: unknown): boolean => {
	// Primitives (loose equality intentionally catches both null and undefined)
	if (value == null || typeof value !== 'object') {
		return true;
	}

	// Empty collections
	if (Array.isArray(value)) {
		return value.length === 0;
	}

	if (typeof value === 'object') {
		return Object.keys(value).length === 0;
	}

	return false;
};

/**
 * Explores parsed data structure and returns leaf node JSONPaths
 *
 * Uses breadth-first traversal to collect only leaf nodes.
 * Applies hard-coded limits to prevent exponential blow-up.
 *
 * @param data - Parsed data structure to explore
 * @param options - Exploration options including maxDepth and optional prefix
 * @returns Result containing leaf paths sorted by depth descending
 */
export const exploreStructure = (
	data: unknown,
	options: ExploreStructureOptions
): Result<ExploreStructureResult, string> => {
	const {maxDepth, prefix} = options;

	// Handle prefix resolution
	let startData = data;
	let startPath = '$';
	let echoedPrefix: string | undefined;

	if (prefix != null && prefix !== '' && prefix !== '$') {
		try {
			const resolved = JSONPath({
				path: prefix,
				json: data,
				wrap: true,
			});

			if (!Array.isArray(resolved)) {
				return err('JSONPath library returned non-array result (expected wrapped array)');
			}

			if (resolved.length === 0) {
				// No matches, return empty result
				return ok({
					paths: {
						value: [],
						exact: true,
					},
					metadata: {
						totalPathsReturned: 0,
						prefix,
					},
				});
			}

			if (resolved.length > 1) {
				return err('Prefix must resolve to exactly one node, but resolved to multiple values');
			}

			startData = resolved.at(0);
			startPath = prefix;
			echoedPrefix = prefix;
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : 'Invalid prefix';
			return err(`Invalid JSONPath prefix: ${errorMessage}`);
		}
	}

	// BFS traversal
	const queue: QueueNode[] = [{value: startData, path: startPath, depth: 0}];
	const leafPaths: LeafPath[] = [];

	while (queue.length > 0 && leafPaths.length < MAX_TOTAL_PATHS) {
		const node = queue.shift()!;
		const {value, path, depth} = node;

		// Check if we're at max depth or this is a leaf
		if (depth >= maxDepth || isLeaf(value)) {
			leafPaths.push({path, depth});
			continue;
		}

		// Traverse arrays
		if (Array.isArray(value)) {
			const elementsToTraverse = Math.min(value.length, MAX_ARRAY_ELEMENTS);
			for (let i = 0; i < elementsToTraverse; i++) {
				queue.push({
					value: value.at(i),
					path: `${path}[${i}]`,
					depth: depth + 1,
				});
			}
			continue;
		}

		// Traverse objects
		if (typeof value === 'object' && value !== null) {
			// Sort keys to consistently select first 50 alphabetically
			// Note: Final leaf paths are also sorted, but that's for output ordering
			const keys = Object.keys(value).sort().slice(0, MAX_OBJECT_KEYS);
			for (const key of keys) {
				const childValue = Reflect.get(value, key);
				const childPath = path === '$' ? `$.${key}` : `${path}.${key}`;
				queue.push({
					value: childValue,
					path: childPath,
					depth: depth + 1,
				});
			}
		}
	}

	// Sort by depth descending, then alphabetically
	const sortedLeafPaths = leafPaths.sort((a, b) => {
		if (a.depth !== b.depth) {
			return b.depth - a.depth; // Descending
		}
		return a.path.localeCompare(b.path); // Alphabetical
	});

	// Cap at maximum and determine if exact
	const cappedLeafPaths = sortedLeafPaths.slice(0, MAX_TOTAL_PATHS);
	const exact = queue.length === 0 && leafPaths.length <= MAX_TOTAL_PATHS;

	// Extract just the paths
	const paths = cappedLeafPaths.map((leaf) => leaf.path);

	return ok({
		paths: {
			value: paths,
			exact,
		},
		metadata: {
			totalPathsReturned: paths.length,
			...(echoedPrefix !== undefined && {prefix: echoedPrefix}),
		},
	});
};
