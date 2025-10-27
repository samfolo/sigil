/**
 * Common utilities for test data generators
 *
 * Shared functions and constants used across multiple generators to ensure
 * consistency and reduce duplication.
 */

import {faker} from '@faker-js/faker/locale/en_GB';

import type {BaseGeneratorConfig} from './types';

/**
 * Default minimum number for numeric generation
 */
export const DEFAULT_MIN_NUMBER = 0;

/**
 * Default maximum number for numeric generation
 */
export const DEFAULT_MAX_NUMBER = 1000;

/**
 * Default minimum array length
 */
export const DEFAULT_MIN_ARRAY_LENGTH = 2;

/**
 * Default maximum array length
 */
export const DEFAULT_MAX_ARRAY_LENGTH = 5;

/**
 * Probability of generating an array vs object
 */
export const ARRAY_PROBABILITY = 0.3;

/**
 * Probability of nesting deeper vs generating primitive
 */
export const NEST_PROBABILITY = 0.7;

/**
 * Sets faker seed if provided in configuration
 *
 * @param config - Generator configuration with optional seed
 */
export const applySeed = (config: BaseGeneratorConfig): void => {
	if (config.seed !== undefined) {
		faker.seed(config.seed);
	}
};

/**
 * Options for primitive value generation
 */
export interface PrimitiveOptions {
	/**
	 * Whether to include null as a possible value
	 *
	 * @default true
	 */
	includeNull?: boolean;

	/**
	 * Minimum value for numbers
	 *
	 * @default 0
	 */
	minNumber?: number;

	/**
	 * Maximum value for numbers
	 *
	 * @default 1000
	 */
	maxNumber?: number;
}

/**
 * Generates a random primitive value using faker
 *
 * @param options - Configuration for primitive generation
 * @returns Random primitive value (string, number, boolean, or null)
 *
 * @example
 * ```typescript
 * const value = generatePrimitive(); // May include null
 * const value = generatePrimitive({includeNull: false}); // Never null
 * ```
 */
export const generatePrimitive = (
	options: PrimitiveOptions = {}
): string | number | boolean | null => {
	const includeNull = options.includeNull ?? true;
	const minNumber = options.minNumber ?? DEFAULT_MIN_NUMBER;
	const maxNumber = options.maxNumber ?? DEFAULT_MAX_NUMBER;

	const types: Array<'string' | 'number' | 'boolean' | 'date' | 'null'> = [
		'string',
		'number',
		'boolean',
		'date',
	];

	if (includeNull) {
		types.push('null');
	}

	const type = faker.helpers.arrayElement(types);

	switch (type) {
		case 'string':
			return faker.lorem.word();

		case 'number':
			return faker.number.int({min: minNumber, max: maxNumber});

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
 * Selects unique items from a pool
 *
 * @param pool - Array of items to select from
 * @param count - Number of unique items to select
 * @returns Array of selected items (may be fewer than count if pool is small)
 *
 * @example
 * ```typescript
 * const names = ['a', 'b', 'c', 'd', 'e'];
 * const selected = selectUniqueItems(names, 3); // ['b', 'd', 'a']
 * ```
 */
export const selectUniqueItems = <T>(pool: T[], count: number): T[] => {
	const available = [...pool];
	const selected: T[] = [];

	for (let i = 0; i < count && available.length > 0; i++) {
		const index = faker.number.int({min: 0, max: available.length - 1});
		const item = available.at(index);

		if (item !== undefined) {
			selected.push(item);
			available.splice(index, 1);
		}
	}

	return selected;
};
