/**
 * XML test data generator
 *
 * Generates realistic XML structures using faker.js and fast-xml-parser.
 * Supports variable nesting, attributes, and element counts.
 */

import {Faker} from '@faker-js/faker/locale/en_GB';
import {XMLBuilder} from 'fast-xml-parser';

import type {XMLGeneratorConfig} from './types';

/**
 * Default root element name
 */
const DEFAULT_ROOT_ELEMENT = 'root';

/**
 * Default maximum depth
 */
const DEFAULT_MAX_DEPTH = 2;

/**
 * Probability of adding attributes to an element
 */
const ATTRIBUTE_PROBABILITY = 0.5;

/**
 * Maximum number of attributes per element
 */
const MAX_ATTRIBUTES = 3;

/**
 * Default minimum number
 */
const DEFAULT_MIN_NUMBER = 0;

/**
 * Default maximum number
 */
const DEFAULT_MAX_NUMBER = 1000;

/**
 * Element names for different contexts
 */
const ELEMENT_NAMES = [
	'item',
	'entry',
	'record',
	'data',
	'node',
	'element',
	'object',
	'entity',
	'resource',
	'component',
];

/**
 * Attribute names for metadata
 */
const ATTRIBUTE_NAMES = [
	'id',
	'type',
	'status',
	'created',
	'modified',
	'version',
	'author',
];

/**
 * Generates a primitive value for element content or attribute
 */
const generatePrimitive = (faker: Faker): string | number | boolean => {
	const type = faker.helpers.arrayElement(['string', 'number', 'boolean']);

	switch (type) {
		case 'string':
			return faker.lorem.words();

		case 'number':
			return faker.number.int({
				min: DEFAULT_MIN_NUMBER,
				max: DEFAULT_MAX_NUMBER,
			});

		case 'boolean':
			return faker.datatype.boolean().toString();

		default:
			return faker.lorem.word();
	}
};

/**
 * Generates attributes for an element
 */
const generateAttributes = (
	faker: Faker,
	includeAttributes: boolean
): Record<string, string> => {
	if (!includeAttributes) {
		return {};
	}

	const shouldAddAttributes = faker.datatype.boolean({
		probability: ATTRIBUTE_PROBABILITY,
	});

	if (!shouldAddAttributes) {
		return {};
	}

	const attributeCount = faker.number.int({min: 1, max: MAX_ATTRIBUTES});
	const attributes: Record<string, string> = {};

	const availableNames = [...ATTRIBUTE_NAMES];

	for (let i = 0; i < attributeCount && availableNames.length > 0; i++) {
		const index = faker.number.int({min: 0, max: availableNames.length - 1});
		const name = availableNames.at(index);

		if (name) {
			attributes[`@_${name}`] = generatePrimitive(faker).toString();
			availableNames.splice(index, 1);
		}
	}

	return attributes;
};

/**
 * Generates nested XML structure
 */
const generateNested = (
	faker: Faker,
	currentDepth: number,
	maxDepth: number,
	config: XMLGeneratorConfig
): Record<string, unknown> => {
	// At max depth, return primitive value
	if (currentDepth >= maxDepth) {
		return {'#text': generatePrimitive(faker)};
	}

	const includeAttributes = config.includeAttributes ?? true;
	const elementCount = faker.number.int({
		min: config.minElements,
		max: config.maxElements,
	});

	const obj: Record<string, unknown> = {};

	// Add attributes to current element
	const attributes = generateAttributes(faker, includeAttributes);
	Object.assign(obj, attributes);

	// Generate child elements
	const availableNames = [...ELEMENT_NAMES];

	for (let i = 0; i < elementCount && availableNames.length > 0; i++) {
		const index = faker.number.int({min: 0, max: availableNames.length - 1});
		const name = availableNames.at(index);

		if (name) {
			obj[name] = generateNested(faker, currentDepth + 1, maxDepth, config);
			availableNames.splice(index, 1);
		}
	}

	return obj;
};

/**
 * Generates realistic XML data
 *
 * @param config - Generator configuration
 * @returns XML string with formatted output
 *
 * @example
 * ```typescript
 * // Generate simple XML with default settings
 * const xml = generateXML({
 *   minElements: 3,
 *   maxElements: 5,
 *   seed: 42,
 * });
 *
 * // Generate complex XML with custom root and attributes
 * const xml = generateXML({
 *   rootElement: 'catalog',
 *   minElements: 5,
 *   maxElements: 10,
 *   depth: 4,
 *   includeAttributes: true,
 *   seed: 123,
 * });
 * ```
 */
export const generateXML = (config: XMLGeneratorConfig): string => {
	const faker = new Faker({randomizer: {seed: config.seed}});
	const rootElement = config.rootElement ?? DEFAULT_ROOT_ELEMENT;
	const maxDepth = config.depth ?? DEFAULT_MAX_DEPTH;

	const rootContent = generateNested(faker, 0, maxDepth, config);

	const structure = {
		'?xml': {
			'@_version': '1.0',
			'@_encoding': 'UTF-8',
		},
		[rootElement]: rootContent,
	};

	const builder = new XMLBuilder({
		ignoreAttributes: false,
		format: true,
		indentBy: '  ',
	});

	return builder.build(structure);
};
