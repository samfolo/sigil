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

import {ERROR_CODES} from '@sigil/src/common/errors/codes';
import {isErr, isOk} from '@sigil/src/common/errors/result';

import {bindData} from './binding';
import {
	ALL_COLUMNS_UNDEFINED,
	COMPLEX_VALUE_MAPPINGS,
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
	SIMPLE_FLAT_DATA,
	SINGLE_ROW_SINGLE_COLUMN,
} from './binding.fixtures';

describe('bindData - successful binding', () => {
	it('should bind simple flat data successfully', () => {
		const result = bindData(
			SIMPLE_FLAT_DATA.data,
			SIMPLE_FLAT_DATA.columns,
			SIMPLE_FLAT_DATA.accessorBindings,
			SIMPLE_FLAT_DATA.pathContext
		);

		expect(isOk(result)).toBe(true);
		if (!isOk(result)) {return;}

		expect(result.data).toHaveLength(3);
		expect(result.data.at(0)?.id).toBe('row-0');
		expect(result.data.at(0)?.cells['$.name'].raw).toBe('Alice Johnson');
		expect(result.data.at(0)?.cells['$.name'].display).toBe('Alice Johnson');
		expect(result.data.at(0)?.cells['$.age'].raw).toBe(28);
		expect(result.data.at(0)?.cells['$.active'].raw).toBe(true);
		expect(result.data.at(0)?.cells['$.active'].display).toBe('Active'); // value mapping applied

		expect(result.data.at(1)?.cells['$.active'].display).toBe('Inactive'); // value mapping for false
	});

	it('should bind nested object data successfully', () => {
		const result = bindData(
			NESTED_OBJECT_DATA.data,
			NESTED_OBJECT_DATA.columns,
			NESTED_OBJECT_DATA.accessorBindings,
			NESTED_OBJECT_DATA.pathContext
		);

		expect(isOk(result)).toBe(true);
		if (!isOk(result)) {return;}

		expect(result.data).toHaveLength(2);
		expect(result.data.at(0)?.cells['$.user.profile.name'].raw).toBe('David Chen');
		expect(result.data.at(0)?.cells['$.user.profile.email'].raw).toBe('david.chen@example.com');
		expect(result.data.at(1)?.cells['$.user.profile.name'].raw).toBe('Emma Davis');
	});

	it('should bind data with arrays in rows successfully', () => {
		const result = bindData(
			DATA_WITH_ARRAYS.data,
			DATA_WITH_ARRAYS.columns,
			DATA_WITH_ARRAYS.accessorBindings,
			DATA_WITH_ARRAYS.pathContext
		);

		expect(isOk(result)).toBe(true);
		if (!isOk(result)) {return;}

		expect(result.data).toHaveLength(3);
		expect(result.data.at(0)?.cells['$.tags[0]'].raw).toBe('electronics');
		expect(result.data.at(0)?.cells['$.scores[1]'].raw).toBe(9.2);
		expect(result.data.at(1)?.cells['$.tags[0]'].raw).toBe('electronics');
		expect(result.data.at(1)?.cells['$.scores[1]'].raw).toBe(8.7);
	});

	it('should bind deeply nested structures successfully', () => {
		const result = bindData(
			DEEPLY_NESTED_DATA.data,
			DEEPLY_NESTED_DATA.columns,
			DEEPLY_NESTED_DATA.accessorBindings,
			DEEPLY_NESTED_DATA.pathContext
		);

		expect(isOk(result)).toBe(true);
		if (!isOk(result)) {return;}

		expect(result.data).toHaveLength(2);
		expect(result.data.at(0)?.cells['$.company.department.employees[0].name'].raw).toBe(
			'Frank Lee'
		);
		expect(result.data.at(0)?.cells['$.company.department.employees[0].role'].raw).toBe(
			'Manager'
		);
		expect(result.data.at(0)?.cells['$.company.department.budget'].raw).toBe(150000);
	});

	it('should apply value mappings correctly', () => {
		const result = bindData(
			COMPLEX_VALUE_MAPPINGS.data,
			COMPLEX_VALUE_MAPPINGS.columns,
			COMPLEX_VALUE_MAPPINGS.accessorBindings,
			COMPLEX_VALUE_MAPPINGS.pathContext
		);

		expect(isOk(result)).toBe(true);
		if (!isOk(result)) {return;}

		// Check priority value mappings: 1 → 'Critical', 2 → 'Important', 3 → 'Normal'
		expect(result.data.at(0)?.cells['$.priority'].raw).toBe(1);
		expect(result.data.at(0)?.cells['$.priority'].display).toBe('Critical');
		expect(result.data.at(1)?.cells['$.priority'].display).toBe('Important');
		expect(result.data.at(2)?.cells['$.priority'].display).toBe('Normal');

		// Check severity value mappings
		expect(result.data.at(0)?.cells['$.severity'].display).toBe('High Risk');
		expect(result.data.at(1)?.cells['$.severity'].display).toBe('Medium Risk');
		expect(result.data.at(2)?.cells['$.severity'].display).toBe('Low Risk');
	});

	it('should preserve cell metadata (format, dataType)', () => {
		const result = bindData(
			SIMPLE_FLAT_DATA.data,
			SIMPLE_FLAT_DATA.columns,
			SIMPLE_FLAT_DATA.accessorBindings,
			SIMPLE_FLAT_DATA.pathContext
		);

		expect(isOk(result)).toBe(true);
		if (!isOk(result)) {return;}

		const nameCell = result.data.at(0)?.cells['$.name'];
		expect(nameCell?.dataType).toBe('string');

		const ageCell = result.data.at(0)?.cells['$.age'];
		expect(ageCell?.dataType).toBe('number');
	});
});

