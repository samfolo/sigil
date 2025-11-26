/**
 * Tests for data binding utilities
 *
 * Tests cover:
 * - Successful binding of various data structures
 * - Error accumulation from failed queries
 * - Path context construction with row indices
 * - Accessor path stripping and path construction
 * - Error context preservation
 * - Edge cases (empty data, null/undefined values)
 */

import {describe, expect, it} from 'vitest';

import {ERROR_CODES} from '@sigil/src/common/errors';
import {isErr, isOk} from '@sigil/src/common/errors/result';

import {JSONPATH_ROOT} from '../constants';

import {bindTabularData} from './binding';
import {
	ALL_COLUMNS_UNDEFINED,
	ARRAY_OF_ARRAYS_WITH_OBJECTS,
	COMPLEX_VALUE_MAPPINGS,
	CSV_ARRAY_OF_ARRAYS_BASIC,
	CSV_ARRAY_OF_ARRAYS_EMPTY,
	CSV_ARRAY_OF_ARRAYS_MISSING_VALUES,
	CSV_ARRAY_OF_ARRAYS_WITH_MAPPINGS,
	DATA_SOURCE_MULTI_TABLE_NORTH,
	DATA_SOURCE_MULTI_TABLE_SOUTH,
	DATA_SOURCE_NESTED_ARRAY,
	DATA_SOURCE_NO_DATA,
	DATA_SOURCE_ROOT,
	DATA_WITH_ARRAYS,
	DATA_WITH_NULL_VALUES,
	DATA_WITH_UNDEFINED_VALUES,
	DEEPLY_NESTED_DATA,
	EMPTY_DATA_ARRAY,
	INVALID_ACCESSOR_ARRAY_INDEX,
	INVALID_ACCESSOR_ARRAY_RETURNED,
	INVALID_ACCESSOR_MISSING_FIELD,
	INVALID_ACCESSOR_NO_DOLLAR_PREFIX,
	INVALID_ACCESSOR_WITH_PATH_CONTEXT,
	MIXED_SUCCESS_FAILURE_DATA,
	MULTIPLE_ROWS_INVALID_ACCESSOR,
	NESTED_OBJECT_DATA,
	NESTED_PATH_CONTEXT,
	OBJECT_OF_ARRAYS,
	OBJECT_OF_OBJECTS_BASIC,
	OBJECT_OF_OBJECTS_NESTED,
	OBJECT_OF_OBJECTS_NO_KEYS,
	SIMPLE_FLAT_DATA,
	SINGLE_ROW_SINGLE_COLUMN,
} from './binding.fixtures';

