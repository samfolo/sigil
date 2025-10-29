import {describe, expect, it} from 'vitest';

import {ERROR_CODES} from '@sigil/src/common/errors';
import {isErr} from '@sigil/src/common/errors/result';

import {aggregateData, countItems} from './aggregateData';

describe('countItems - error handling', () => {
	describe('NOT_ARRAY error when field points to non-array', () => {
		it.each([
			{description: 'string value', value: 'hello', expectedType: 'string'},
			{description: 'number value', value: 42, expectedType: 'number'},
			{description: 'boolean value', value: true, expectedType: 'boolean'},
			{description: 'object value', value: {name: 'test'}, expectedType: 'object'},
			{description: 'null value', value: null, expectedType: 'object'},
		])('should return NOT_ARRAY error for $description', ({value, expectedType}) => {
			const data = {nested: value};
			const result = countItems(data, '$.nested');

			expect(isErr(result)).toBe(true);

			if (isErr(result)) {
				expect(result.error).toHaveLength(1);
				const error = result.error.at(0);
				expect(error?.code).toBe(ERROR_CODES.NOT_ARRAY);
				expect(error?.severity).toBe('error');
				expect(error?.category).toBe('data');
				expect(error?.path).toBe('$.nested');
				if (error?.code === ERROR_CODES.NOT_ARRAY) {
					expect(error.context.actualType).toBe(expectedType);
					expect(error.context.value).toEqual(value);
				}
			}
		});

		it('should include nested path in error for deeply nested non-array', () => {
			const data = {
				level1: {
					level2: {
						level3: 'not an array',
					},
				},
			};
			const result = countItems(data, '$.level1.level2.level3');

			expect(isErr(result)).toBe(true);

			if (isErr(result)) {
				const error = result.error.at(0);
				expect(error?.code).toBe(ERROR_CODES.NOT_ARRAY);
				expect(error?.path).toBe('$.level1.level2.level3');
				if (error?.code === ERROR_CODES.NOT_ARRAY) {
					expect(error.context.actualType).toBe('string');
					expect(error.context.value).toBe('not an array');
				}
			}
		});
	});
});

describe('aggregateData - error handling', () => {
	describe('FIELD_REQUIRED error for operations without field', () => {
		it.each([
			{operation: 'sum' as const},
			{operation: 'average' as const},
			{operation: 'min' as const},
			{operation: 'max' as const},
		])('should return FIELD_REQUIRED error for $operation without field', ({operation}) => {
			const data = [{value: 10}, {value: 20}, {value: 30}];
			const result = aggregateData(data, null, operation);

			expect(isErr(result)).toBe(true);

			if (isErr(result)) {
				expect(result.error).toHaveLength(1);
				const error = result.error.at(0);
				expect(error?.code).toBe(ERROR_CODES.FIELD_REQUIRED);
				expect(error?.severity).toBe('error');
				expect(error?.category).toBe('data');
				expect(error?.path).toBe('');
				if (error?.code === ERROR_CODES.FIELD_REQUIRED) {
					expect(error.context.operation).toBe(operation);
				}
			}
		});

		it('should include availableFields in context when data has numeric fields', () => {
			const data = [
				{price: 100, quantity: 5, name: 'Item 1'},
				{price: 200, quantity: 3, name: 'Item 2'},
			];
			const result = aggregateData(data, null, 'sum');

			expect(isErr(result)).toBe(true);

			if (isErr(result)) {
				const error = result.error.at(0);
				expect(error?.code).toBe(ERROR_CODES.FIELD_REQUIRED);
				if (error?.code === ERROR_CODES.FIELD_REQUIRED) {
					expect(error.context.operation).toBe('sum');
					expect(error.context.availableFields).toEqual(['price', 'quantity']);
				}
			}
		});

		it('should not include availableFields when no numeric fields exist', () => {
			const data = [
				{name: 'Item 1', description: 'A test item'},
				{name: 'Item 2', description: 'Another test item'},
			];
			const result = aggregateData(data, null, 'average');

			expect(isErr(result)).toBe(true);

			if (isErr(result)) {
				const error = result.error.at(0);
				expect(error?.code).toBe(ERROR_CODES.FIELD_REQUIRED);
				if (error?.code === ERROR_CODES.FIELD_REQUIRED) {
					expect(error.context.operation).toBe('average');
					expect(error.context.availableFields).toBeUndefined();
				}
			}
		});

		it('should not include availableFields for empty array', () => {
			const data: unknown[] = [];
			const result = aggregateData(data, null, 'min');

			expect(isErr(result)).toBe(true);

			if (isErr(result)) {
				const error = result.error.at(0);
				expect(error?.code).toBe(ERROR_CODES.FIELD_REQUIRED);
				if (error?.code === ERROR_CODES.FIELD_REQUIRED) {
					expect(error.context.operation).toBe('min');
					expect(error.context.availableFields).toBeUndefined();
				}
			}
		});

		it('should not include availableFields when first item is not an object', () => {
			const data = [10, 20, 30];
			const result = aggregateData(data, null, 'max');

			expect(isErr(result)).toBe(true);

			if (isErr(result)) {
				const error = result.error.at(0);
				expect(error?.code).toBe(ERROR_CODES.FIELD_REQUIRED);
				if (error?.code === ERROR_CODES.FIELD_REQUIRED) {
					expect(error.context.operation).toBe('max');
					expect(error.context.availableFields).toBeUndefined();
				}
			}
		});

		it('should only include numeric fields, filtering out string and boolean fields', () => {
			const data = [
				{
					id: 1,
					name: 'Product',
					price: 99.99,
					inStock: true,
					quantity: 50,
					description: 'A product',
				},
			];
			const result = aggregateData(data, null, 'sum');

			expect(isErr(result)).toBe(true);

			if (isErr(result)) {
				const error = result.error.at(0);
				if (error?.code === ERROR_CODES.FIELD_REQUIRED) {
					expect(error.context.availableFields).toEqual(['id', 'price', 'quantity']);
				}
			}
		});
	});
});
