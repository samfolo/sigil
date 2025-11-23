/**
 * Tests for buildRenderTree
 *
 * Comprehensive test coverage:
 * - Single component rendering with valid data
 * - Stack layouts (horizontal and vertical) with multiple components
 * - Grid layouts with positioned children
 * - Nested layouts at multiple depths
 * - Error propagation from walkLayout
 * - Error propagation from builder.build
 * - Mixed success and failure across siblings
 * - pathContext threading through recursion
 * - Empty children arrays
 * - Component placeholder replacement
 */

import {describe, expect, it} from 'vitest';

import {ERROR_CODES} from '@sigil/src/common/errors';
import {isErr, isOk} from '@sigil/src/common/errors/result';

import {JSONPATH_ROOT} from '../constants';

import {buildRenderTree} from './buildRenderTree';
import {
	DEEPLY_NESTED_DATA,
	DEEPLY_NESTED_SPEC,
	EMPTY_STACK_SPEC,
	GRID_AUTO_FLOW_DATA,
	GRID_AUTO_FLOW_SPEC,
	GRID_POSITIONED_DATA,
	GRID_POSITIONED_SPEC,
	HORIZONTAL_STACK_DATA,
	HORIZONTAL_STACK_SPEC,
	MULTIPLE_ERRORS_DATA,
	MULTIPLE_ERRORS_SPEC,
	NESTED_ERROR_DATA,
	NESTED_ERROR_SPEC,
	NESTED_GRID_DATA,
	NESTED_GRID_IN_STACK_SPEC,
	NESTED_STACK_DATA,
	NESTED_STACK_IN_STACK_SPEC,
	PARTIAL_SUCCESS_DATA,
	PARTIAL_SUCCESS_SPEC,
	SINGLE_DATA_TABLE_DATA,
	SINGLE_DATA_TABLE_SPEC,
	SPEC_ERROR_DATA,
	SPEC_ERROR_SPEC,
	VERTICAL_STACK_DATA,
	VERTICAL_STACK_SPEC,
} from './buildRenderTree.fixtures';

describe('buildRenderTree - single component', () => {
	it('should successfully render single data-table component', () => {
		const result = buildRenderTree(SINGLE_DATA_TABLE_SPEC, SINGLE_DATA_TABLE_DATA);

		expect(isOk(result)).toBe(true);
		if (!isOk(result)) {
			return;
		}

		// Verify RenderTree structure
		expect(result.data.type).toBe('vertical-stack');
		if (result.data.type !== 'vertical-stack') {
			return;
		}

		// Should have one child (the data-table component)
		expect(result.data.children).toHaveLength(1);

		const child = result.data.children.at(0);
		expect(child?.type).toBe('data-table');

		if (child?.type !== 'data-table') {
			return;
		}

		// Verify component props are populated
		expect(child.props.title).toBe('Users');
		expect(child.props.description).toBe('List of users');
		expect(child.props.columns).toHaveLength(2);
		expect(child.props.data).toHaveLength(2);

		// Verify componentId is preserved
		expect(child.componentId).toBe('users-table');

		// Verify data binding worked correctly
		expect(child.props.data.at(0)?.cells['$[*].name'].raw).toBe('Alice');
		expect(child.props.data.at(0)?.cells['$[*].age'].raw).toBe(30);
		expect(child.props.data.at(1)?.cells['$[*].name'].raw).toBe('Bob');
		expect(child.props.data.at(1)?.cells['$[*].age'].raw).toBe(25);
	});

	it('should propagate errors from walkLayout', () => {
		const result = buildRenderTree(SPEC_ERROR_SPEC, SPEC_ERROR_DATA);

		expect(isErr(result)).toBe(true);
		if (!isErr(result)) {
			return;
		}

		// Should have MISSING_COMPONENT error from walkLayout
		expect(result.error).toHaveLength(1);
		expect(result.error.at(0)?.code).toBe(ERROR_CODES.MISSING_COMPONENT);
		expect(result.error.at(0)?.context).toMatchObject({
			componentId: 'missing-component',
		});
	});
});