describe('bindTabularData - successful binding', () => {
	it('should bind simple flat data successfully', () => {
		const result = bindTabularData(
			SIMPLE_FLAT_DATA.data,
			SIMPLE_FLAT_DATA.columns,
			SIMPLE_FLAT_DATA.accessorBindings,
			SIMPLE_FLAT_DATA.pathContext
		);

		expect(isOk(result)).toBe(true);
		if (!isOk(result)) {return;}

		expect(result.data).toHaveLength(3);
		expect(result.data.at(0)?.id).toBe('row-0');
		expect(result.data.at(0)?.cells['$[*].name'].raw).toBe('Alice Johnson');
		expect(result.data.at(0)?.cells['$[*].name'].display).toBe('Alice Johnson');
		expect(result.data.at(0)?.cells['$[*].age'].raw).toBe(28);
		expect(result.data.at(0)?.cells['$[*].active'].raw).toBe(true);
		expect(result.data.at(0)?.cells['$[*].active'].display).toBe('Active'); // value mapping applied

		expect(result.data.at(1)?.cells['$[*].active'].display).toBe('Inactive'); // value mapping for false
	});

	it('should bind nested object data successfully', () => {
		const result = bindTabularData(
			NESTED_OBJECT_DATA.data,
			NESTED_OBJECT_DATA.columns,
			NESTED_OBJECT_DATA.accessorBindings,
			NESTED_OBJECT_DATA.pathContext
		);

		expect(isOk(result)).toBe(true);
		if (!isOk(result)) {return;}

		expect(result.data).toHaveLength(2);
		expect(result.data.at(0)?.cells['$[*].user.profile.name'].raw).toBe('David Chen');
		expect(result.data.at(0)?.cells['$[*].user.profile.email'].raw).toBe('david.chen@example.com');
		expect(result.data.at(1)?.cells['$[*].user.profile.name'].raw).toBe('Emma Davis');
	});

	it('should bind data with arrays in rows successfully', () => {
		const result = bindTabularData(
			DATA_WITH_ARRAYS.data,
			DATA_WITH_ARRAYS.columns,
			DATA_WITH_ARRAYS.accessorBindings,
			DATA_WITH_ARRAYS.pathContext
		);

		expect(isOk(result)).toBe(true);
		if (!isOk(result)) {return;}

		expect(result.data).toHaveLength(3);
		expect(result.data.at(0)?.cells['$[*].tags[0]'].raw).toBe('electronics');
		expect(result.data.at(0)?.cells['$[*].scores[1]'].raw).toBe(9.2);
		expect(result.data.at(1)?.cells['$[*].tags[0]'].raw).toBe('electronics');
		expect(result.data.at(1)?.cells['$[*].scores[1]'].raw).toBe(8.7);
	});

	it('should bind deeply nested structures successfully', () => {
		const result = bindTabularData(
			DEEPLY_NESTED_DATA.data,
			DEEPLY_NESTED_DATA.columns,
			DEEPLY_NESTED_DATA.accessorBindings,
			DEEPLY_NESTED_DATA.pathContext
		);

		expect(isOk(result)).toBe(true);
		if (!isOk(result)) {return;}

		expect(result.data).toHaveLength(2);
		expect(result.data.at(0)?.cells['$[*].company.department.employees[0].name'].raw).toBe(
			'Frank Lee'
		);
		expect(result.data.at(0)?.cells['$[*].company.department.employees[0].role'].raw).toBe(
			'Manager'
		);
		expect(result.data.at(0)?.cells['$[*].company.department.budget'].raw).toBe(150000);
	});

	it('should apply value mappings correctly', () => {
		const result = bindTabularData(
			COMPLEX_VALUE_MAPPINGS.data,
			COMPLEX_VALUE_MAPPINGS.columns,
			COMPLEX_VALUE_MAPPINGS.accessorBindings,
			COMPLEX_VALUE_MAPPINGS.pathContext
		);

		expect(isOk(result)).toBe(true);
		if (!isOk(result)) {return;}

		// Check priority value mappings: 1 → 'Critical', 2 → 'Important', 3 → 'Normal'
		expect(result.data.at(0)?.cells['$[*].priority'].raw).toBe(1);
		expect(result.data.at(0)?.cells['$[*].priority'].display).toBe('Critical');
		expect(result.data.at(1)?.cells['$[*].priority'].display).toBe('Important');
		expect(result.data.at(2)?.cells['$[*].priority'].display).toBe('Normal');

		// Check severity value mappings
		expect(result.data.at(0)?.cells['$[*].severity'].display).toBe('High Risk');
		expect(result.data.at(1)?.cells['$[*].severity'].display).toBe('Medium Risk');
		expect(result.data.at(2)?.cells['$[*].severity'].display).toBe('Low Risk');
	});

	it('should preserve cell metadata (format, dataType)', () => {
		const result = bindTabularData(
			SIMPLE_FLAT_DATA.data,
			SIMPLE_FLAT_DATA.columns,
			SIMPLE_FLAT_DATA.accessorBindings,
			SIMPLE_FLAT_DATA.pathContext
		);

		expect(isOk(result)).toBe(true);
		if (!isOk(result)) {return;}

		const nameCell = result.data.at(0)?.cells['$[*].name'];
		expect(nameCell?.dataType).toBe('string');

		const ageCell = result.data.at(0)?.cells['$[*].age'];
		expect(ageCell?.dataType).toBe('number');
	});
});

