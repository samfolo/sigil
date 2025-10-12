/**
 * Extract an array from various data structures (GeoJSON, nested objects, etc.)
 */
export const extractArray = (data: unknown): unknown[] => {
	if (Array.isArray(data)) {
		return data;
	}

	if (typeof data === 'object' && data !== null) {
		const dataRecord = data as Record<string, unknown>;

		// Handle GeoJSON FeatureCollection
		if ('type' in dataRecord && dataRecord.type === 'FeatureCollection' && 'features' in dataRecord && Array.isArray(dataRecord.features)) {
			return dataRecord.features;
		}

		// Handle GeoJSON GeometryCollection
		if ('type' in dataRecord && dataRecord.type === 'GeometryCollection' && 'geometries' in dataRecord && Array.isArray(dataRecord.geometries)) {
			return dataRecord.geometries;
		}

		// Handle object with known array properties
		const commonArrayProps = ['features', 'items', 'data', 'results', 'records', 'rows'];
		for (const prop of commonArrayProps) {
			if (prop in dataRecord && Array.isArray(dataRecord[prop])) {
				return dataRecord[prop] as unknown[];
			}
		}
	}

	throw new Error(
		`Unable to extract array from data. ` +
		`Type: ${typeof data === 'object' && data !== null && 'type' in data ? data.type : typeof data}. ` +
		`Available properties: ${typeof data === 'object' && data !== null ? Object.keys(data).join(', ') : 'none'}`
	);
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
