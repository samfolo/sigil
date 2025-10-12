import {maxBy, meanBy, minBy, sumBy} from 'lodash';

import type {Result} from '@sigil/src/common/errors/result';
import {err, isErr, ok, unwrapOr} from '@sigil/src/common/errors/result';
import {queryJSONPath} from '@sigil/renderer/core/utils/queryJSONPath';

import {extractArray} from '../helpers';

type AggregateOperation = 'sum' | 'average' | 'count' | 'min' | 'max';
type AggregateError = 'invalid_accessor' | 'extraction_failed' | 'field_required' | 'not_an_array';

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
		const result = queryJSONPath(data, field);
		if (isErr(result)) {
			return err('invalid_accessor');
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
	try {
		const arrayData = extractArray(data);
		return ok(arrayData.length);
	} catch (error) {
		return err('extraction_failed');
	}
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
	let arrayData: unknown[];
	try {
		arrayData = extractArray(data);
	} catch (error) {
		return err('extraction_failed');
	}

	if (!field) {
		return err('field_required');
	}

	// Validate accessor by checking first item (fail fast on invalid accessor)
	if (arrayData.length > 0) {
		const testResult = queryJSONPath(arrayData.at(0), field);
		if (isErr(testResult)) {
			return err('invalid_accessor');
		}
	}

	switch (operation) {
		case 'sum': {
			const sum = sumBy(arrayData, (item) => {
				const value = unwrapOr(queryJSONPath(item, field), undefined);
				return Number(value) || 0;
			});
			return ok(sum);
		}
		case 'average': {
			const avg = meanBy(arrayData, (item) => {
				const value = unwrapOr(queryJSONPath(item, field), undefined);
				return Number(value) || 0;
			});
			return ok(avg);
		}
		case 'min': {
			// Filter out null/undefined values before finding min
			const validItems = arrayData.filter((item) => {
				const value = unwrapOr(queryJSONPath(item, field), undefined);
				return value !== null && value !== undefined && value !== '';
			});
			if (validItems.length === 0) {
				return ok(0);
			}
			const minItem = minBy(validItems, (item) => {
				const value = unwrapOr(queryJSONPath(item, field), undefined);
				return Number(value);
			});
			if (!minItem) {
				return ok(0);
			}
			const value = unwrapOr(queryJSONPath(minItem, field), 0);
			return ok(Number(value));
		}
		case 'max': {
			// Filter out null/undefined values before finding max
			const validItems = arrayData.filter((item) => {
				const value = unwrapOr(queryJSONPath(item, field), undefined);
				return value !== null && value !== undefined && value !== '';
			});
			if (validItems.length === 0) {
				return ok(0);
			}
			const maxItem = maxBy(validItems, (item) => {
				const value = unwrapOr(queryJSONPath(item, field), undefined);
				return Number(value);
			});
			if (!maxItem) {
				return ok(0);
			}
			const value = unwrapOr(queryJSONPath(maxItem, field), 0);
			return ok(Number(value));
		}
		default:
			return err('extraction_failed');
	}
};
