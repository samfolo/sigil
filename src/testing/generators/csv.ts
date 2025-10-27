/**
 * CSV test data generator
 *
 * Generates realistic CSV data using faker.js and papaparse.
 * Supports custom column definitions with typed generators.
 */

import {faker} from '@faker-js/faker/locale/en_GB';
import papaparse from 'papaparse';

import {applySeed} from './common';
import type {CSVColumnDefinition, CSVColumnType, CSVGeneratorConfig} from './types';

/**
 * Default age range for employee data
 */
const DEFAULT_MIN_AGE = 22;
const DEFAULT_MAX_AGE = 65;

/**
 * Default range for generic numbers
 */
const DEFAULT_MIN_NUMBER = 0;
const DEFAULT_MAX_NUMBER = 1000;

/**
 * Default salary range
 */
const DEFAULT_MIN_SALARY = 30000;
const DEFAULT_MAX_SALARY = 150000;

/**
 * Default currency range
 */
const DEFAULT_MIN_CURRENCY = 1000;
const DEFAULT_MAX_CURRENCY = 100000;

/**
 * Years in past for date generation
 */
const DEFAULT_YEARS_PAST = 5;

/**
 * Default columns for employee dataset
 */
const DEFAULT_COLUMNS: CSVColumnDefinition[] = [
	{name: 'id', type: 'id'},
	{name: 'name', type: 'name'},
	{name: 'email', type: 'email'},
	{name: 'age', type: 'age'},
	{name: 'department', type: 'department'},
	{
		name: 'salary',
		type: 'currency',
		options: {min: DEFAULT_MIN_SALARY, max: DEFAULT_MAX_SALARY},
	},
	{name: 'active', type: 'boolean'},
	{name: 'joinDate', type: 'date'},
];

/**
 * Generates a value for a given column type using faker
 */
const generateValue = (
	type: CSVColumnType,
	index: number,
	options?: {min?: number; max?: number}
): string | number | boolean => {
	switch (type) {
		case 'id':
			return index + 1;

		case 'name':
			return faker.person.fullName();

		case 'email':
			return faker.internet.email();

		case 'age':
			return faker.number.int({
				min: options?.min ?? DEFAULT_MIN_AGE,
				max: options?.max ?? DEFAULT_MAX_AGE,
			});

		case 'date':
			return (
				faker.date.past({years: DEFAULT_YEARS_PAST}).toISOString().split('T').at(0) ?? ''
			);

		case 'boolean':
			return faker.datatype.boolean();

		case 'number':
			return faker.number.int({
				min: options?.min ?? DEFAULT_MIN_NUMBER,
				max: options?.max ?? DEFAULT_MAX_NUMBER,
			});

		case 'currency':
			return faker.number.int({
				min: options?.min ?? DEFAULT_MIN_CURRENCY,
				max: options?.max ?? DEFAULT_MAX_CURRENCY,
			});

		case 'text':
			return faker.lorem.sentence();

		case 'department':
			return faker.commerce.department();

		case 'city':
			return faker.location.city();

		case 'country':
			return faker.location.country();

		case 'phone':
			return faker.phone.number();

		case 'url':
			return faker.internet.url();

		case 'uuid':
			return faker.string.uuid();

		default:
			// This should never happen with proper typing
			return faker.lorem.word();
	}
};

/**
 * Generates realistic CSV data
 *
 * @param config - Generator configuration
 * @returns CSV string with header and data rows
 *
 * @example
 * ```typescript
 * // Generate employee data with default columns
 * const csv = generateCSV({rows: 100, seed: 42});
 *
 * // Generate custom columns
 * const csv = generateCSV({
 *   rows: 50,
 *   columns: [
 *     {name: 'userId', type: 'uuid'},
 *     {name: 'username', type: 'name'},
 *     {name: 'score', type: 'number', options: {min: 0, max: 100}},
 *   ],
 *   seed: 123,
 * });
 * ```
 */
export const generateCSV = (config: CSVGeneratorConfig): string => {
	// Set seed for deterministic generation
	applySeed(config);

	const columns = config.columns ?? DEFAULT_COLUMNS;
	const includeHeader = config.includeHeader ?? true;

	// Generate rows
	const rows = Array.from({length: config.rows}, (_, index) => {
		const row: Record<string, string | number | boolean> = {};

		for (const column of columns) {
			row[column.name] = generateValue(column.type, index, column.options);
		}

		return row;
	});

	// Convert to CSV using papaparse
	return papaparse.unparse(rows, {
		header: includeHeader,
		newline: '\n',
	});
};
