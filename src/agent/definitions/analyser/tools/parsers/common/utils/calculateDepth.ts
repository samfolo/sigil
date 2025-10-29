/**
 * Calculates the maximum nesting depth of a structured value
 *
 * Recursively traverses arrays and objects to determine depth.
 * Caps recursion at maxDepth for performance.
 * Returns maxDepth + 1 if depth exceeds the cap (signals non-exact depth).
 *
 * @param value - The value to analyse
 * @param maxDepth - Maximum depth to probe before capping
 * @param current - Current depth level (internal use)
 * @returns Depth value (returns maxDepth + 1 if depth exceeds cap)
 *
 * @example
 * ```typescript
 * calculateDepth('hello', 20)              // 0
 * calculateDepth([1, 2, 3], 20)            // 1
 * calculateDepth({a: {b: {c: 1}}}, 20)     // 3
 * // Returns 21 for deeply nested structures (signals capped)
 * ```
 */
export const calculateDepth = (
	value: unknown,
	maxDepth: number,
	current = 0
): number => {
	// Cap recursion at maxDepth for performance
	if (current >= maxDepth) {
		// Check if there's more structure beyond the cap
		if (Array.isArray(value) && value.length > 0) {
			return maxDepth + 1;
		}
		if (
			value !== null &&
			typeof value === 'object' &&
			Object.keys(value).length > 0
		) {
			return maxDepth + 1;
		}
		return maxDepth;
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

		let maxDepthValue = current + 1;
		for (const element of value) {
			const elementDepth = calculateDepth(element, maxDepth, current + 1);
			if (elementDepth > maxDepthValue) {
				maxDepthValue = elementDepth;
			}
			// Early exit if we detect depth exceeds cap
			if (maxDepthValue > maxDepth) {
				return maxDepthValue;
			}
		}
		return maxDepthValue;
	}

	// Objects: find maximum depth of values
	const keys = Object.keys(value);
	if (keys.length === 0) {
		return current + 1;
	}

	let maxDepthValue = current + 1;
	for (const key of keys) {
		const objValue = (value as Record<string, unknown>)[key];
		const valueDepth = calculateDepth(objValue, maxDepth, current + 1);
		if (valueDepth > maxDepthValue) {
			maxDepthValue = valueDepth;
		}
		// Early exit if we detect depth exceeds cap
		if (maxDepthValue > maxDepth) {
			return maxDepthValue;
		}
	}
	return maxDepthValue;
};