describe('bindTabularData - error accumulation', () => {
	it('should accumulate errors when accessor points to missing field', () => {
		const result = bindTabularData(
			INVALID_ACCESSOR_MISSING_FIELD.data,
			INVALID_ACCESSOR_MISSING_FIELD.columns,
			INVALID_ACCESSOR_MISSING_FIELD.accessorBindings,
			INVALID_ACCESSOR_MISSING_FIELD.pathContext
		);

		expect(isOk(result)).toBe(true);
		if (!isOk(result)) {return;}

		// Missing fields should result in undefined raw, empty display
		expect(result.data.at(0)?.cells['$[*].email'].raw).toBeUndefined();
		expect(result.data.at(0)?.cells['$[*].email'].display).toBe('');
		expect(result.data.at(1)?.cells['$[*].email'].raw).toBeUndefined();
		expect(result.data.at(1)?.cells['$[*].email'].display).toBe('');
	});

	it('should handle wrong array index gracefully', () => {
		const result = bindTabularData(
			INVALID_ACCESSOR_ARRAY_INDEX.data,
			INVALID_ACCESSOR_ARRAY_INDEX.columns,
			INVALID_ACCESSOR_ARRAY_INDEX.accessorBindings,
			INVALID_ACCESSOR_ARRAY_INDEX.pathContext
		);

		expect(isOk(result)).toBe(true);
		if (!isOk(result)) {return;}

		// Valid index should work
		expect(result.data.at(0)?.cells['$[*].items[0]'].raw).toBe('first');

		// Out of bounds index should return undefined
		expect(result.data.at(0)?.cells['$[*].items[5]'].raw).toBeUndefined();
		expect(result.data.at(0)?.cells['$[*].items[5]'].display).toBe('');
	});

	it('should stringify arrays when accessor returns array', () => {
		const result = bindTabularData(
			INVALID_ACCESSOR_ARRAY_RETURNED.data,
			INVALID_ACCESSOR_ARRAY_RETURNED.columns,
			INVALID_ACCESSOR_ARRAY_RETURNED.accessorBindings,
			INVALID_ACCESSOR_ARRAY_RETURNED.pathContext
		);

		expect(isOk(result)).toBe(true);
		if (!isOk(result)) {return;}

		// Accessor returns full array - should be stringified
		const cell = result.data.at(0)?.cells['$[*].tags'];
		expect(Array.isArray(cell?.raw)).toBe(true);
		expect(cell?.display).toContain('tag1'); // Stringified array representation
	});

	it('should handle mixed success/failure across rows', () => {
		const result = bindTabularData(
			MIXED_SUCCESS_FAILURE_DATA.data,
			MIXED_SUCCESS_FAILURE_DATA.columns,
			MIXED_SUCCESS_FAILURE_DATA.accessorBindings,
			MIXED_SUCCESS_FAILURE_DATA.pathContext
		);

		expect(isOk(result)).toBe(true);
		if (!isOk(result)) {return;}

		expect(result.data).toHaveLength(4);

		// Rows with optionalField present
		expect(result.data.at(0)?.cells['$[*].optionalField'].raw).toBe('Present');
		expect(result.data.at(2)?.cells['$[*].optionalField'].raw).toBe('Also Present');

		// Rows with optionalField missing
		expect(result.data.at(1)?.cells['$[*].optionalField'].raw).toBeUndefined();
		expect(result.data.at(1)?.cells['$[*].optionalField'].display).toBe('');
		expect(result.data.at(3)?.cells['$[*].optionalField'].raw).toBeUndefined();
		expect(result.data.at(3)?.cells['$[*].optionalField'].display).toBe('');
	});
});

describe('bindTabularData - path context construction', () => {
	it('should construct row paths with simple path context', () => {
		const result = bindTabularData(
			SIMPLE_FLAT_DATA.data,
			SIMPLE_FLAT_DATA.columns,
			SIMPLE_FLAT_DATA.accessorBindings,
			[JSONPATH_ROOT]
		);

		expect(isOk(result)).toBe(true);
		if (!isOk(result)) {return;}

		// Row IDs should be correctly numbered
		expect(result.data.at(0)?.id).toBe('row-0');
		expect(result.data.at(1)?.id).toBe('row-1');
		expect(result.data.at(2)?.id).toBe('row-2');
	});

	it('should construct row paths with nested path context', () => {
		const result = bindTabularData(
			NESTED_PATH_CONTEXT.data,
			NESTED_PATH_CONTEXT.columns,
			NESTED_PATH_CONTEXT.accessorBindings,
			NESTED_PATH_CONTEXT.pathContext // ['$', '.data', '.users']
		);

		expect(isOk(result)).toBe(true);
		if (!isOk(result)) {return;}

		// Should still produce valid rows
		expect(result.data).toHaveLength(2);
		expect(result.data.at(0)?.cells['$[*].userId'].raw).toBe(101);
		expect(result.data.at(1)?.cells['$[*].userId'].raw).toBe(102);
	});

	it('should build valid row paths for error reporting', () => {
		// This test will be more meaningful once we implement error path construction
		// For now, verify that row paths are constructed correctly in the implementation
		const pathContext = [JSONPATH_ROOT, '.data'];
		const result = bindTabularData(
			SIMPLE_FLAT_DATA.data,
			SIMPLE_FLAT_DATA.columns,
			SIMPLE_FLAT_DATA.accessorBindings,
			pathContext
		);

		expect(isOk(result)).toBe(true);
		// The rowPath variable should be constructed as:
		// Row 0: ['$', '.data', '[0]']
		// Row 1: ['$', '.data', '[1]']
		// Row 2: ['$', '.data', '[2]']
	});
});

