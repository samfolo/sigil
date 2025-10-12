import {get, uniq} from 'lodash';

import {extractArray} from '../helpers';

/**
 * Get unique values from a specific field
 */
export const getUniqueValues = (data: unknown, field: string): unknown[] => {
	const arrayData = extractArray(data);
	const values = arrayData.map((item) => get(item, field));
	return uniq(values);
};