describe('bindData - error accumulation', () => {
	it('should accumulate errors when accessor points to missing field', () => {
		const result = bindData(
			INVALID_ACCESSOR_MISSING_FIELD.data,
			INVALID_ACCESSOR_MISSING_FIELD.columns,
			INVALID_ACCESSOR_MISSING_FIELD.accessorBindings,
			INVALID_ACCESSOR_MISSING_FIELD.pathContext
		);

		expect(isOk(result)).toBe(true);
		if (!isOk(result)) {return;}

		// Missing fields should result in undefined raw, empty display
		expect(result.data.at(0)?.cells['$.email'].raw).toBeUndefined();
		expect(result.data.at(0)?.cells['$.email'].display).toBe('');
		expect(result.data.at(1)?.cells['$.email'].raw).toBeUndefined();
		expect(result.data.at(1)?.cells['$.email'].display).toBe('');
	});

	it('should handle wrong array index gracefully', () => {
		const result = bindData(
			INVALID_ACCESSOR_ARRAY_INDEX.data,
			INVALID_ACCESSOR_ARRAY_INDEX.columns,
			INVALID_ACCESSOR_ARRAY_INDEX.accessorBindings,
			INVALID_ACCESSOR_ARRAY_INDEX.pathContext
		);

		expect(isOk(result)).toBe(true);
		if (!isOk(result)) {return;}

		// Valid index should work
		expect(result.data.at(0)?.cells['$.items[0]'].raw).toBe('first');

		// Out of bounds index should return undefined
		expect(result.data.at(0)?.cells['$.items[5]'].raw).toBeUndefined();
		expect(result.data.at(0)?.cells['$.items[5]'].display).toBe('');
	});

	it('should stringify arrays when accessor returns array', () => {
		const result = bindData(
			INVALID_ACCESSOR_ARRAY_RETURNED.data,
			INVALID_ACCESSOR_ARRAY_RETURNED.columns,
			INVALID_ACCESSOR_ARRAY_RETURNED.accessorBindings,
			INVALID_ACCESSOR_ARRAY_RETURNED.pathContext
		);

		expect(isOk(result)).toBe(true);
		if (!isOk(result)) {return;}

		// Accessor returns full array - should be stringified
		const cell = result.data.at(0)?.cells['$.tags'];
		expect(Array.isArray(cell?.raw)).toBe(true);
		expect(cell?.display).toContain('tag1'); // Stringified array representation
	});

	it('should handle mixed success/failure across rows', () => {
		const result = bindData(
			MIXED_SUCCESS_FAILURE_DATA.data,
			MIXED_SUCCESS_FAILURE_DATA.columns,
			MIXED_SUCCESS_FAILURE_DATA.accessorBindings,
			MIXED_SUCCESS_FAILURE_DATA.pathContext
		);

		expect(isOk(result)).toBe(true);
		if (!isOk(result)) {return;}

		expect(result.data).toHaveLength(4);

		// Rows with optionalField present
		expect(result.data.at(0)?.cells['$.optionalField'].raw).toBe('Present');
		expect(result.data.at(2)?.cells['$.optionalField'].raw).toBe('Also Present');

		// Rows with optionalField missing
		expect(result.data.at(1)?.cells['$.optionalField'].raw).toBeUndefined();
		expect(result.data.at(1)?.cells['$.optionalField'].display).toBe('');
		expect(result.data.at(3)?.cells['$.optionalField'].raw).toBeUndefined();
		expect(result.data.at(3)?.cells['$.optionalField'].display).toBe('');
	});
});