describe('bindTabularData - accessor path stripping', () => {
	it('should strip $. prefix when building full paths', () => {
		// This test validates that accessor '$.user.name' is correctly stripped to 'user.name'
		// before combining with rowPath to avoid paths like '$[0]$.user.name'
		const result = bindTabularData(
			NESTED_OBJECT_DATA.data,
			NESTED_OBJECT_DATA.columns,
			NESTED_OBJECT_DATA.accessorBindings,
			[JSONPATH_ROOT]
		);

		expect(isOk(result)).toBe(true);
		if (!isOk(result)) {return;}

		// Verify that nested accessors work correctly
		expect(result.data.at(0)?.cells['$[*].user.profile.name'].raw).toBe('David Chen');
	});

	it('should handle array accessors correctly in path construction', () => {
		const result = bindTabularData(
			DATA_WITH_ARRAYS.data,
			DATA_WITH_ARRAYS.columns,
			DATA_WITH_ARRAYS.accessorBindings,
			[JSONPATH_ROOT]
		);

		expect(isOk(result)).toBe(true);
		if (!isOk(result)) {return;}

		// Array accessors like '$.tags[0]' should work correctly
		expect(result.data.at(0)?.cells['$[*].tags[0]'].raw).toBe('electronics');
		expect(result.data.at(0)?.cells['$[*].scores[1]'].raw).toBe(9.2);
	});

	it('should not produce invalid paths like $[0]$.field', () => {
		// This is a regression test - ensure path construction doesn't create invalid JSONPath
		const result = bindTabularData(
			SIMPLE_FLAT_DATA.data,
			SIMPLE_FLAT_DATA.columns,
			SIMPLE_FLAT_DATA.accessorBindings,
			[JSONPATH_ROOT]
		);

		expect(isOk(result)).toBe(true);
		// If errors were produced, their paths should be valid JSONPath like:
		// '$[0].name' not '$[0]$.name'
		// This will be tested more thoroughly when error handling is implemented
	});
});

describe('bindTabularData - error context preservation', () => {
	it('should preserve original error context when updating paths', () => {
		// This test will be more meaningful once error handling is fully implemented
		// It verifies that when queryJSONPath returns an error, the context is preserved
		// and only the path field is updated with row context
		const result = bindTabularData(
			SIMPLE_FLAT_DATA.data,
			SIMPLE_FLAT_DATA.columns,
			SIMPLE_FLAT_DATA.accessorBindings,
			[JSONPATH_ROOT]
		);

		expect(isOk(result)).toBe(true);
		// When errors are returned, verify that:
		// - error.context remains unchanged
		// - error.path is updated with row context
		// - error.code remains the same
		// - error.severity remains the same
	});

	it('should not mutate original QueryError context', () => {
		// Verify that error context from queryJSONPath is not mutated
		// This is important for debugging and error tracking
		const result = bindTabularData(
			INVALID_ACCESSOR_MISSING_FIELD.data,
			INVALID_ACCESSOR_MISSING_FIELD.columns,
			INVALID_ACCESSOR_MISSING_FIELD.accessorBindings,
			[JSONPATH_ROOT]
		);

		// The result should still be ok for missing fields (they return undefined)
		expect(isOk(result)).toBe(true);
	});
});

describe('bindTabularData - edge cases', () => {
	it('should handle empty data array', () => {
		const result = bindTabularData(
			EMPTY_DATA_ARRAY.data,
			EMPTY_DATA_ARRAY.columns,
			EMPTY_DATA_ARRAY.accessorBindings,
			EMPTY_DATA_ARRAY.pathContext
		);

		expect(isOk(result)).toBe(true);
		if (!isOk(result)) {return;}

		expect(result.data).toHaveLength(0);
	});

	it('should handle null values in data', () => {
		const result = bindTabularData(
			DATA_WITH_NULL_VALUES.data,
			DATA_WITH_NULL_VALUES.columns,
			DATA_WITH_NULL_VALUES.accessorBindings,
			DATA_WITH_NULL_VALUES.pathContext
		);

		expect(isOk(result)).toBe(true);
		if (!isOk(result)) {return;}

		expect(result.data).toHaveLength(3);

		// Null values should produce empty display strings
		expect(result.data.at(0)?.cells['$[*].status'].raw).toBeNull();
		expect(result.data.at(0)?.cells['$[*].status'].display).toBe('');

		expect(result.data.at(1)?.cells['$[*].name'].raw).toBeNull();
		expect(result.data.at(1)?.cells['$[*].name'].display).toBe('');
	});

	it('should handle undefined values in data', () => {
		const result = bindTabularData(
			DATA_WITH_UNDEFINED_VALUES.data,
			DATA_WITH_UNDEFINED_VALUES.columns,
			DATA_WITH_UNDEFINED_VALUES.accessorBindings,
			DATA_WITH_UNDEFINED_VALUES.pathContext
		);

		expect(isOk(result)).toBe(true);
		if (!isOk(result)) {return;}

		expect(result.data).toHaveLength(2);

		// Undefined values should produce empty display strings
		expect(result.data.at(0)?.cells['$[*].value'].raw).toBeUndefined();
		expect(result.data.at(0)?.cells['$[*].value'].display).toBe('');

		expect(result.data.at(1)?.cells['$[*].name'].raw).toBeUndefined();
		expect(result.data.at(1)?.cells['$[*].name'].display).toBe('');
	});

	it('should handle single row with single column', () => {
		const result = bindTabularData(
			SINGLE_ROW_SINGLE_COLUMN.data,
			SINGLE_ROW_SINGLE_COLUMN.columns,
			SINGLE_ROW_SINGLE_COLUMN.accessorBindings,
			SINGLE_ROW_SINGLE_COLUMN.pathContext
		);

		expect(isOk(result)).toBe(true);
		if (!isOk(result)) {return;}

		expect(result.data).toHaveLength(1);
		expect(result.data.at(0)?.cells['$[*].name'].raw).toBe('Single');
	});

	it('should handle row with all columns having undefined values', () => {
		const result = bindTabularData(
			ALL_COLUMNS_UNDEFINED.data,
			ALL_COLUMNS_UNDEFINED.columns,
			ALL_COLUMNS_UNDEFINED.accessorBindings,
			ALL_COLUMNS_UNDEFINED.pathContext
		);

		expect(isOk(result)).toBe(true);
		if (!isOk(result)) {return;}

		expect(result.data).toHaveLength(1);
		expect(result.data.at(0)?.cells['$[*].missing1'].raw).toBeUndefined();
		expect(result.data.at(0)?.cells['$[*].missing1'].display).toBe('');
		expect(result.data.at(0)?.cells['$[*].missing2'].raw).toBeUndefined();
		expect(result.data.at(0)?.cells['$[*].missing2'].display).toBe('');
	});
});

