/**
 * JSON test data generator
 *
 * Generates realistic nested JSON structures using faker.js.
 * Supports variable breadth, depth, and nested arrays.
 */

import {Faker} from '@faker-js/faker/locale/en_GB';

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
 * Generates a primitive value using faker
 */
const generatePrimitive = (faker: Faker): string | number | boolean | null => {
	const type = faker.helpers.arrayElement([
		'string',
		'number',
		'boolean',
		'date',
		'null',
	]);

	switch (type) {
		case 'string':
			return faker.lorem.word();

		case 'number':
			return faker.number.int({min: 0, max: 1000});

		case 'boolean':
			return faker.datatype.boolean();

		case 'date':
			return faker.date.past().toISOString();

		case 'null':
			return null;

		default:
			return faker.lorem.word();
	}
};

/**
 * Generates a nested JSON object or array
 *
 * @param faker - Faker instance with seed
 * @param currentDepth - Current depth in the tree
 * @param maxDepth - Maximum allowed depth
 * @param config - Generator configuration
 * @returns Nested object or array structure
 */
const generateNested = (
	faker: Faker,
	currentDepth: number,
	maxDepth: number,
	config: JSONGeneratorConfig
): unknown => {
	// At max depth, return primitive
	if (currentDepth >= maxDepth) {
		return generatePrimitive(faker);
	}

	const includeArrays = config.includeArrays ?? true;

	// Decide whether to create object or array
	const isArray =
		includeArrays && faker.datatype.boolean({probability: 0.3});

	if (isArray) {
		const minLength = config.minArrayLength ?? 2;
		const maxLength = config.maxArrayLength ?? 5;
		const length = faker.number.int({min: minLength, max: maxLength});

		return Array.from({length}, () =>
			generateNested(faker, currentDepth + 1, maxDepth, config)
		);
	}

	// Create object with variable breadth
	const breadth = faker.number.int({
		min: config.minBreadth,
		max: config.maxBreadth,
	});

	const obj: Record<string, unknown> = {};

	// Get unique property names for this object
	const availableNames = [...ALL_PROPERTY_NAMES];
	const selectedNames: string[] = [];

	for (let i = 0; i < breadth && availableNames.length > 0; i++) {
		const index = faker.number.int({min: 0, max: availableNames.length - 1});
		const name = availableNames.at(index);

		if (name) {
			selectedNames.push(name);
			availableNames.splice(index, 1);
		}
	}

	// Generate values for each property
	for (const name of selectedNames) {
		// 70% chance of nested structure, 30% primitive
		const shouldNest = faker.datatype.boolean({probability: 0.7});

		if (shouldNest && currentDepth < maxDepth) {
			obj[name] = generateNested(faker, currentDepth + 1, maxDepth, config);
		} else {
			obj[name] = generatePrimitive(faker);
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
	const faker = new Faker({randomizer: {seed: config.seed}});
	const count = config.count ?? 1;

	if (count === 1) {
		const obj = generateNested(faker, 0, config.depth, config);
		return JSON.stringify(obj, null, 2);
	}

	// Generate array of objects
	const objects = Array.from({length: count}, () =>
		generateNested(faker, 0, config.depth, config)
	);

	return JSON.stringify(objects, null, 2);
};
