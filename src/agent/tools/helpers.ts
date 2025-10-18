import {ERROR_CODES} from '@sigil/src/common/errors/codes';
import {generateFieldNameSimilaritySuggestion} from '@sigil/src/common/errors/format/utils';
import type {Result} from '@sigil/src/common/errors/result';
import {err, ok} from '@sigil/src/common/errors/result';
import type {SpecError} from '@sigil/src/common/errors/types';

/**
 * Extract an array from various data structures (GeoJSON, nested objects, etc.)
 *
 * @param data - Data to extract array from
 * @returns Result containing extracted array, or error code for LLM error reporting
 */
export const extractArray = (data: unknown): Result<unknown[], SpecError[]> => {
	if (Array.isArray(data)) {
		return ok(data);
	}

	if (typeof data === 'object' && data !== null) {
		const dataRecord = data as Record<string, unknown>;

		// Handle GeoJSON FeatureCollection
		if ('type' in dataRecord && dataRecord.type === 'FeatureCollection' && 'features' in dataRecord && Array.isArray(dataRecord.features)) {
			return ok(dataRecord.features);
		}

		// Handle GeoJSON GeometryCollection
		if ('type' in dataRecord && dataRecord.type === 'GeometryCollection' && 'geometries' in dataRecord && Array.isArray(dataRecord.geometries)) {
			return ok(dataRecord.geometries);
		}

		// Handle object with known array properties
		const commonArrayProps = ['features', 'items', 'data', 'results', 'records', 'rows'];
		for (const prop of commonArrayProps) {
			if (prop in dataRecord && Array.isArray(dataRecord[prop])) {
				return ok(dataRecord[prop]);
			}
		}

		// Object has no recognisable array property
		const objectKeys = Object.keys(dataRecord);
		let suggestion: string | undefined;
		if (objectKeys.length > 0) {
			for (const prop of commonArrayProps) {
				suggestion = generateFieldNameSimilaritySuggestion(prop, objectKeys);
				if (suggestion) {
					break;
				}
			}
		}

		return err([{
			code: ERROR_CODES.MISSING_ARRAY_PROPERTY,
			severity: 'error',
			category: 'data',
			path: '',
			context: {
				attemptedProperties: commonArrayProps,
				objectKeys
			},
			suggestion
		}]);
	}

	// Data is not an array and not an object
	return err([{
		code: ERROR_CODES.NOT_ARRAY,
		severity: 'error',
		category: 'data',
		path: '',
		context: {
			actualType: typeof data
		}
	}]);
};

/**
 * Wrap array back into original structure
 */
export const wrapArray = (originalData: unknown, newArray: unknown[]): unknown => {
	if (Array.isArray(originalData)) {
		return newArray;
	}

	if (typeof originalData === 'object' && originalData !== null) {
		const dataRecord = originalData as Record<string, unknown>;

		// Handle GeoJSON FeatureCollection
		if ('type' in dataRecord && dataRecord.type === 'FeatureCollection') {
			return {...dataRecord, features: newArray};
		}

		// Handle GeoJSON GeometryCollection
		if ('type' in dataRecord && dataRecord.type === 'GeometryCollection') {
			return {...dataRecord, geometries: newArray};
		}

		// Handle object with known array properties
		const commonArrayProps = ['features', 'items', 'data', 'results', 'records', 'rows'];
		for (const prop of commonArrayProps) {
			if (prop in dataRecord && Array.isArray(dataRecord[prop])) {
				return {...dataRecord, [prop]: newArray};
			}
		}
	}

	return newArray;
};
