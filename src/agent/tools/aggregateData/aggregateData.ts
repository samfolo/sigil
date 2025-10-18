import {maxBy, meanBy, minBy, sumBy} from 'lodash';

import {querySingleValue} from '@sigil/renderer/core/utils/queryJSONPath';
import type {Result} from '@sigil/src/common/errors/result';
import {err, isErr, ok, unwrapOr} from '@sigil/src/common/errors/result';
import type {SpecError} from '@sigil/src/common/errors/types';

import {extractArray} from '../helpers';

type AggregateOperation = 'sum' | 'average' | 'count' | 'min' | 'max';
type AggregateError = 'not_array' | 'no_array_property' | 'field_required' | 'not_an_array' | SpecError[];

/**
 * Intelligently count items in various data structures
 *
 * @param data - Data to count items in
 * @param field - Optional JSONPath accessor to nested array (must start with `$`)
 * @returns Result containing count, or error
 */
export const countItems = (data: unknown, field: string | null): Result<number, AggregateError> => {
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
		return err('not_an_array');
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
): Result<number, AggregateError> => {
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
		return err('field_required');
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
			return err('field_required');
	}
};
