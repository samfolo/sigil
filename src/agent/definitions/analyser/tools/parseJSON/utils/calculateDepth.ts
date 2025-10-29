import {MAX_JSON_DEPTH} from '../types';

/**
 * Calculates the maximum nesting depth of a JSON value
 *
 * Recursively traverses arrays and objects to determine depth.
 * Caps recursion at MAX_JSON_DEPTH for performance.
 * Returns MAX_JSON_DEPTH + 1 if depth exceeds the cap (signals non-exact depth).
 *
 * @param value - The JSON value to analyse
 * @param current - Current depth level (internal use)
 * @returns Depth value (returns MAX_JSON_DEPTH + 1 if depth exceeds cap)
 *
 * @example
 * ```typescript
 * calculateDepth('hello')              // 0
 * calculateDepth([1, 2, 3])            // 1
 * calculateDepth({a: {b: {c: 1}}})     // 3
 * // Returns 21 for deeply nested structures (signals capped)
 * ```
 */
export const calculateDepth = (value: unknown, current = 0): number => {
	// Cap recursion at MAX_JSON_DEPTH for performance
	if (current >= MAX_JSON_DEPTH) {
		// Check if there's more structure beyond the cap
		if (Array.isArray(value) && value.length > 0) {
			return MAX_JSON_DEPTH + 1;
		}
		if (
			value !== null &&
			typeof value === 'object' &&
			Object.keys(value).length > 0
		) {
			return MAX_JSON_DEPTH + 1;
		}
		return MAX_JSON_DEPTH;
	}

	// Primitives and null have depth of current level
	if (value === null || typeof value !== 'object') {
		return current;
	}

	// Arrays: find maximum depth of elements
	if (Array.isArray(value)) {
		if (value.length === 0) {
			return current + 1;
		}

		let maxDepth = current + 1;
		for (const element of value) {
			const elementDepth = calculateDepth(element, current + 1);
			if (elementDepth > maxDepth) {
				maxDepth = elementDepth;
			}
			// Early exit if we detect depth exceeds cap
			if (maxDepth > MAX_JSON_DEPTH) {
				return maxDepth;
			}
		}
		return maxDepth;
	}

	// Objects: find maximum depth of values
	const keys = Object.keys(value);
	if (keys.length === 0) {
		return current + 1;
	}

	let maxDepth = current + 1;
	for (const key of keys) {
		const objValue = (value as Record<string, unknown>)[key];
		const valueDepth = calculateDepth(objValue, current + 1);
		if (valueDepth > maxDepth) {
			maxDepth = valueDepth;
		}
		// Early exit if we detect depth exceeds cap
		if (maxDepth > MAX_JSON_DEPTH) {
			return maxDepth;
		}
	}
	return maxDepth;
};
