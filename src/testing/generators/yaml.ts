/**
 * YAML test data generator
 *
 * Generates realistic YAML structures using faker.js and js-yaml.
 * Supports variable nesting, keys, and arrays.
 */

import {faker} from '@faker-js/faker/locale/en_GB';
import * as yaml from 'js-yaml';

import {
	ARRAY_PROBABILITY,
	DEFAULT_MAX_ARRAY_LENGTH,
	DEFAULT_MIN_ARRAY_LENGTH,
	NEST_PROBABILITY,
	applySeed,
	generatePrimitive,
	selectUniqueItems,
} from './common';
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
 * Generates nested YAML structure
 */
const generateNested = (
	currentDepth: number,
	maxDepth: number,
	config: YAMLGeneratorConfig
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

	// Create object with variable keys
	const minKeys = config.minKeys ?? DEFAULT_MIN_KEYS;
	const maxKeys = config.maxKeys ?? DEFAULT_MAX_KEYS;
	const keyCount = faker.number.int({min: minKeys, max: maxKeys});

	const obj: Record<string, unknown> = {};

	// Get unique keys for this object
	const selectedKeys = selectUniqueItems(CONFIG_KEYS, keyCount);

	// Generate values for each key
	for (const key of selectedKeys) {
		// 70% chance of nested structure, 30% primitive
		const shouldNest = faker.datatype.boolean({probability: NEST_PROBABILITY});

		if (shouldNest && currentDepth < maxDepth) {
			obj[key] = generateNested(currentDepth + 1, maxDepth, config);
		} else {
			obj[key] = generatePrimitive();
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
	// Set seed for deterministic generation
	applySeed(config);

	const maxDepth = config.depth ?? DEFAULT_MAX_DEPTH;

	const structure = generateNested(0, maxDepth, config);

	return yaml.dump(structure, {
		indent: 2,
		lineWidth: -1,
		noRefs: true,
	});
};