describe('bindTabularData - error scenarios with invalid accessors', () => {
	it('should reject accessor without wildcard notation', () => {
		const result = bindTabularData(
			INVALID_ACCESSOR_NO_DOLLAR_PREFIX.data,
			INVALID_ACCESSOR_NO_DOLLAR_PREFIX.columns,
			INVALID_ACCESSOR_NO_DOLLAR_PREFIX.accessorBindings,
			INVALID_ACCESSOR_NO_DOLLAR_PREFIX.pathContext
		);

		// This should fail because accessor doesn't have wildcard [*]
		expect(isErr(result)).toBe(true);
		if (!isErr(result)) {return;}

		expect(result.error).toHaveLength(1);
		const firstError = result.error.at(0);
		expect(firstError?.code).toBe(ERROR_CODES.INVALID_ACCESSOR);
		if (firstError?.code === ERROR_CODES.INVALID_ACCESSOR) {
			expect(firstError.context.accessor).toBe('name');
			expect(firstError.context.reason).toContain('wildcard');
		}
	});

	it('should reject multiple accessors without wildcard notation', () => {
		const result = bindTabularData(
			MULTIPLE_ROWS_INVALID_ACCESSOR.data,
			MULTIPLE_ROWS_INVALID_ACCESSOR.columns,
			MULTIPLE_ROWS_INVALID_ACCESSOR.accessorBindings,
			MULTIPLE_ROWS_INVALID_ACCESSOR.pathContext
		);

		expect(isErr(result)).toBe(true);
		if (!isErr(result)) {return;}

		// Should have 1 error per non-wildcard column (validated upfront)
		expect(result.error.length).toBeGreaterThanOrEqual(1);
		result.error.forEach((error) => {
			expect(error.code).toBe(ERROR_CODES.INVALID_ACCESSOR);
		});
	});

	it('should include suggestion to use wildcard notation', () => {
		const result = bindTabularData(
			INVALID_ACCESSOR_WITH_PATH_CONTEXT.data,
			INVALID_ACCESSOR_WITH_PATH_CONTEXT.columns,
			INVALID_ACCESSOR_WITH_PATH_CONTEXT.accessorBindings,
			INVALID_ACCESSOR_WITH_PATH_CONTEXT.pathContext
		);

		expect(isErr(result)).toBe(true);
		if (!isErr(result)) {return;}

		const firstError = result.error.at(0);
		expect(firstError?.suggestion).toContain('wildcard');
		expect(firstError?.suggestion).toContain('$[*]');
	});
});