describe('buildRenderTree - stack layouts', () => {
	it('should process horizontal stack with multiple components', () => {
		const result = buildRenderTree(HORIZONTAL_STACK_SPEC, HORIZONTAL_STACK_DATA);

		expect(isOk(result)).toBe(true);
		if (!isOk(result)) {
			return;
		}

		expect(result.data.type).toBe('horizontal-stack');
		if (result.data.type !== 'horizontal-stack') {
			return;
		}

		// Verify all three components are processed
		expect(result.data.children).toHaveLength(3);

		const child1 = result.data.children.at(0);
		const child2 = result.data.children.at(1);
		const child3 = result.data.children.at(2);

		expect(child1?.type).toBe('data-table');
		expect(child2?.type).toBe('data-table');
		expect(child3?.type).toBe('data-table');

		if (child1?.type === 'data-table') {
			expect(child1.props.title).toBe('Table 1');
			expect(child1.componentId).toBe('table-1');
			expect(child1.props.data).toHaveLength(1);
		}

		if (child2?.type === 'data-table') {
			expect(child2.props.title).toBe('Table 2');
			expect(child2.componentId).toBe('table-2');
			expect(child2.props.data).toHaveLength(1);
		}

		if (child3?.type === 'data-table') {
			expect(child3.props.title).toBe('Table 3');
			expect(child3.componentId).toBe('table-3');
			expect(child3.props.data).toHaveLength(1);
		}
	});

	it('should process vertical stack with multiple components', () => {
		const result = buildRenderTree(VERTICAL_STACK_SPEC, VERTICAL_STACK_DATA);

		expect(isOk(result)).toBe(true);
		if (!isOk(result)) {
			return;
		}

		expect(result.data.type).toBe('vertical-stack');
		if (result.data.type !== 'vertical-stack') {
			return;
		}

		expect(result.data.children).toHaveLength(2);
		expect(result.data.spacing).toBe('tight');

		// Verify both components have data bound
		const child1 = result.data.children.at(0);
		const child2 = result.data.children.at(1);

		if (child1?.type === 'data-table') {
			expect(child1.props.data).toHaveLength(1);
		}

		if (child2?.type === 'data-table') {
			expect(child2.props.data).toHaveLength(1);
		}
	});

	it('should handle empty stack children array', () => {
		const result = buildRenderTree(EMPTY_STACK_SPEC, []);

		expect(isOk(result)).toBe(true);
		if (!isOk(result)) {
			return;
		}

		expect(result.data.type).toBe('vertical-stack');
		if (result.data.type !== 'vertical-stack') {
			return;
		}

		expect(result.data.children).toHaveLength(0);
	});
});

describe('buildRenderTree - grid layouts', () => {
	it('should process grid layout with positioned children', () => {
		const result = buildRenderTree(GRID_POSITIONED_SPEC, GRID_POSITIONED_DATA);

		expect(isOk(result)).toBe(true);
		if (!isOk(result)) {
			return;
		}

		expect(result.data.type).toBe('grid');
		if (result.data.type !== 'grid') {
			return;
		}

		// Verify grid structure
		expect(result.data.columns).toBe(2);
		expect(result.data.rows).toBe(2);
		expect(result.data.children).toHaveLength(2);

		// Verify first child positioning is preserved
		const gridChild1 = result.data.children.at(0);
		expect(gridChild1?.column_start).toBe(1);
		expect(gridChild1?.row_start).toBe(1);
		expect(gridChild1?.element.type).toBe('data-table');

		// Verify element was processed (has data)
		if (gridChild1?.element.type === 'data-table') {
			expect(gridChild1.element.props.data).toHaveLength(1);
			expect(gridChild1.element.componentId).toBe('table-1');
		}

		// Verify second child positioning is preserved
		const gridChild2 = result.data.children.at(1);
		expect(gridChild2?.column_start).toBe(2);
		expect(gridChild2?.row_start).toBe(1);
		expect(gridChild2?.column_span).toBe(1);
		expect(gridChild2?.row_span).toBe(2);
		expect(gridChild2?.element.type).toBe('data-table');

		// Verify element was processed (has data)
		if (gridChild2?.element.type === 'data-table') {
			expect(gridChild2.element.props.data).toHaveLength(1);
			expect(gridChild2.element.componentId).toBe('table-2');
		}
	});

	it('should process grid layout with auto-flow children', () => {
		const result = buildRenderTree(GRID_AUTO_FLOW_SPEC, GRID_AUTO_FLOW_DATA);

		expect(isOk(result)).toBe(true);
		if (!isOk(result)) {
			return;
		}

		expect(result.data.type).toBe('grid');
		if (result.data.type !== 'grid') {
			return;
		}

		expect(result.data.children).toHaveLength(3);

		// Verify positioning fields are undefined for auto-flow
		const gridChild1 = result.data.children.at(0);
		expect(gridChild1?.column_start).toBeUndefined();
		expect(gridChild1?.row_start).toBeUndefined();

		// Verify elements were processed
		if (gridChild1?.element.type === 'data-table') {
			expect(gridChild1.element.props.data).toHaveLength(1);
		}
	});
});

