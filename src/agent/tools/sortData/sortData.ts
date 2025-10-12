import {sortBy} from 'lodash';

import type {Result} from '@sigil/src/common/errors/result';
import {err, isErr, ok, unwrapOr} from '@sigil/src/common/errors/result';
import {querySingleValue} from '@sigil/renderer/core/utils/queryJSONPath';

import {extractArray, wrapArray} from '../helpers';

type SortDirection = 'asc' | 'desc';
type SortError = 'invalid_accessor' | 'extraction_failed' | 'expected_single_value';

/**
 * Sort data by field in ascending or descending order
 *
 * @param data - Data to sort (can be array, GeoJSON, or nested structure)
 * @param field - JSONPath accessor (must start with `$`)
 * @param direction - Sort direction ('asc' or 'desc')
 * @returns Result containing sorted data in original structure, or error
 */
export const sortData = (
	data: unknown,
	field: string,
	direction: SortDirection = 'asc'
): Result<unknown, SortError> => {
	// Extract array from data structure
	let arrayData: unknown[];
	try {
		arrayData = extractArray(data);
	} catch (error) {
		return err('extraction_failed');
	}

	// Validate accessor by checking first item (fail fast on invalid accessor or array result)
	if (arrayData.length > 0) {
		const testResult = querySingleValue(arrayData.at(0), field);
		if (isErr(testResult)) {
			// Propagate the specific error (invalid_accessor or expected_single_value)
			return err(testResult.error as SortError);
		}
	}

	// Sort by field using JSONPath accessor
	const sorted = sortBy(arrayData, (item) => {
		// At this point, accessor is valid and returns single value, so only missing fields return undefined
		return unwrapOr(querySingleValue(item, field), undefined);
	});

	const sortedArray = direction === 'desc' ? sorted.reverse() : sorted;
	const result = wrapArray(data, sortedArray);

	return ok(result);
};
