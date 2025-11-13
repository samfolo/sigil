/**
 * Tests for buildRenderTree
 *
 * Tests cover:
 * - Successful rendering with valid specs and data
 * - Binding error propagation from bindData
 * - Partial rendering with mixed success/failure
 * - Error accumulation (spec errors + binding errors)
 * - Path context correctness in error reporting
 * - Edge cases (empty data, null values, undefined values)
 */

import {describe, expect, it} from 'vitest';

import {ERROR_CODES} from '@sigil/src/common/errors';
import {isErr, isOk} from '@sigil/src/common/errors/result';

import {buildRenderTree} from './buildRenderTree';
import {
	EMPTY_DATA,
	EXPECTED_VALID_RENDER_TREE,
	NESTED_DATA_MIXED_SUCCESS,
	SPEC_ERROR_AND_BINDING_ERROR,
	VALID_SPEC_ALL_BINDING_FAILURE,
	VALID_SPEC_PARTIAL_BINDING_FAILURE,
	VALID_SPEC_VALID_DATA,
} from './buildRenderTree.fixtures';

describe('buildRenderTree - successful rendering', () => {
	it('should render valid spec with valid data successfully', () => {
		const result = buildRenderTree(VALID_SPEC_VALID_DATA.spec, VALID_SPEC_VALID_DATA.data);

		expect(isOk(result)).toBe(true);
		if (!isOk(result)) {
			return;
		}

		// Verify RenderTree structure
		expect(result.data.type).toBe('data-table');
		expect(result.data.props.title).toBe('Users');
		expect(result.data.props.description).toBe('List of users');

		// Verify columns are enriched correctly
		expect(result.data.props.columns).toHaveLength(2);
		expect(result.data.props.columns.at(0)?.id).toBe('$.name');
		expect(result.data.props.columns.at(0)?.label).toBe('Name');
		expect(result.data.props.columns.at(0)?.dataType).toBe('string');
		expect(result.data.props.columns.at(0)?.alignment).toBeUndefined(); // Not specified in config

		expect(result.data.props.columns.at(1)?.id).toBe('$.age');
		expect(result.data.props.columns.at(1)?.label).toBe('Age');
		expect(result.data.props.columns.at(1)?.dataType).toBe('number');
		expect(result.data.props.columns.at(1)?.alignment).toBe('right');

		// Verify row count matches data length
		expect(result.data.props.data).toHaveLength(2);

		// Verify first row structure
		expect(result.data.props.data.at(0)?.id).toBe('row-0');
		expect(result.data.props.data.at(0)?.cells['$.name'].raw).toBe('Alice');
		expect(result.data.props.data.at(0)?.cells['$.name'].display).toBe('Alice');
		expect(result.data.props.data.at(0)?.cells['$.age'].raw).toBe(30);
		expect(result.data.props.data.at(0)?.cells['$.age'].display).toBe('30');

		// Verify second row structure
		expect(result.data.props.data.at(1)?.id).toBe('row-1');
		expect(result.data.props.data.at(1)?.cells['$.name'].raw).toBe('Bob');
		expect(result.data.props.data.at(1)?.cells['$.age'].raw).toBe(25);
	});

	it('should render empty data successfully', () => {
		const result = buildRenderTree(EMPTY_DATA.spec, EMPTY_DATA.data);

		expect(isOk(result)).toBe(true);
		if (!isOk(result)) {
			return;
		}

		// Verify RenderTree structure is correct even with no rows
		expect(result.data.type).toBe('data-table');
		expect(result.data.props.title).toBe('Empty');
		expect(result.data.props.columns).toHaveLength(2);

		// Verify no rows present
		expect(result.data.props.data).toHaveLength(0);
	});

	it('should correctly pass through title and description from config', () => {
		const result = buildRenderTree(VALID_SPEC_VALID_DATA.spec, VALID_SPEC_VALID_DATA.data);

		expect(isOk(result)).toBe(true);
		if (!isOk(result)) {
			return;
		}

		expect(result.data.props.title).toBe(VALID_SPEC_VALID_DATA.spec.root.nodes['users-table'].config.title);
		expect(result.data.props.description).toBe(
			VALID_SPEC_VALID_DATA.spec.root.nodes['users-table'].config.description
		);
	});

	it('should match expected render tree structure exactly', () => {
		const result = buildRenderTree(VALID_SPEC_VALID_DATA.spec, VALID_SPEC_VALID_DATA.data);

		expect(isOk(result)).toBe(true);
		if (!isOk(result)) {
			return;
		}

		// Verify against expected fixture
		expect(result.data).toEqual(EXPECTED_VALID_RENDER_TREE);
	});
});

