import {get} from 'lodash';

import {extractArray, wrapArray} from '../helpers';

type FilterOperator = 'equals' | 'contains' | 'greaterThan' | 'lessThan';

/**
 * Filter an array of data by field value using various operators
 */
export const filterData = (
	data: unknown,
	field: string,
	operator: FilterOperator,
	value: unknown
): unknown => {
	const arrayData = extractArray(data);

	const filtered = arrayData.filter((item) => {
		const fieldValue = get(item, field);

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

	return wrapArray(data, filtered);
};