describe('buildRenderTree - nested layouts', () => {
	it('should process nested stack in stack', () => {
		const result = buildRenderTree(NESTED_STACK_IN_STACK_SPEC, NESTED_STACK_DATA);

		expect(isOk(result)).toBe(true);
		if (!isOk(result)) {
			return;
		}

		expect(result.data.type).toBe('vertical-stack');
		if (result.data.type !== 'vertical-stack') {
			return;
		}

		expect(result.data.children).toHaveLength(2);

		// First child should be horizontal stack
		const innerStack = result.data.children.at(0);
		expect(innerStack?.type).toBe('horizontal-stack');

		if (innerStack?.type === 'horizontal-stack') {
			expect(innerStack.children).toHaveLength(1);
			expect(innerStack.children.at(0)?.type).toBe('data-table');

			// Verify nested component was processed
			const nestedTable = innerStack.children.at(0);
			if (nestedTable?.type === 'data-table') {
				expect(nestedTable.props.title).toBe('Inner Table');
				expect(nestedTable.props.data).toHaveLength(1);
			}
		}

		// Second child should be data-table
		const outerTable = result.data.children.at(1);
		expect(outerTable?.type).toBe('data-table');

		if (outerTable?.type === 'data-table') {
			expect(outerTable.props.title).toBe('Outer Table');
			expect(outerTable.props.data).toHaveLength(1);
		}
	});

	it('should process nested grid in stack', () => {
		const result = buildRenderTree(NESTED_GRID_IN_STACK_SPEC, NESTED_GRID_DATA);

		expect(isOk(result)).toBe(true);
		if (!isOk(result)) {
			return;
		}

		expect(result.data.type).toBe('vertical-stack');
		if (result.data.type !== 'vertical-stack') {
			return;
		}

		const innerGrid = result.data.children.at(0);
		expect(innerGrid?.type).toBe('grid');

		if (innerGrid?.type === 'grid') {
			expect(innerGrid.columns).toBe(2);
			expect(innerGrid.children).toHaveLength(2);

			// Verify grid children were processed
			const gridChild1 = innerGrid.children.at(0);
			if (gridChild1?.element.type === 'data-table') {
				expect(gridChild1.element.props.data).toHaveLength(1);
			}

			const gridChild2 = innerGrid.children.at(1);
			if (gridChild2?.element.type === 'data-table') {
				expect(gridChild2.element.props.data).toHaveLength(1);
			}
		}
	});

	it('should process deeply nested layouts (3 levels)', () => {
		const result = buildRenderTree(DEEPLY_NESTED_SPEC, DEEPLY_NESTED_DATA);

		expect(isOk(result)).toBe(true);
		if (!isOk(result)) {
			return;
		}

		// Navigate through nested structure
		expect(result.data.type).toBe('vertical-stack');
		if (result.data.type !== 'vertical-stack') {
			return;
		}

		const level2 = result.data.children.at(0);
		expect(level2?.type).toBe('grid');

		if (level2?.type === 'grid') {
			const gridChild = level2.children.at(0);
			const level3 = gridChild?.element;
			expect(level3?.type).toBe('horizontal-stack');

			if (level3?.type === 'horizontal-stack') {
				const innerTable = level3.children.at(0);
				expect(innerTable?.type).toBe('data-table');

				if (innerTable?.type === 'data-table') {
					expect(innerTable.props.title).toBe('Deep Table');
					expect(innerTable.props.data).toHaveLength(1);
					expect(innerTable.props.data.at(0)?.cells['$[*].value'].raw).toBe('deep');
				}
			}
		}
	});
});

