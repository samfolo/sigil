/**
 * JSON test data generator
 *
 * Generates realistic nested JSON structures using faker.js.
 * Supports variable breadth, depth, and nested arrays.
 */

import {faker} from '@faker-js/faker/locale/en_GB';

import {
	ARRAY_PROBABILITY,
	DEFAULT_MAX_ARRAY_LENGTH,
	DEFAULT_MIN_ARRAY_LENGTH,
	NEST_PROBABILITY,
	applySeed,
	generatePrimitive,
	selectUniqueItems,
} from './common';
import type {JSONGeneratorConfig} from './types';

/**
 * Realistic property names for different contexts
 */
const PROPERTY_NAMES = {
	user: ['id', 'username', 'email', 'age', 'active', 'createdAt'],
	profile: ['firstName', 'lastName', 'bio', 'avatar', 'website'],
	address: ['street', 'city', 'postcode', 'country'],
	company: ['name', 'industry', 'employees', 'revenue', 'founded'],
	product: ['id', 'name', 'price', 'category', 'inStock'],
	metadata: ['version', 'updatedAt', 'author', 'tags', 'status'],
	settings: ['theme', 'notifications', 'privacy', 'language'],
};

/**
 * Pool of all property names for random selection
 */
const ALL_PROPERTY_NAMES = Object.values(PROPERTY_NAMES).flat();

/**
 * Generates a nested JSON object or array
 *
 * @param currentDepth - Current depth in the tree
 * @param maxDepth - Maximum allowed depth
 * @param config - Generator configuration
 * @returns Nested object or array structure
 */
const generateNested = (
	currentDepth: number,
	maxDepth: number,
	config: JSONGeneratorConfig
): unknown => {
	// At max depth, return primitive
	if (currentDepth >= maxDepth) {
		return generatePrimitive();
	}

	const includeArrays = config.includeArrays ?? true;

	// Decide whether to create object or array
	const isArray =
		includeArrays && faker.datatype.boolean({probability: ARRAY_PROBABILITY});

	if (isArray) {
		const minLength = config.minArrayLength ?? DEFAULT_MIN_ARRAY_LENGTH;
		const maxLength = config.maxArrayLength ?? DEFAULT_MAX_ARRAY_LENGTH;
		const length = faker.number.int({min: minLength, max: maxLength});

		return Array.from({length}, () =>
			generateNested(currentDepth + 1, maxDepth, config)
		);
	}

	// Create object with variable breadth
	const breadth = faker.number.int({
		min: config.minBreadth,
		max: config.maxBreadth,
	});

	const obj: Record<string, unknown> = {};

	// Get unique property names for this object
	const selectedNames = selectUniqueItems(ALL_PROPERTY_NAMES, breadth);

	// Generate values for each property
	for (const name of selectedNames) {
		// 70% chance of nested structure, 30% primitive
		const shouldNest = faker.datatype.boolean({probability: NEST_PROBABILITY});

		if (shouldNest && currentDepth < maxDepth) {
			obj[name] = generateNested(currentDepth + 1, maxDepth, config);
		} else {
			obj[name] = generatePrimitive();
		}
	}

	return obj;
};

/**
 * Generates realistic nested JSON data
 *
 * @param config - Generator configuration
 * @returns JSON string with formatted output
 *
 * @example
 * ```typescript
 * // Generate single deeply nested object
 * const json = generateJSON({
 *   depth: 4,
 *   minBreadth: 2,
 *   maxBreadth: 5,
 *   seed: 42,
 * });
 *
 * // Generate array of objects
 * const json = generateJSON({
 *   depth: 3,
 *   minBreadth: 3,
 *   maxBreadth: 8,
 *   count: 10,
 *   includeArrays: true,
 *   seed: 123,
 * });
 * ```
 */
export const generateJSON = (config: JSONGeneratorConfig): string => {
	// Set seed for deterministic generation
	applySeed(config);

	const count = config.count ?? 1;

	if (count === 1) {
		const obj = generateNested(0, config.depth, config);
		return JSON.stringify(obj, null, 2);
	}

	// Generate array of objects
	const objects = Array.from({length: count}, () =>
		generateNested(0, config.depth, config)
	);

	return JSON.stringify(objects, null, 2);
};
