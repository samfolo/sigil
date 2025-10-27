/**
 * CSV test data generator
 *
 * Generates realistic CSV data using faker.js and papaparse.
 * Supports custom column definitions with typed generators.
 */

import {Faker} from '@faker-js/faker/locale/en_GB';
import papaparse from 'papaparse';

import type {CSVColumnDefinition, CSVColumnType, CSVGeneratorConfig} from './types';

/**
 * Default columns for employee dataset
 */
const DEFAULT_COLUMNS: CSVColumnDefinition[] = [
	{name: 'id', type: 'id'},
	{name: 'name', type: 'name'},
	{name: 'email', type: 'email'},
	{name: 'age', type: 'age'},
	{name: 'department', type: 'department'},
	{name: 'salary', type: 'currency', options: {min: 30000, max: 150000}},
	{name: 'active', type: 'boolean'},
	{name: 'joinDate', type: 'date'},
];

/**
 * Generates a value for a given column type using faker
 */
const generateValue = (
	faker: Faker,
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
				min: options?.min ?? 22,
				max: options?.max ?? 65,
			});

		case 'date':
			return faker.date.past({years: 5}).toISOString().split('T').at(0) ?? '';

		case 'boolean':
			return faker.datatype.boolean();

		case 'number':
			return faker.number.int({
				min: options?.min ?? 0,
				max: options?.max ?? 1000,
			});

		case 'currency':
			return faker.number.int({
				min: options?.min ?? 1000,
				max: options?.max ?? 100000,
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
	const faker = new Faker({randomizer: {seed: config.seed}});
	const columns = config.columns ?? DEFAULT_COLUMNS;
	const includeHeader = config.includeHeader ?? true;

	// Generate rows
	const rows = Array.from({length: config.rows}, (_, index) => {
		const row: Record<string, string | number | boolean> = {};

		for (const column of columns) {
			row[column.name] = generateValue(faker, column.type, index, column.options);
		}

		return row;
	});

	// Convert to CSV using papaparse
	return papaparse.unparse(rows, {
		header: includeHeader,
		newline: '\n',
	});
};