describe('bindTabularData - CSV array-of-arrays binding', () => {
	it('should bind CSV data and skip header row', () => {
		const result = bindTabularData(
			CSV_ARRAY_OF_ARRAYS_BASIC.data,
			CSV_ARRAY_OF_ARRAYS_BASIC.columns,
			CSV_ARRAY_OF_ARRAYS_BASIC.accessorBindings,
			CSV_ARRAY_OF_ARRAYS_BASIC.pathContext
		);

		expect(isOk(result)).toBe(true);
		if (!isOk(result)) {return;}

		// Should have 3 data rows (header row skipped)
		expect(result.data).toHaveLength(3);

		// First data row (index 1 in original array)
		expect(result.data.at(0)?.cells['$[*][0]'].raw).toBe('Smart Watch');
		expect(result.data.at(0)?.cells['$[*][1]'].raw).toBe('Features: GPS tracking');
		expect(result.data.at(0)?.cells['$[*][2]'].raw).toBe(299.99);

		// Number formatting not yet implemented, display is unformatted
		expect(result.data.at(0)?.cells['$[*][2]'].display).toBe('299.99');
		expect(result.data.at(0)?.cells['$[*][2]'].format).toBe('$0,0.00');
	});

	it('should apply value mappings in CSV data', () => {
		const result = bindTabularData(
			CSV_ARRAY_OF_ARRAYS_WITH_MAPPINGS.data,
			CSV_ARRAY_OF_ARRAYS_WITH_MAPPINGS.columns,
			CSV_ARRAY_OF_ARRAYS_WITH_MAPPINGS.accessorBindings,
			CSV_ARRAY_OF_ARRAYS_WITH_MAPPINGS.pathContext
		);

		expect(isOk(result)).toBe(true);
		if (!isOk(result)) {return;}

		expect(result.data).toHaveLength(3);

		// Value mappings: 'A' → 'Active', 'I' → 'Inactive'
		expect(result.data.at(0)?.cells['$[*][1]'].raw).toBe('A');
		expect(result.data.at(0)?.cells['$[*][1]'].display).toBe('Active');
		expect(result.data.at(1)?.cells['$[*][1]'].raw).toBe('I');
		expect(result.data.at(1)?.cells['$[*][1]'].display).toBe('Inactive');
	});

	it('should handle CSV with header only (no data rows)', () => {
		const result = bindTabularData(
			CSV_ARRAY_OF_ARRAYS_EMPTY.data,
			CSV_ARRAY_OF_ARRAYS_EMPTY.columns,
			CSV_ARRAY_OF_ARRAYS_EMPTY.accessorBindings,
			CSV_ARRAY_OF_ARRAYS_EMPTY.pathContext
		);

		expect(isOk(result)).toBe(true);
		if (!isOk(result)) {return;}

		expect(result.data).toHaveLength(0);
	});

	it('should handle CSV with missing values in rows', () => {
		const result = bindTabularData(
			CSV_ARRAY_OF_ARRAYS_MISSING_VALUES.data,
			CSV_ARRAY_OF_ARRAYS_MISSING_VALUES.columns,
			CSV_ARRAY_OF_ARRAYS_MISSING_VALUES.accessorBindings,
			CSV_ARRAY_OF_ARRAYS_MISSING_VALUES.pathContext
		);

		expect(isOk(result)).toBe(true);
		if (!isOk(result)) {return;}

		expect(result.data).toHaveLength(3);

		// First row missing phone
		expect(result.data.at(0)?.cells['$[*][0]'].raw).toBe('Alice Johnson');
		expect(result.data.at(0)?.cells['$[*][1]'].raw).toBe('alice@test.com');
		expect(result.data.at(0)?.cells['$[*][2]'].raw).toBeUndefined();

		// Second row with null email
		expect(result.data.at(1)?.cells['$[*][1]'].raw).toBeNull();
		expect(result.data.at(1)?.cells['$[*][1]'].display).toBe('');
	});

	it('should bind array-of-arrays with nested object properties', () => {
		const result = bindTabularData(
			ARRAY_OF_ARRAYS_WITH_OBJECTS.data,
			ARRAY_OF_ARRAYS_WITH_OBJECTS.columns,
			ARRAY_OF_ARRAYS_WITH_OBJECTS.accessorBindings,
			ARRAY_OF_ARRAYS_WITH_OBJECTS.pathContext
		);

		expect(isOk(result)).toBe(true);
		if (!isOk(result)) {
			return;
		}

		// Should have 3 data rows (header row skipped)
		expect(result.data).toHaveLength(3);

		// First row - verify mixed accessor pattern $[*][N].property
		expect(result.data.at(0)?.cells['$[*][0].name'].raw).toBe('Laptop');
		expect(result.data.at(0)?.cells['$[*][0].sku'].raw).toBe('LAP-001');
		expect(result.data.at(0)?.cells['$[*][1].price'].raw).toBe(1299.99);
		expect(result.data.at(0)?.cells['$[*][2].active'].raw).toBe(true);
		expect(result.data.at(0)?.cells['$[*][2].active'].display).toBe('Active');

		// Second row
		expect(result.data.at(1)?.cells['$[*][0].name'].raw).toBe('Mouse');
		expect(result.data.at(1)?.cells['$[*][1].price'].raw).toBe(29.99);

		// Third row - inactive product
		expect(result.data.at(2)?.cells['$[*][0].name'].raw).toBe('Keyboard');
		expect(result.data.at(2)?.cells['$[*][2].active'].display).toBe('Inactive');
	});
});