describe('buildRenderTree - error handling', () => {
	it('should accumulate errors from multiple components', () => {
		const result = buildRenderTree(MULTIPLE_ERRORS_SPEC, MULTIPLE_ERRORS_DATA);

		expect(isErr(result)).toBe(true);
		if (!isErr(result)) {
			return;
		}

		// Should accumulate errors from both components
		expect(result.error.length).toBeGreaterThan(0);

		// Both invalid accessors should be reported
		const accessorErrors = result.error.filter((e) => e.code === ERROR_CODES.INVALID_ACCESSOR);
		expect(accessorErrors.length).toBe(2);

		// Verify both accessor names are in the errors
		const errorAccessors = accessorErrors.map((e) => e.context.accessor);
		expect(errorAccessors).toContain('badAccessor1');
		expect(errorAccessors).toContain('badAccessor2');
	});

	it('should continue processing siblings when one fails', () => {
		const result = buildRenderTree(PARTIAL_SUCCESS_SPEC, PARTIAL_SUCCESS_DATA);

		// Should fail because one component has errors
		expect(isErr(result)).toBe(true);
		if (!isErr(result)) {
			return;
		}

		// Should have errors from the invalid component
		expect(result.error.length).toBeGreaterThan(0);

		// Verify error is specifically from the invalid accessor
		const accessorError = result.error.find((e) => e.code === ERROR_CODES.INVALID_ACCESSOR);
		expect(accessorError).toBeDefined();
		expect(accessorError?.context.accessor).toBe('invalid');
	});
});

describe('buildRenderTree - pathContext threading', () => {
	it('should thread pathContext through nested layouts and include in error paths', () => {
		const result = buildRenderTree(NESTED_ERROR_SPEC, NESTED_ERROR_DATA);

		expect(isErr(result)).toBe(true);
		if (!isErr(result)) {
			return;
		}

		// Find the invalid accessor error
		const accessorError = result.error.find((e) => e.code === ERROR_CODES.INVALID_ACCESSOR);
		expect(accessorError).toBeDefined();

		// Verify path includes nested layout context
		// Path should be: $.layout.children[0].layout.children[0]
		// The path shows we went through the outer stack's first child (the nested stack)
		// and then the nested stack's first child (the component)
		expect(accessorError?.path).toContain(JSONPATH_ROOT);
		expect(accessorError?.path).toContain('.layout.children[0]');

		// Verify the accessor in context
		expect(accessorError?.context.accessor).toBe('invalidAccessor');
	});

	it('should include correct pathContext in deeply nested error', () => {
		// Create a spec with error at deepest level
		const spec = {
			...DEEPLY_NESTED_SPEC,
			root: {
				...DEEPLY_NESTED_SPEC.root,
				nodes: {
					'table-1': {
						id: 'table-1',
						type: 'data-table' as const,
						config: {
							type: 'data-table' as const,
							columns: [{accessor: 'deepInvalidAccessor', label: 'Invalid'}],
							affordances: [],
						},
					},
				},
				accessor_bindings: {
					'table-1': {
						deepInvalidAccessor: {roles: ['label' as const], data_types: ['string' as const]},
					},
				},
			},
		};

		const result = buildRenderTree(spec, [{x: 1}]);

		expect(isErr(result)).toBe(true);
		if (!isErr(result)) {
			return;
		}

		// Find the invalid accessor error
		const accessorError = result.error.find((e) => e.code === ERROR_CODES.INVALID_ACCESSOR);
		expect(accessorError).toBeDefined();

		// Path should show multiple levels of nesting
		// $.layout.children[0].layout.children[0].element.layout.children[0]
		expect(accessorError?.path).toContain(JSONPATH_ROOT);
		expect(accessorError?.path).toContain('.layout.children[0]');

		// Verify context
		expect(accessorError?.context.accessor).toBe('deepInvalidAccessor');
	});
});

