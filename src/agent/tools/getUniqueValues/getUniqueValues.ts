import {uniq} from 'lodash';

import {querySingleValue} from '@sigil/renderer/core/utils/queryJSONPath';
import type {Result} from '@sigil/src/common/errors/result';
import {err, isErr, ok, unwrapOr} from '@sigil/src/common/errors/result';
import type {SpecError} from '@sigil/src/common/errors';

import {extractArray} from '../helpers';

type UniqueValuesError = 'not_array' | 'no_array_property' | SpecError[];

/**
 * Get unique values from a specific field
 *
 * @param data - Data to extract unique values from (can be array, GeoJSON, or nested structure)
 * @param field - JSONPath accessor (must start with `$`)
 * @returns Result containing array of unique values, or error
 */
export const getUniqueValues = (
	data: unknown,
	field: string
): Result<unknown[], UniqueValuesError> => {
	// Extract array from data structure
	const arrayResult = extractArray(data);
	if (isErr(arrayResult)) {
		return err(arrayResult.error);
	}
	const arrayData = arrayResult.data;

	// Validate accessor by checking first item (fail fast on invalid accessor or array result)
	if (arrayData.length > 0) {
		const testResult = querySingleValue(arrayData.at(0), field);
		if (isErr(testResult)) {
			// Propagate the SpecError array from querySingleValue
			return err(testResult.error);
		}
	}

	const values = arrayData.map((item) => unwrapOr(querySingleValue(item, field), undefined));

	return ok(uniq(values));
};
