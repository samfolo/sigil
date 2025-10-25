import {describe, expect, it} from 'vitest';

import {ERROR_CODES} from '@sigil/src/common/errors';
import {isErr, isOk} from '@sigil/src/common/errors/result';

import {extractArray} from './helpers';

describe('extractArray - error handling', () => {
	describe('MISSING_ARRAY_PROPERTY error', () => {
		it('should return MISSING_ARRAY_PROPERTY when object has no common array properties', () => {
			const data = {
				id: 1,
				name: 'Test',
				metadata: {description: 'Some data'},
			};
			const result = extractArray(data);

			expect(isErr(result)).toBe(true);

			if (isErr(result)) {
				expect(result.error).toHaveLength(1);
				const error = result.error.at(0);
				expect(error?.code).toBe(ERROR_CODES.MISSING_ARRAY_PROPERTY);
				expect(error?.severity).toBe('error');
				expect(error?.category).toBe('data');
				expect(error?.path).toBe('');
			}
		});

		it('should include attemptedProperties in context', () => {
			const data = {id: 1, name: 'Test'};
			const result = extractArray(data);

			expect(isErr(result)).toBe(true);

			if (isErr(result)) {
				const error = result.error.at(0);
				expect(error?.context.attemptedProperties).toEqual([
					'features',
					'items',
					'data',
					'results',
					'records',
					'rows',
				]);
			}
		});

		it('should include objectKeys in context', () => {
			const data = {
				productId: 123,
				productName: 'Widget',
				price: 99.99,
			};
			const result = extractArray(data);

			expect(isErr(result)).toBe(true);

			if (isErr(result)) {
				const error = result.error.at(0);
				expect(error?.context.objectKeys).toEqual(['productId', 'productName', 'price']);
			}
		});

		it('should include objectKeys for empty object', () => {
			const data = {};
			const result = extractArray(data);

			expect(isErr(result)).toBe(true);

			if (isErr(result)) {
				const error = result.error.at(0);
				expect(error?.context.objectKeys).toEqual([]);
			}
		});

		describe('suggestion generation with Levenshtein distance', () => {
			it('should suggest similar field name when available', () => {
				const data = {
					id: 1,
					itms: [{name: 'Item 1'}, {name: 'Item 2'}],
				};
				const result = extractArray(data);

				expect(isErr(result)).toBe(true);

				if (isErr(result)) {
					const error = result.error.at(0);
					// 'itms' should be similar to 'items' (distance: 1)
					expect(error?.suggestion).toBeDefined();
					expect(error?.suggestion).toContain('itms');
				}
			});

			it('should suggest field similar to "features"', () => {
				const data = {
					fetures: [{id: 1}, {id: 2}],
					metadata: {count: 2},
				};
				const result = extractArray(data);

				expect(isErr(result)).toBe(true);

				if (isErr(result)) {
					const error = result.error.at(0);
					// 'fetures' should be similar to 'features' (distance: 1)
					expect(error?.suggestion).toBeDefined();
					expect(error?.suggestion).toContain('fetures');
				}
			});

			it('should suggest field similar to "data"', () => {
				const data = {
					dat: [1, 2, 3],
					config: {version: 1},
				};
				const result = extractArray(data);

				expect(isErr(result)).toBe(true);

				if (isErr(result)) {
					const error = result.error.at(0);
					// 'dat' should be similar to 'data' (distance: 1)
					expect(error?.suggestion).toBeDefined();
					expect(error?.suggestion).toContain('dat');
				}
			});

			it('should not include suggestion when no similar field exists', () => {
				const data = {
					id: 123,
					name: 'Test',
					config: {version: 1},
				};
				const result = extractArray(data);

				expect(isErr(result)).toBe(true);

				if (isErr(result)) {
					const error = result.error.at(0);
					// No field should be similar enough to common array properties
					expect(error?.suggestion).toBeUndefined();
				}
			});

			it('should return first matching suggestion from multiple similar fields', () => {
				const data = {
					id: 1,
					fetures: [1, 2, 3],
					itms: [4, 5, 6],
				};
				const result = extractArray(data);

				expect(isErr(result)).toBe(true);

				if (isErr(result)) {
					const error = result.error.at(0);
					// Should find a suggestion for either 'features' or 'items'
					expect(error?.suggestion).toBeDefined();
					// The first matching suggestion should be found
					expect(error?.suggestion?.includes('fetures') || error?.suggestion?.includes('itms')).toBe(
						true
					);
				}
			});
		});

		it('should handle GeoJSON FeatureCollection with non-array features', () => {
			const data = {
				type: 'FeatureCollection',
				features: 'not an array', // Invalid GeoJSON
			};
			const result = extractArray(data);

			expect(isErr(result)).toBe(true);

			if (isErr(result)) {
				const error = result.error.at(0);
				expect(error?.code).toBe(ERROR_CODES.MISSING_ARRAY_PROPERTY);
				expect(error?.context.objectKeys).toEqual(['type', 'features']);
			}
		});

		it('should handle GeoJSON GeometryCollection with non-array geometries', () => {
			const data = {
				type: 'GeometryCollection',
				geometries: 'not an array', // Invalid GeoJSON
			};
			const result = extractArray(data);

			expect(isErr(result)).toBe(true);

			if (isErr(result)) {
				const error = result.error.at(0);
				expect(error?.code).toBe(ERROR_CODES.MISSING_ARRAY_PROPERTY);
				expect(error?.context.objectKeys).toEqual(['type', 'geometries']);
			}
		});
	});

	describe('NOT_ARRAY error for primitives', () => {
		it.each([
			{description: 'string', value: 'hello', expectedType: 'string'},
			{description: 'number', value: 42, expectedType: 'number'},
			{description: 'boolean true', value: true, expectedType: 'boolean'},
			{description: 'boolean false', value: false, expectedType: 'boolean'},
			{description: 'undefined', value: undefined, expectedType: 'undefined'},
		])('should return NOT_ARRAY error for $description', ({value, expectedType}) => {
			const result = extractArray(value);

			expect(isErr(result)).toBe(true);

			if (isErr(result)) {
				expect(result.error).toHaveLength(1);
				const error = result.error.at(0);
				expect(error?.code).toBe(ERROR_CODES.NOT_ARRAY);
				expect(error?.severity).toBe('error');
				expect(error?.category).toBe('data');
				expect(error?.path).toBe('');
				expect(error?.context.actualType).toBe(expectedType);
			}
		});

		it('should not include suggestion for primitive types', () => {
			const result = extractArray('test string');

			expect(isErr(result)).toBe(true);

			if (isErr(result)) {
				const error = result.error.at(0);
				expect(error?.code).toBe(ERROR_CODES.NOT_ARRAY);
				expect(error?.suggestion).toBeUndefined();
			}
		});
	});

	describe('successful extraction (validation of error boundaries)', () => {
		it('should successfully extract direct arrays', () => {
			const data = [1, 2, 3];
			const result = extractArray(data);

			expect(isOk(result)).toBe(true);

			if (isOk(result)) {
				expect(result.data).toEqual([1, 2, 3]);
			}
		});

		it('should successfully extract from GeoJSON FeatureCollection', () => {
			const data = {
				type: 'FeatureCollection',
				features: [{type: 'Feature'}, {type: 'Feature'}],
			};
			const result = extractArray(data);

			expect(isOk(result)).toBe(true);

			if (isOk(result)) {
				expect(result.data).toHaveLength(2);
			}
		});

		it('should successfully extract from object with common array property', () => {
			const data = {
				items: [1, 2, 3],
				metadata: {count: 3},
			};
			const result = extractArray(data);

			expect(isOk(result)).toBe(true);

			if (isOk(result)) {
				expect(result.data).toEqual([1, 2, 3]);
			}
		});
	});
});