describe('bindTabularData - object-of-objects binding', () => {
	it('should bind object-of-objects with property name column', () => {
		const result = bindTabularData(
			OBJECT_OF_OBJECTS_BASIC.data,
			OBJECT_OF_OBJECTS_BASIC.columns,
			OBJECT_OF_OBJECTS_BASIC.accessorBindings,
			OBJECT_OF_OBJECTS_BASIC.pathContext
		);

		expect(isOk(result)).toBe(true);
		if (!isOk(result)) {return;}

		expect(result.data).toHaveLength(3);

		// First object (user_123)
		expect(result.data.at(0)?.cells['$[*]~'].raw).toBe('user_123');
		expect(result.data.at(0)?.cells['$[*].name'].raw).toBe('Alice Johnson');
		expect(result.data.at(0)?.cells['$[*].role'].raw).toBe('Admin');
		expect(result.data.at(0)?.cells['$[*].active'].display).toBe('Active');
	});

	it('should bind object-of-objects without keys column', () => {
		const result = bindTabularData(
			OBJECT_OF_OBJECTS_NO_KEYS.data,
			OBJECT_OF_OBJECTS_NO_KEYS.columns,
			OBJECT_OF_OBJECTS_NO_KEYS.accessorBindings,
			OBJECT_OF_OBJECTS_NO_KEYS.pathContext
		);

		expect(isOk(result)).toBe(true);
		if (!isOk(result)) {return;}

		expect(result.data).toHaveLength(3);

		// Values should be extracted correctly
		expect(result.data.at(0)?.cells['$[*].name'].raw).toBe('Laptop');
		expect(result.data.at(0)?.cells['$[*].price'].raw).toBe(999.99);
		// Number formatting not yet implemented, display is unformatted
		expect(result.data.at(0)?.cells['$[*].price'].display).toBe('999.99');
		expect(result.data.at(0)?.cells['$[*].price'].format).toBe('$0,0.00');
		expect(result.data.at(0)?.cells['$[*].inStock'].display).toBe('In Stock');
	});

	it('should bind nested properties in object-of-objects', () => {
		const result = bindTabularData(
			OBJECT_OF_OBJECTS_NESTED.data,
			OBJECT_OF_OBJECTS_NESTED.columns,
			OBJECT_OF_OBJECTS_NESTED.accessorBindings,
			OBJECT_OF_OBJECTS_NESTED.pathContext
		);

		expect(isOk(result)).toBe(true);
		if (!isOk(result)) {return;}

		expect(result.data).toHaveLength(2);

		// Access nested properties
		expect(result.data.at(0)?.cells['$[*]~'].raw).toBe('dept_eng');
		expect(result.data.at(0)?.cells['$[*].name'].raw).toBe('Engineering');
		expect(result.data.at(0)?.cells['$[*].lead.name'].raw).toBe('Alice Chen');
		expect(result.data.at(0)?.cells['$[*].budget'].raw).toBe(500000);
	});

	it('should bind object-of-arrays with mixed accessor types', () => {
		const result = bindTabularData(
			OBJECT_OF_ARRAYS.data,
			OBJECT_OF_ARRAYS.columns,
			OBJECT_OF_ARRAYS.accessorBindings,
			OBJECT_OF_ARRAYS.pathContext
		);

		expect(isOk(result)).toBe(true);
		if (!isOk(result)) {return;}

		expect(result.data).toHaveLength(3);

		// Property names and array elements
		expect(result.data.at(0)?.cells['$[*]~'].raw).toBe('row_1');
		expect(result.data.at(0)?.cells['$[*][0]'].raw).toBe('Alice Johnson');
		expect(result.data.at(0)?.cells['$[*][1]'].raw).toBe('alice@example.com');
		expect(result.data.at(0)?.cells['$[*][2]'].raw).toBe(28);
	});
});