describe('buildRenderTree - edge cases', () => {
	it('should handle data with null values in cells', () => {
		const specWithNullData = SINGLE_DATA_TABLE_SPEC;
		const dataWithNulls = [{name: null, age: 30}, {name: 'Bob', age: null}];

		const result = buildRenderTree(specWithNullData, dataWithNulls);

		expect(isOk(result)).toBe(true);
		if (!isOk(result)) {
			return;
		}

		expect(result.data.type).toBe('vertical-stack');
		if (result.data.type !== 'vertical-stack') {
			return;
		}

		const dataTable = result.data.children.at(0);
		if (dataTable?.type !== 'data-table') {
			return;
		}

		// Null values should be handled gracefully
		expect(dataTable.props.data.at(0)?.cells['$[*].name'].raw).toBeNull();
		expect(dataTable.props.data.at(0)?.cells['$[*].name'].display).toBe('');

		expect(dataTable.props.data.at(1)?.cells['$[*].age'].raw).toBeNull();
		expect(dataTable.props.data.at(1)?.cells['$[*].age'].display).toBe('');
	});

	it('should handle data with undefined values in cells', () => {
		const specWithUndefinedData = SINGLE_DATA_TABLE_SPEC;
		const dataWithUndefined = [{name: undefined, age: 30}, {name: 'Bob', age: undefined}];

		const result = buildRenderTree(specWithUndefinedData, dataWithUndefined);

		expect(isOk(result)).toBe(true);
		if (!isOk(result)) {
			return;
		}

		expect(result.data.type).toBe('vertical-stack');
		if (result.data.type !== 'vertical-stack') {
			return;
		}

		const dataTable = result.data.children.at(0);
		if (dataTable?.type !== 'data-table') {
			return;
		}

		// Undefined values should be handled gracefully
		expect(dataTable.props.data.at(0)?.cells['$[*].name'].raw).toBeUndefined();
		expect(dataTable.props.data.at(0)?.cells['$[*].name'].display).toBe('');

		expect(dataTable.props.data.at(1)?.cells['$[*].age'].raw).toBeUndefined();
		expect(dataTable.props.data.at(1)?.cells['$[*].age'].display).toBe('');
	});

	it('should handle single row successfully', () => {
		const specSingleRow = SINGLE_DATA_TABLE_SPEC;
		const singleRowData = [{name: 'Alice', age: 30}];

		const result = buildRenderTree(specSingleRow, singleRowData);

		expect(isOk(result)).toBe(true);
		if (!isOk(result)) {
			return;
		}

		expect(result.data.type).toBe('vertical-stack');
		if (result.data.type !== 'vertical-stack') {
			return;
		}

		const dataTable = result.data.children.at(0);
		if (dataTable?.type !== 'data-table') {
			return;
		}

		expect(dataTable.props.data).toHaveLength(1);
		expect(dataTable.props.data.at(0)?.cells['$[*].name'].raw).toBe('Alice');
		expect(dataTable.props.data.at(0)?.cells['$[*].age'].raw).toBe(30);
	});

	it.each([
		{description: 'empty array', data: []},
		{description: 'array with one empty object', data: [{}]},
	])('should handle $description without errors', ({data}) => {
		const result = buildRenderTree(SINGLE_DATA_TABLE_SPEC, data);

		expect(isOk(result)).toBe(true);
		if (!isOk(result)) {
			return;
		}

		expect(result.data.type).toBe('vertical-stack');
		if (result.data.type !== 'vertical-stack') {
			return;
		}

		const dataTable = result.data.children.at(0);
		if (dataTable?.type !== 'data-table') {
			return;
		}

		expect(dataTable.props.data).toHaveLength(data.length);
	});
});