describe('buildRenderTree - binding error propagation', () => {
	it('should return error when all rows fail to bind', () => {
		const result = buildRenderTree(
			VALID_SPEC_ALL_BINDING_FAILURE.spec,
			VALID_SPEC_ALL_BINDING_FAILURE.data
		);

		expect(isErr(result)).toBe(true);
		if (!isErr(result)) {
			return;
		}

		// Should have accumulated errors from all 3 rows
		expect(Array.isArray(result.error)).toBe(true);
		expect(result.error.length).toBeGreaterThan(0);
	});

	it('should propagate binding errors with correct row indices in paths', () => {
		const result = buildRenderTree(
			VALID_SPEC_ALL_BINDING_FAILURE.spec,
			VALID_SPEC_ALL_BINDING_FAILURE.data
		);

		expect(isErr(result)).toBe(true);
		if (!isErr(result)) {
			return;
		}

		if (!Array.isArray(result.error)) {
			return;
		}

		// Verify error paths contain row indices
		// Paths should be like '[0]', '[1]', '[2]' since path context is ['']
		const errorPaths = result.error.map((e) => e.path);
		expect(errorPaths.some((path) => path?.includes('[0]'))).toBe(true);
		expect(errorPaths.some((path) => path?.includes('[1]'))).toBe(true);
		expect(errorPaths.some((path) => path?.includes('[2]'))).toBe(true);
	});

	it('should preserve error codes from queryJSONPath', () => {
		const result = buildRenderTree(
			VALID_SPEC_ALL_BINDING_FAILURE.spec,
			VALID_SPEC_ALL_BINDING_FAILURE.data
		);

		expect(isErr(result)).toBe(true);
		if (!isErr(result)) {
			return;
		}

		if (!Array.isArray(result.error)) {
			return;
		}

		// All errors should have valid error codes from queryJSONPath
		result.error.forEach((error) => {
			expect(error.code).toBeDefined();
			// Should be QUERY_ERROR or INVALID_ACCESSOR
			expect([ERROR_CODES.QUERY_ERROR, ERROR_CODES.INVALID_ACCESSOR]).toContain(error.code);
		});
	});

	it('should mark binding errors with category "data"', () => {
		const result = buildRenderTree(
			VALID_SPEC_ALL_BINDING_FAILURE.spec,
			VALID_SPEC_ALL_BINDING_FAILURE.data
		);

		expect(isErr(result)).toBe(true);
		if (!isErr(result)) {
			return;
		}

		if (!Array.isArray(result.error)) {
			return;
		}

		// All binding errors should be categorised as 'data' errors
		result.error.forEach((error) => {
			expect(error.category).toBe('data');
		});
	});
});

