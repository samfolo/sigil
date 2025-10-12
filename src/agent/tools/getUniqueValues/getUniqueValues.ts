import {uniq} from 'lodash';

import type {Result} from '@sigil/src/common/errors/result';
import {err, isErr, ok, unwrapOr} from '@sigil/src/common/errors/result';
import {queryJSONPath} from '@sigil/renderer/core/utils/queryJSONPath';

import {extractArray} from '../helpers';

type UniqueValuesError = 'invalid_accessor' | 'extraction_failed';

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

	const values = arrayData.map((item) => unwrapOr(queryJSONPath(item, field), undefined));

	return ok(uniq(values));
};
