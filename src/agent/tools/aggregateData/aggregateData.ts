import {get, maxBy, meanBy, minBy, sumBy} from 'lodash';

import {extractArray} from '../helpers';

type AggregateOperation = 'sum' | 'average' | 'count' | 'min' | 'max';

/**
 * Intelligently count items in various data structures
 */
export const countItems = (data: unknown, field: string | null): number => {
	// If field is specified, try to count items in that nested path
	if (field) {
		const nestedData = get(data, field);
		if (Array.isArray(nestedData)) {
			return nestedData.length;
		}
		throw new Error(`Field "${field}" does not contain an array. Found: ${typeof nestedData}`);
	}

	// Handle single GeoJSON Feature specially
	if (typeof data === 'object' && data !== null && 'type' in data && data.type === 'Feature') {
		return 1;
	}

	// Use extractArray for all other cases
	try {
		const arrayData = extractArray(data);
		return arrayData.length;
	} catch (error) {
		throw new Error(
			`Unable to count items. ${error instanceof Error ? error.message : 'Unknown error'}`
		);
	}
};

/**
 * Aggregate data by field using various operations
 */
export const aggregateData = (
	data: unknown,
	field: string | null,
	operation: AggregateOperation
): number => {
	// Special handling for count operation
	if (operation === 'count') {
		return countItems(data, field);
	}

	// For other operations, we need an array
	const arrayData = extractArray(data);

	if (!field) {
		throw new Error(`Field is required for ${operation} operation`);
	}

	switch (operation) {
		case 'sum':
			return sumBy(arrayData, (item) => Number(get(item, field)) || 0);
		case 'average':
			return meanBy(arrayData, (item) => Number(get(item, field)) || 0);
		case 'min': {
			// Filter out null/undefined values before finding min
			const validItems = arrayData.filter((item) => {
				const value = get(item, field);
				return value !== null && value !== undefined && value !== '';
			});
			if (validItems.length === 0) {return 0;}
			const minItem = minBy(validItems, (item) => Number(get(item, field)));
			return minItem ? Number(get(minItem, field)) : 0;
		}
		case 'max': {
			// Filter out null/undefined values before finding max
			const validItems = arrayData.filter((item) => {
				const value = get(item, field);
				return value !== null && value !== undefined && value !== '';
			});
			if (validItems.length === 0) {return 0;}
			const maxItem = maxBy(validItems, (item) => Number(get(item, field)));
			return maxItem ? Number(get(maxItem, field)) : 0;
		}
		default:
			throw new Error(`Unknown operation: ${operation}`);
	}
};