describe('buildRenderTree - partial rendering with errors', () => {
	it('should accumulate errors when some rows fail to bind', () => {
		const result = buildRenderTree(
			VALID_SPEC_PARTIAL_BINDING_FAILURE.spec,
			VALID_SPEC_PARTIAL_BINDING_FAILURE.data
		);

		expect(isErr(result)).toBe(true);
		if (!isErr(result)) {
			return;
		}

		// Should have errors from the invalid accessor
		expect(result.error.length).toBeGreaterThan(0);

		// Each row will have error from invalid accessor
		// This fixture has one valid column ($.name) and one invalid column (badCol)
		// All rows will have binding errors from the invalid accessor
		expect(result.error.length).toBe(VALID_SPEC_PARTIAL_BINDING_FAILURE.data.length);
	});

	it('should include row indices in error paths', () => {
		const result = buildRenderTree(
			VALID_SPEC_PARTIAL_BINDING_FAILURE.spec,
			VALID_SPEC_PARTIAL_BINDING_FAILURE.data
		);

		expect(isErr(result)).toBe(true);
		if (!isErr(result)) {
			return;
		}

		if (!Array.isArray(result.error)) {
			return;
		}

		// Both rows should have errors (one per row)
		const hasErrorAtRow0 = result.error.some((e) => e.path?.includes('[0]'));
		const hasErrorAtRow1 = result.error.some((e) => e.path?.includes('[1]'));
		expect(hasErrorAtRow0).toBe(true);
		expect(hasErrorAtRow1).toBe(true);
	});

	it('should process all rows even when some columns have errors', () => {
		const result = buildRenderTree(
			VALID_SPEC_PARTIAL_BINDING_FAILURE.spec,
			VALID_SPEC_PARTIAL_BINDING_FAILURE.data
		);

		expect(isErr(result)).toBe(true);
		if (!isErr(result)) {
			return;
		}

		if (!Array.isArray(result.error)) {
			return;
		}

		// Verify that bindData attempted to process all rows
		// Error count should equal row count (one invalid accessor per row)
		expect(result.error.length).toBe(VALID_SPEC_PARTIAL_BINDING_FAILURE.data.length);

		// All errors should be from the invalid accessor
		result.error.forEach((error) => {
			expect(error.code).toBe(ERROR_CODES.INVALID_ACCESSOR);
		});
	});
});

describe('buildRenderTree - error accumulation', () => {
	it('should return spec error when component reference is invalid', () => {
		const result = buildRenderTree(
			SPEC_ERROR_AND_BINDING_ERROR.spec,
			SPEC_ERROR_AND_BINDING_ERROR.data
		);

		expect(isErr(result)).toBe(true);
		if (!isErr(result)) {
			return;
		}

		if (!Array.isArray(result.error)) {
			return;
		}

		// Should have at least one spec error
		expect(result.error.length).toBeGreaterThan(0);

		// First error should be MISSING_COMPONENT
		const firstError = result.error.at(0);
		expect(firstError?.code).toBe(ERROR_CODES.MISSING_COMPONENT);
		expect(firstError?.category).toBe('spec');
	});

	it('should not attempt binding when spec validation fails', () => {
		const result = buildRenderTree(
			SPEC_ERROR_AND_BINDING_ERROR.spec,
			SPEC_ERROR_AND_BINDING_ERROR.data
		);

		expect(isErr(result)).toBe(true);
		if (!isErr(result)) {
			return;
		}

		if (!Array.isArray(result.error)) {
			return;
		}

		// Should only have spec error, no binding errors
		// (binding never attempted because spec validation failed)
		const hasOnlySpecErrors = result.error.every((e) => e.category === 'spec');
		expect(hasOnlySpecErrors).toBe(true);
	});

	it('should include suggestion for similar component names', () => {
		const result = buildRenderTree(
			SPEC_ERROR_AND_BINDING_ERROR.spec,
			SPEC_ERROR_AND_BINDING_ERROR.data
		);

		expect(isErr(result)).toBe(true);
		if (!isErr(result)) {
			return;
		}

		if (!Array.isArray(result.error)) {
			return;
		}

		const missingComponentError = result.error.find((e) => e.code === ERROR_CODES.MISSING_COMPONENT);
		expect(missingComponentError).toBeDefined();
		if (missingComponentError?.code === ERROR_CODES.MISSING_COMPONENT) {
			expect(missingComponentError.context.componentId).toBe('missing-component');
			expect(missingComponentError.context.availableComponents).toContain('actual-component');
		}
	});
});