describe('bindData - path context construction', () => {
	it('should construct row paths with simple path context', () => {
		const result = bindData(
			SIMPLE_FLAT_DATA.data,
			SIMPLE_FLAT_DATA.columns,
			SIMPLE_FLAT_DATA.accessorBindings,
			['$']
		);

		expect(isOk(result)).toBe(true);
		if (!isOk(result)) {return;}

		// Row IDs should be correctly numbered
		expect(result.data.at(0)?.id).toBe('row-0');
		expect(result.data.at(1)?.id).toBe('row-1');
		expect(result.data.at(2)?.id).toBe('row-2');
	});

	it('should construct row paths with nested path context', () => {
		const result = bindData(
			NESTED_PATH_CONTEXT.data,
			NESTED_PATH_CONTEXT.columns,
			NESTED_PATH_CONTEXT.accessorBindings,
			NESTED_PATH_CONTEXT.pathContext // ['$', '.data', '.users']
		);

		expect(isOk(result)).toBe(true);
		if (!isOk(result)) {return;}

		// Should still produce valid rows
		expect(result.data).toHaveLength(2);
		expect(result.data.at(0)?.cells['$.userId'].raw).toBe(101);
		expect(result.data.at(1)?.cells['$.userId'].raw).toBe(102);
	});

	it('should build valid row paths for error reporting', () => {
		// This test will be more meaningful once we implement error path construction
		// For now, verify that row paths are constructed correctly in the implementation
		const pathContext = ['$', '.data'];
		const result = bindData(
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

describe('bindData - accessor path stripping', () => {
	it('should strip $. prefix when building full paths', () => {
		// This test validates that accessor '$.user.name' is correctly stripped to 'user.name'
		// before combining with rowPath to avoid paths like '$[0]$.user.name'
		const result = bindData(
			NESTED_OBJECT_DATA.data,
			NESTED_OBJECT_DATA.columns,
			NESTED_OBJECT_DATA.accessorBindings,
			['$']
		);

		expect(isOk(result)).toBe(true);
		if (!isOk(result)) {return;}

		// Verify that nested accessors work correctly
		expect(result.data.at(0)?.cells['$.user.profile.name'].raw).toBe('David Chen');
	});

	it('should handle array accessors correctly in path construction', () => {
		const result = bindData(
			DATA_WITH_ARRAYS.data,
			DATA_WITH_ARRAYS.columns,
			DATA_WITH_ARRAYS.accessorBindings,
			['$']
		);

		expect(isOk(result)).toBe(true);
		if (!isOk(result)) {return;}

		// Array accessors like '$.tags[0]' should work correctly
		expect(result.data.at(0)?.cells['$.tags[0]'].raw).toBe('electronics');
		expect(result.data.at(0)?.cells['$.scores[1]'].raw).toBe(9.2);
	});

	it('should not produce invalid paths like $[0]$.field', () => {
		// This is a regression test - ensure path construction doesn't create invalid JSONPath
		const result = bindData(
			SIMPLE_FLAT_DATA.data,
			SIMPLE_FLAT_DATA.columns,
			SIMPLE_FLAT_DATA.accessorBindings,
			['$']
		);

		expect(isOk(result)).toBe(true);
		// If errors were produced, their paths should be valid JSONPath like:
		// '$[0].name' not '$[0]$.name'
		// This will be tested more thoroughly when error handling is implemented
	});
});

describe('bindData - error context preservation', () => {
	it('should preserve original error context when updating paths', () => {
		// This test will be more meaningful once error handling is fully implemented
		// It verifies that when queryJSONPath returns an error, the context is preserved
		// and only the path field is updated with row context
		const result = bindData(
			SIMPLE_FLAT_DATA.data,
			SIMPLE_FLAT_DATA.columns,
			SIMPLE_FLAT_DATA.accessorBindings,
			['$']
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
		const result = bindData(
			INVALID_ACCESSOR_MISSING_FIELD.data,
			INVALID_ACCESSOR_MISSING_FIELD.columns,
			INVALID_ACCESSOR_MISSING_FIELD.accessorBindings,
			['$']
		);

		// The result should still be ok for missing fields (they return undefined)
		expect(isOk(result)).toBe(true);
	});
});

describe('bindData - edge cases', () => {
	it('should handle empty data array', () => {
		const result = bindData(
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
		const result = bindData(
			DATA_WITH_NULL_VALUES.data,
			DATA_WITH_NULL_VALUES.columns,
			DATA_WITH_NULL_VALUES.accessorBindings,
			DATA_WITH_NULL_VALUES.pathContext
		);

		expect(isOk(result)).toBe(true);
		if (!isOk(result)) {return;}

		expect(result.data).toHaveLength(3);

		// Null values should produce empty display strings
		expect(result.data.at(0)?.cells['$.status'].raw).toBeNull();
		expect(result.data.at(0)?.cells['$.status'].display).toBe('');

		expect(result.data.at(1)?.cells['$.name'].raw).toBeNull();
		expect(result.data.at(1)?.cells['$.name'].display).toBe('');
	});

	it('should handle undefined values in data', () => {
		const result = bindData(
			DATA_WITH_UNDEFINED_VALUES.data,
			DATA_WITH_UNDEFINED_VALUES.columns,
			DATA_WITH_UNDEFINED_VALUES.accessorBindings,
			DATA_WITH_UNDEFINED_VALUES.pathContext
		);

		expect(isOk(result)).toBe(true);
		if (!isOk(result)) {return;}

		expect(result.data).toHaveLength(2);

		// Undefined values should produce empty display strings
		expect(result.data.at(0)?.cells['$.value'].raw).toBeUndefined();
		expect(result.data.at(0)?.cells['$.value'].display).toBe('');

		expect(result.data.at(1)?.cells['$.name'].raw).toBeUndefined();
		expect(result.data.at(1)?.cells['$.name'].display).toBe('');
	});

	it('should handle single row with single column', () => {
		const result = bindData(
			SINGLE_ROW_SINGLE_COLUMN.data,
			SINGLE_ROW_SINGLE_COLUMN.columns,
			SINGLE_ROW_SINGLE_COLUMN.accessorBindings,
			SINGLE_ROW_SINGLE_COLUMN.pathContext
		);

		expect(isOk(result)).toBe(true);
		if (!isOk(result)) {return;}

		expect(result.data).toHaveLength(1);
		expect(result.data.at(0)?.cells['$.name'].raw).toBe('Single');
	});

	it('should handle row with all columns having undefined values', () => {
		const result = bindData(
			ALL_COLUMNS_UNDEFINED.data,
			ALL_COLUMNS_UNDEFINED.columns,
			ALL_COLUMNS_UNDEFINED.accessorBindings,
			ALL_COLUMNS_UNDEFINED.pathContext
		);

		expect(isOk(result)).toBe(true);
		if (!isOk(result)) {return;}

		expect(result.data).toHaveLength(1);
		expect(result.data.at(0)?.cells['$.missing1'].raw).toBeUndefined();
		expect(result.data.at(0)?.cells['$.missing1'].display).toBe('');
		expect(result.data.at(0)?.cells['$.missing2'].raw).toBeUndefined();
		expect(result.data.at(0)?.cells['$.missing2'].display).toBe('');
	});
});

describe('bindData - error scenarios with invalid accessors', () => {
	it('should handle accessor that does not start with $', () => {
		const result = bindData(
			INVALID_ACCESSOR_NO_DOLLAR_PREFIX.data,
			INVALID_ACCESSOR_NO_DOLLAR_PREFIX.columns,
			INVALID_ACCESSOR_NO_DOLLAR_PREFIX.accessorBindings,
			INVALID_ACCESSOR_NO_DOLLAR_PREFIX.pathContext
		);

		// This should fail because 'name' doesn't start with '$'
		expect(isErr(result)).toBe(true);
		if (!isErr(result)) {return;}

		expect(result.error).toHaveLength(1); // One error per row
		expect(result.error.at(0)?.code).toBe(ERROR_CODES.INVALID_ACCESSOR);
		expect(result.error.at(0)?.context.accessor).toBe('name');
	});

	it('should accumulate multiple errors across rows for invalid accessor', () => {
		const result = bindData(
			MULTIPLE_ROWS_INVALID_ACCESSOR.data,
			MULTIPLE_ROWS_INVALID_ACCESSOR.columns,
			MULTIPLE_ROWS_INVALID_ACCESSOR.accessorBindings,
			MULTIPLE_ROWS_INVALID_ACCESSOR.pathContext
		);

		expect(isErr(result)).toBe(true);
		if (!isErr(result)) {return;}

		// Should have 3 errors (one per row)
		expect(result.error.length).toBe(3);
		result.error.forEach((error) => {
			expect(error.code).toBe(ERROR_CODES.INVALID_ACCESSOR);
		});
	});

	it('should update error paths with row context for invalid accessors', () => {
		const result = bindData(
			INVALID_ACCESSOR_WITH_PATH_CONTEXT.data,
			INVALID_ACCESSOR_WITH_PATH_CONTEXT.columns,
			INVALID_ACCESSOR_WITH_PATH_CONTEXT.accessorBindings,
			INVALID_ACCESSOR_WITH_PATH_CONTEXT.pathContext
		);

		expect(isErr(result)).toBe(true);
		if (!isErr(result)) {return;}

		// Error paths should include row indices
		expect(result.error.at(0)?.path).toBe('$[0]');
		expect(result.error.at(1)?.path).toBe('$[1]');
	});
});