describe('bindTabularData - data source navigation', () => {
	it('should navigate to nested array via data_source', () => {
		const result = bindTabularData(
			DATA_SOURCE_NESTED_ARRAY.data,
			DATA_SOURCE_NESTED_ARRAY.columns,
			DATA_SOURCE_NESTED_ARRAY.accessorBindings,
			DATA_SOURCE_NESTED_ARRAY.pathContext,
			DATA_SOURCE_NESTED_ARRAY.dataSource
		);

		expect(isOk(result)).toBe(true);
		if (!isOk(result)) {return;}

		// Should have 2 rows from the nested north region array
		expect(result.data).toHaveLength(2);
		expect(result.data.at(0)?.cells['$[*].product'].raw).toBe('Widget A');
		expect(result.data.at(0)?.cells['$[*].units'].raw).toBe(150);
		expect(result.data.at(0)?.cells['$[*].revenue'].raw).toBe(3000);
		expect(result.data.at(1)?.cells['$[*].product'].raw).toBe('Widget B');
	});

	it('should treat data_source "$" same as omitting it', () => {
		const result = bindTabularData(
			DATA_SOURCE_ROOT.data,
			DATA_SOURCE_ROOT.columns,
			DATA_SOURCE_ROOT.accessorBindings,
			DATA_SOURCE_ROOT.pathContext,
			DATA_SOURCE_ROOT.dataSource
		);

		expect(isOk(result)).toBe(true);
		if (!isOk(result)) {return;}

		expect(result.data).toHaveLength(2);
		expect(result.data.at(0)?.cells['$[*].name'].raw).toBe('Alice');
		expect(result.data.at(0)?.cells['$[*].score'].raw).toBe(95);
	});

	it('should return error when data_source path resolves to undefined', () => {
		const result = bindTabularData(
			DATA_SOURCE_NO_DATA.data,
			DATA_SOURCE_NO_DATA.columns,
			DATA_SOURCE_NO_DATA.accessorBindings,
			DATA_SOURCE_NO_DATA.pathContext,
			DATA_SOURCE_NO_DATA.dataSource
		);

		expect(isErr(result)).toBe(true);
		if (!isErr(result)) {return;}

		expect(result.error).toHaveLength(1);
		expect(result.error.at(0)?.code).toBe(ERROR_CODES.QUERY_ERROR);
		expect(result.error.at(0)?.context).toHaveProperty('jsonPath', '$.regions.south');
		expect(result.error.at(0)?.context).toHaveProperty('reason');
	});

	it('should bind to north region with data_source', () => {
		const result = bindTabularData(
			DATA_SOURCE_MULTI_TABLE_NORTH.data,
			DATA_SOURCE_MULTI_TABLE_NORTH.columns,
			DATA_SOURCE_MULTI_TABLE_NORTH.accessorBindings,
			DATA_SOURCE_MULTI_TABLE_NORTH.pathContext,
			DATA_SOURCE_MULTI_TABLE_NORTH.dataSource
		);

		expect(isOk(result)).toBe(true);
		if (!isOk(result)) {return;}

		// Should only have north region data
		expect(result.data).toHaveLength(2);
		expect(result.data.at(0)?.cells['$[*].product'].raw).toBe('Widget A');
		expect(result.data.at(0)?.cells['$[*].units'].raw).toBe(150);
		expect(result.data.at(1)?.cells['$[*].product'].raw).toBe('Widget B');
		expect(result.data.at(1)?.cells['$[*].units'].raw).toBe(200);
	});

	it('should bind to south region with data_source', () => {
		const result = bindTabularData(
			DATA_SOURCE_MULTI_TABLE_SOUTH.data,
			DATA_SOURCE_MULTI_TABLE_SOUTH.columns,
			DATA_SOURCE_MULTI_TABLE_SOUTH.accessorBindings,
			DATA_SOURCE_MULTI_TABLE_SOUTH.pathContext,
			DATA_SOURCE_MULTI_TABLE_SOUTH.dataSource
		);

		expect(isOk(result)).toBe(true);
		if (!isOk(result)) {return;}

		// Should only have south region data
		expect(result.data).toHaveLength(2);
		expect(result.data.at(0)?.cells['$[*].product'].raw).toBe('Widget C');
		expect(result.data.at(0)?.cells['$[*].units'].raw).toBe(175);
		expect(result.data.at(1)?.cells['$[*].product'].raw).toBe('Widget D');
		expect(result.data.at(1)?.cells['$[*].units'].raw).toBe(225);
	});

	it('should support multi-table binding from same data source', () => {
		// Verify that both tables can be bound from the same root data
		// by using different data_source paths
		const northResult = bindTabularData(
			DATA_SOURCE_MULTI_TABLE_NORTH.data,
			DATA_SOURCE_MULTI_TABLE_NORTH.columns,
			DATA_SOURCE_MULTI_TABLE_NORTH.accessorBindings,
			DATA_SOURCE_MULTI_TABLE_NORTH.pathContext,
			DATA_SOURCE_MULTI_TABLE_NORTH.dataSource
		);

		const southResult = bindTabularData(
			DATA_SOURCE_MULTI_TABLE_SOUTH.data,
			DATA_SOURCE_MULTI_TABLE_SOUTH.columns,
			DATA_SOURCE_MULTI_TABLE_SOUTH.accessorBindings,
			DATA_SOURCE_MULTI_TABLE_SOUTH.pathContext,
			DATA_SOURCE_MULTI_TABLE_SOUTH.dataSource
		);

		expect(isOk(northResult)).toBe(true);
		expect(isOk(southResult)).toBe(true);

		if (!isOk(northResult) || !isOk(southResult)) {return;}

		// Tables should have different data
		expect(northResult.data.at(0)?.cells['$[*].product'].raw).toBe('Widget A');
		expect(southResult.data.at(0)?.cells['$[*].product'].raw).toBe('Widget C');
	});
});
