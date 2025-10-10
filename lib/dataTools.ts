import { get, sortBy, uniq, sumBy, meanBy, minBy, maxBy } from 'lodash';

type FilterOperator = 'equals' | 'contains' | 'greaterThan' | 'lessThan';
type AggregateOperation = 'sum' | 'average' | 'count' | 'min' | 'max';
type SortDirection = 'asc' | 'desc';

/**
 * Extract an array from various data structures (GeoJSON, nested objects, etc.)
 */
const extractArray = (data: unknown): unknown[] => {
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
}

/**
 * Wrap array back into original structure
 */
const wrapArray = (originalData: unknown, newArray: unknown[]): unknown => {
  if (Array.isArray(originalData)) {
    return newArray;
  }

  if (typeof originalData === 'object' && originalData !== null) {
    const dataRecord = originalData as Record<string, unknown>;

    // Handle GeoJSON FeatureCollection
    if ('type' in dataRecord && dataRecord.type === 'FeatureCollection') {
      return { ...dataRecord, features: newArray };
    }

    // Handle GeoJSON GeometryCollection
    if ('type' in dataRecord && dataRecord.type === 'GeometryCollection') {
      return { ...dataRecord, geometries: newArray };
    }

    // Handle object with known array properties
    const commonArrayProps = ['features', 'items', 'data', 'results', 'records', 'rows'];
    for (const prop of commonArrayProps) {
      if (prop in dataRecord && Array.isArray(dataRecord[prop])) {
        return { ...dataRecord, [prop]: newArray };
      }
    }
  }

  return newArray;
}

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
          return a.localeCompare(b, undefined, { numeric: true }) > 0;
        }
        return Number(a) > Number(b);
      }
      case 'lessThan': {
        // Handle booleans
        const a = typeof fieldValue === 'boolean' ? Number(fieldValue) : fieldValue;
        const b = typeof value === 'boolean' ? Number(value) : value;

        // Use localeCompare for strings, numeric comparison for numbers
        if (typeof a === 'string' && typeof b === 'string') {
          return a.localeCompare(b, undefined, { numeric: true }) < 0;
        }
        return Number(a) < Number(b);
      }
      default:
        return false;
    }
  });

  return wrapArray(data, filtered);
}

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
}

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
}

/**
 * Get unique values from a specific field
 */
export const getUniqueValues = (data: unknown, field: string): unknown[] => {
  const arrayData = extractArray(data);
  const values = arrayData.map((item) => get(item, field));
  return uniq(values);
}

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
}
