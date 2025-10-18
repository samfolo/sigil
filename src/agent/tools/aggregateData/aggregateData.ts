import {maxBy, meanBy, minBy, sumBy} from 'lodash';

import {querySingleValue} from '@sigil/renderer/core/utils/queryJSONPath';
import {ERROR_CODES} from '@sigil/src/common/errors/codes';
import type {Result} from '@sigil/src/common/errors/result';
import {err, isErr, ok, unwrapOr} from '@sigil/src/common/errors/result';
import type {SpecError} from '@sigil/src/common/errors/types';

import {extractArray} from '../helpers';

type AggregateOperation = 'sum' | 'average' | 'count' | 'min' | 'max';

/**
 * Intelligently count items in various data structures
 *
 * @param data - Data to count items in
 * @param field - Optional JSONPath accessor to nested array (must start with `$`)
 * @returns Result containing count, or error
 */
export const countItems = (data: unknown, field: string | null): Result<number, SpecError[]> => {
	// If field is specified, try to count items in that nested path
	if (field) {
		const result = querySingleValue(data, field);
		if (isErr(result)) {
			// Propagate the SpecError array from querySingleValue
			return err(result.error);
		}

		const nestedData = result.data;
		if (Array.isArray(nestedData)) {
			return ok(nestedData.length);
		}
		return err([
			{
				code: ERROR_CODES.NOT_ARRAY,
				severity: 'error',
				category: 'data',
				path: field || '',
				context: {
					actualType: typeof nestedData,
					value: nestedData,
				},
			},
		]);
	}

	// Handle single GeoJSON Feature specially
	if (typeof data === 'object' && data !== null && 'type' in data && data.type === 'Feature') {
		return ok(1);
	}

	// Use extractArray for all other cases
	const arrayResult = extractArray(data);
	if (isErr(arrayResult)) {
		return err(arrayResult.error);
	}
	return ok(arrayResult.data.length);
};

/**
 * Aggregate data by field using various operations
 *
 * @param data - Data to aggregate (can be array, GeoJSON, or nested structure)
 * @param field - JSONPath accessor for count operation (must start with `$`), required for other operations
 * @param operation - Aggregation operation to perform
 * @returns Result containing aggregated value, or error
 */
export const aggregateData = (
	data: unknown,
	field: string | null,
	operation: AggregateOperation
): Result<number, SpecError[]> => {
	// Special handling for count operation
	if (operation === 'count') {
		return countItems(data, field);
	}

	// For other operations, we need an array
	const arrayResult = extractArray(data);
	if (isErr(arrayResult)) {
		return err(arrayResult.error);
	}
	const arrayData = arrayResult.data;

	if (!field) {
		const context: {operation: AggregateOperation; availableFields?: string[]} = {
			operation,
		};

		// If we have data, extract available numeric fields
		if (arrayData.length > 0) {
			const firstItem = arrayData.at(0);
			if (typeof firstItem === 'object' && firstItem !== null) {
				const numericFields = Object.keys(firstItem).filter((key) => {
					const value = (firstItem as Record<string, unknown>)[key];
					return typeof value === 'number';
				});
				if (numericFields.length > 0) {
					context.availableFields = numericFields;
				}
			}
		}

		return err([
			{
				code: ERROR_CODES.FIELD_REQUIRED,
				severity: 'error',
				category: 'data',
				path: '',
				context,
			},
		]);
	}

	// Validate accessor by checking first item (fail fast on invalid accessor or array result)
	if (arrayData.length > 0) {
		const testResult = querySingleValue(arrayData.at(0), field);
		if (isErr(testResult)) {
			// Propagate the SpecError array from querySingleValue
			return err(testResult.error);
		}
	}

	switch (operation) {
		case 'sum': {
			const sum = sumBy(arrayData, (item) => {
				const value = unwrapOr(querySingleValue(item, field), undefined);
				return Number(value) || 0;
			});
			return ok(sum);
		}
		case 'average': {
			const avg = meanBy(arrayData, (item) => {
				const value = unwrapOr(querySingleValue(item, field), undefined);
				return Number(value) || 0;
			});
			return ok(avg);
		}
		case 'min': {
			// Filter out null/undefined values before finding min
			const validItems = arrayData.filter((item) => {
				const value = unwrapOr(querySingleValue(item, field), undefined);
				return value !== null && value !== undefined && value !== '';
			});
			if (validItems.length === 0) {
				return ok(0);
			}
			const minItem = minBy(validItems, (item) => {
				const value = unwrapOr(querySingleValue(item, field), undefined);
				return Number(value);
			});
			if (!minItem) {
				return ok(0);
			}
			const value = unwrapOr(querySingleValue(minItem, field), 0);
			return ok(Number(value));
		}
		case 'max': {
			// Filter out null/undefined values before finding max
			const validItems = arrayData.filter((item) => {
				const value = unwrapOr(querySingleValue(item, field), undefined);
				return value !== null && value !== undefined && value !== '';
			});
			if (validItems.length === 0) {
				return ok(0);
			}
			const maxItem = maxBy(validItems, (item) => {
				const value = unwrapOr(querySingleValue(item, field), undefined);
				return Number(value);
			});
			if (!maxItem) {
				return ok(0);
			}
			const value = unwrapOr(querySingleValue(maxItem, field), 0);
			return ok(Number(value));
		}
		default:
			// This should never happen as all operations are handled above
			return err([
				{
					code: ERROR_CODES.FIELD_REQUIRED,
					severity: 'error',
					category: 'data',
					path: '',
					context: {
						operation,
					},
				},
			]);
	}
};
