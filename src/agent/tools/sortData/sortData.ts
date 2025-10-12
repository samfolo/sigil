import {get, sortBy} from 'lodash';

import {extractArray, wrapArray} from '../helpers';

type SortDirection = 'asc' | 'desc';

/**
 * Sort data by field in ascending or descending order
 */
export const sortData = (
	data: unknown,
	field: string,
	direction: SortDirection = 'asc'
): unknown => {
	const arrayData = extractArray(data);
	const sorted = sortBy(arrayData, (item) => get(item, field));
	const result = direction === 'desc' ? sorted.reverse() : sorted;
	return wrapArray(data, result);
};