describe('buildRenderTree - path context correctness', () => {
	it('should construct error paths with correct nesting for nested data', () => {
		const result = buildRenderTree(
			NESTED_DATA_MIXED_SUCCESS.spec,
			NESTED_DATA_MIXED_SUCCESS.data
		);

		expect(isErr(result)).toBe(true);
		if (!isErr(result)) {
			return;
		}

		if (!Array.isArray(result.error)) {
			return;
		}

		// Should have errors from the failing row(s)
		expect(result.error.length).toBeGreaterThan(0);

		// Error paths should reflect the nesting structure
		const errorPaths = result.error.map((e) => e.path);

		// At least one error should reference row index [1] (the failing row)
		const hasRow1Error = errorPaths.some((path) => path?.includes('[1]'));
		expect(hasRow1Error).toBe(true);
	});

	it('should not produce invalid paths with double $ like $[0]$.field', () => {
		const result = buildRenderTree(
			NESTED_DATA_MIXED_SUCCESS.spec,
			NESTED_DATA_MIXED_SUCCESS.data
		);

		expect(isErr(result)).toBe(true);
		if (!isErr(result)) {
			return;
		}

		if (!Array.isArray(result.error)) {
			return;
		}

		// Verify no error paths have invalid patterns like '$[0]$.'
		result.error.forEach((error) => {
			expect(error.path).not.toMatch(/\$\[\d+\]\$/);
		});
	});

	it('should start error paths from root context [""]', () => {
		const result = buildRenderTree(
			VALID_SPEC_ALL_BINDING_FAILURE.spec,
			VALID_SPEC_ALL_BINDING_FAILURE.data
		);

		expect(isErr(result)).toBe(true);
		if (!isErr(result)) {
			return;
		}

		if (!Array.isArray(result.error)) {
			return;
		}

		// Paths should be constructed with root context ['$']
		// which means they should look like '$[0]', '$[1]', '$[2]'
		result.error.forEach((error) => {
			expect(error.path).toMatch(/^\$\[\d+\]/);
		});
	});
});

describe('buildRenderTree - edge cases', () => {
	it('should handle data with null values in cells', () => {
		const specWithNullData = {
			...VALID_SPEC_VALID_DATA.spec,
		};
		const dataWithNulls = [{name: null, age: 30}, {name: 'Bob', age: null}];

		const result = buildRenderTree(specWithNullData, dataWithNulls);

		expect(isOk(result)).toBe(true);
		if (!isOk(result)) {
			return;
		}

		// Null values should be handled gracefully
		expect(result.data.props.data.at(0)?.cells['$.name'].raw).toBeNull();
		expect(result.data.props.data.at(0)?.cells['$.name'].display).toBe('');

		expect(result.data.props.data.at(1)?.cells['$.age'].raw).toBeNull();
		expect(result.data.props.data.at(1)?.cells['$.age'].display).toBe('');
	});

	it('should handle data with undefined values in cells', () => {
		const specWithUndefinedData = {
			...VALID_SPEC_VALID_DATA.spec,
		};
		const dataWithUndefined = [{name: undefined, age: 30}, {name: 'Bob', age: undefined}];

		const result = buildRenderTree(specWithUndefinedData, dataWithUndefined);

		expect(isOk(result)).toBe(true);
		if (!isOk(result)) {
			return;
		}

		// Undefined values should be handled gracefully
		expect(result.data.props.data.at(0)?.cells['$.name'].raw).toBeUndefined();
		expect(result.data.props.data.at(0)?.cells['$.name'].display).toBe('');

		expect(result.data.props.data.at(1)?.cells['$.age'].raw).toBeUndefined();
		expect(result.data.props.data.at(1)?.cells['$.age'].display).toBe('');
	});

	it('should handle single row successfully', () => {
		const specSingleRow = {
			...VALID_SPEC_VALID_DATA.spec,
		};
		const singleRowData = [{name: 'Alice', age: 30}];

		const result = buildRenderTree(specSingleRow, singleRowData);

		expect(isOk(result)).toBe(true);
		if (!isOk(result)) {
			return;
		}

		expect(result.data.props.data).toHaveLength(1);
		expect(result.data.props.data.at(0)?.cells['$.name'].raw).toBe('Alice');
		expect(result.data.props.data.at(0)?.cells['$.age'].raw).toBe(30);
	});

	it.each([
		{description: 'empty array', data: []},
		{description: 'array with one empty object', data: [{}]},
	])('should handle $description without errors', ({data}) => {
		const result = buildRenderTree(VALID_SPEC_VALID_DATA.spec, data);

		expect(isOk(result)).toBe(true);
		if (!isOk(result)) {
			return;
		}

		expect(result.data.props.data).toHaveLength(data.length);
	});
});
