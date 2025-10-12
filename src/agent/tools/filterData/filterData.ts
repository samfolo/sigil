import type {Result} from '@sigil/src/common/errors/result';
import {err, isErr, ok, unwrapOr} from '@sigil/src/common/errors/result';
import {queryJSONPath} from '@sigil/renderer/core/utils/queryJSONPath';

import {extractArray, wrapArray} from '../helpers';

type FilterOperator = 'equals' | 'contains' | 'greaterThan' | 'lessThan';
type FilterError = 'invalid_accessor' | 'extraction_failed';

/**
 * Filter an array of data by field value using various operators
 *
 * @param data - Data to filter (can be array, GeoJSON, or nested structure)
 * @param field - JSONPath accessor (must start with `$`)
 * @param operator - Filter operator to apply
 * @param value - Value to compare against
 * @returns Result containing filtered data in original structure, or error
 */
export const filterData = (
	data: unknown,
	field: string,
	operator: FilterOperator,
	value: unknown
): Result<unknown, FilterError> => {
	// Extract array from data structure
	let arrayData: unknown[];
	try {
		arrayData = extractArray(data);
	} catch (error) {
		return err('extraction_failed');
	}

	// Validate accessor by checking first item (fail fast on invalid accessor)
	if (arrayData.length > 0) {
		const testResult = queryJSONPath(arrayData.at(0), field);
		if (isErr(testResult)) {
			return err('invalid_accessor');
		}
	}

	const filtered = arrayData.filter((item) => {
		const fieldValue = unwrapOr(queryJSONPath(item, field), undefined);

		switch (operator) {
			case 'equals':
				return fieldValue === value;
			case 'contains':
				if (typeof fieldValue === 'string') {
					return fieldValue
						.toLocaleLowerCase()
						.includes(String(value).toLocaleLowerCase());
				}
				return false;
			case 'greaterThan': {
				// Handle booleans
				const a = typeof fieldValue === 'boolean' ? Number(fieldValue) : fieldValue;
				const b = typeof value === 'boolean' ? Number(value) : value;

				// Use localeCompare for strings, numeric comparison for numbers
				if (typeof a === 'string' && typeof b === 'string') {
					return a.localeCompare(b, undefined, {numeric: true}) > 0;
				}
				return Number(a) > Number(b);
			}
			case 'lessThan': {
				// Handle booleans
				const a = typeof fieldValue === 'boolean' ? Number(fieldValue) : fieldValue;
				const b = typeof value === 'boolean' ? Number(value) : value;

				// Use localeCompare for strings, numeric comparison for numbers
				if (typeof a === 'string' && typeof b === 'string') {
					return a.localeCompare(b, undefined, {numeric: true}) < 0;
				}
				return Number(a) < Number(b);
			}
			default:
				return false;
		}
	});

	return ok(wrapArray(data, filtered));
};
