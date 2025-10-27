/**
 * YAML test data generator
 *
 * Generates realistic YAML structures using faker.js and js-yaml.
 * Supports variable nesting, keys, and arrays.
 */

import {Faker} from '@faker-js/faker/locale/en_GB';
import * as yaml from 'js-yaml';

import type {YAMLGeneratorConfig} from './types';

/**
 * Default maximum depth
 */
const DEFAULT_MAX_DEPTH = 3;

/**
 * Default minimum keys per object
 */
const DEFAULT_MIN_KEYS = 2;

/**
 * Default maximum keys per object
 */
const DEFAULT_MAX_KEYS = 5;

/**
 * Default minimum array length
 */
const DEFAULT_MIN_ARRAY_LENGTH = 2;

/**
 * Default maximum array length
 */
const DEFAULT_MAX_ARRAY_LENGTH = 5;

/**
 * Probability of generating an array vs object
 */
const ARRAY_PROBABILITY = 0.3;

/**
 * Probability of nesting deeper vs generating primitive
 */
const NEST_PROBABILITY = 0.7;

/**
 * Default minimum number
 */
const DEFAULT_MIN_NUMBER = 0;

/**
 * Default maximum number
 */
const DEFAULT_MAX_NUMBER = 1000;

/**
 * Realistic configuration keys
 */
const CONFIG_KEYS = [
	'server',
	'database',
	'api',
	'settings',
	'options',
	'config',
	'metadata',
	'parameters',
	'environment',
	'credentials',
	'features',
	'services',
	'routes',
	'handlers',
	'middleware',
	'plugins',
	'extensions',
];

/**
 * Generates a primitive value
 */
const generatePrimitive = (faker: Faker): string | number | boolean | null => {
	const type = faker.helpers.arrayElement([
		'string',
		'number',
		'boolean',
		'null',
	]);

	switch (type) {
		case 'string':
			return faker.lorem.word();

		case 'number':
			return faker.number.int({min: DEFAULT_MIN_NUMBER, max: DEFAULT_MAX_NUMBER});

		case 'boolean':
			return faker.datatype.boolean();

		case 'null':
			return null;

		default:
			return faker.lorem.word();
	}
};

/**
 * Generates nested YAML structure
 */
const generateNested = (
	faker: Faker,
	currentDepth: number,
	maxDepth: number,
	config: YAMLGeneratorConfig
): unknown => {
	// At max depth, return primitive
	if (currentDepth >= maxDepth) {
		return generatePrimitive(faker);
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
			generateNested(faker, currentDepth + 1, maxDepth, config)
		);
	}

	// Create object with variable keys
	const minKeys = config.minKeys ?? DEFAULT_MIN_KEYS;
	const maxKeys = config.maxKeys ?? DEFAULT_MAX_KEYS;
	const keyCount = faker.number.int({min: minKeys, max: maxKeys});

	const obj: Record<string, unknown> = {};

	// Get unique keys for this object
	const availableKeys = [...CONFIG_KEYS];
	const selectedKeys: string[] = [];

	for (let i = 0; i < keyCount && availableKeys.length > 0; i++) {
		const index = faker.number.int({min: 0, max: availableKeys.length - 1});
		const key = availableKeys.at(index);

		if (key) {
			selectedKeys.push(key);
			availableKeys.splice(index, 1);
		}
	}

	// Generate values for each key
	for (const key of selectedKeys) {
		// 70% chance of nested structure, 30% primitive
		const shouldNest = faker.datatype.boolean({probability: NEST_PROBABILITY});

		if (shouldNest && currentDepth < maxDepth) {
			obj[key] = generateNested(faker, currentDepth + 1, maxDepth, config);
		} else {
			obj[key] = generatePrimitive(faker);
		}
	}

	return obj;
};

/**
 * Generates realistic YAML data
 *
 * @param config - Generator configuration
 * @returns YAML string with formatted output
 *
 * @example
 * ```typescript
 * // Generate simple YAML with default settings
 * const yamlData = generateYAML({seed: 42});
 *
 * // Generate complex nested YAML
 * const yamlData = generateYAML({
 *   depth: 4,
 *   minKeys: 3,
 *   maxKeys: 8,
 *   includeArrays: true,
 *   seed: 123,
 * });
 * ```
 */
export const generateYAML = (config: YAMLGeneratorConfig): string => {
	const faker = new Faker({randomizer: {seed: config.seed}});
	const maxDepth = config.depth ?? DEFAULT_MAX_DEPTH;

	const structure = generateNested(faker, 0, maxDepth, config);

	return yaml.dump(structure, {
		indent: 2,
		lineWidth: -1,
		noRefs: true,
	});
};
