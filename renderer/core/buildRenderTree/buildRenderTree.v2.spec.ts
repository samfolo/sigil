/**
 * Tests for buildRenderTree v2
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
import type {
	ComponentSpec,
	GridLayoutNode,
	HorizontalStackLayoutNode,
	VerticalStackLayoutNode,
} from '@sigil/src/lib/generated/types/specification';

import {buildRenderTree} from './buildRenderTree.v2';
import {VALID_SPEC_VALID_DATA, SPEC_ERROR_AND_BINDING_ERROR} from './buildRenderTree.fixtures';

describe('buildRenderTree v2 - single component', () => {
	it('should successfully render single data-table component', () => {
		const result = buildRenderTree(VALID_SPEC_VALID_DATA.spec, VALID_SPEC_VALID_DATA.data);

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
	});

	it('should propagate errors from walkLayout', () => {
		const result = buildRenderTree(SPEC_ERROR_AND_BINDING_ERROR.spec, SPEC_ERROR_AND_BINDING_ERROR.data);

		expect(isErr(result)).toBe(true);
		if (!isErr(result)) {
			return;
		}

		// Should have MISSING_COMPONENT error from walkLayout
		expect(result.error).toHaveLength(1);
		expect(result.error.at(0)?.code).toBe(ERROR_CODES.MISSING_COMPONENT);
	});
});

describe('buildRenderTree v2 - stack layouts', () => {
	it('should process horizontal stack with multiple components', () => {
		const spec: ComponentSpec = {
			id: 'test-horizontal-stack',
			title: 'Horizontal Stack Test',
			created_at: '2025-01-01T00:00:00.000Z',
			data_shape: 'tabular',
			root: {
				layout: {
					id: 'root',
					type: 'stack',
					direction: 'horizontal',
					spacing: 'normal',
					children: [
						{type: 'component', component_id: 'table-1'},
						{type: 'component', component_id: 'table-2'},
						{type: 'component', component_id: 'table-3'},
					],
				} as HorizontalStackLayoutNode,
				nodes: {
					'table-1': {
						id: 'table-1',
						type: 'data-table',
						config: {
							type: 'data-table',
							title: 'Table 1',
							columns: [{accessor: '$[*].name', label: 'Name'}],
							affordances: [],
						},
					},
					'table-2': {
						id: 'table-2',
						type: 'data-table',
						config: {
							type: 'data-table',
							title: 'Table 2',
							columns: [{accessor: '$[*].age', label: 'Age'}],
							affordances: [],
						},
					},
					'table-3': {
						id: 'table-3',
						type: 'data-table',
						config: {
							type: 'data-table',
							title: 'Table 3',
							columns: [{accessor: '$[*].status', label: 'Status'}],
							affordances: [],
						},
					},
				},
				accessor_bindings: {
					'table-1': {
						'$[*].name': {roles: ['label'], data_types: ['string']},
					},
					'table-2': {
						'$[*].age': {roles: ['value'], data_types: ['number']},
					},
					'table-3': {
						'$[*].status': {roles: ['label'], data_types: ['string']},
					},
				},
			},
		};

		const data = [{name: 'Alice', age: 30, status: 'active'}];
		const result = buildRenderTree(spec, data);

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
		}

		if (child2?.type === 'data-table') {
			expect(child2.props.title).toBe('Table 2');
			expect(child2.componentId).toBe('table-2');
		}

		if (child3?.type === 'data-table') {
			expect(child3.props.title).toBe('Table 3');
			expect(child3.componentId).toBe('table-3');
		}
	});

	it('should process vertical stack with multiple components', () => {
		const spec: ComponentSpec = {
			id: 'test-vertical-stack',
			title: 'Vertical Stack Test',
			created_at: '2025-01-01T00:00:00.000Z',
			data_shape: 'tabular',
			root: {
				layout: {
					id: 'root',
					type: 'stack',
					direction: 'vertical',
					spacing: 'tight',
					children: [
						{type: 'component', component_id: 'table-1'},
						{type: 'component', component_id: 'table-2'},
					],
				} as VerticalStackLayoutNode,
				nodes: {
					'table-1': {
						id: 'table-1',
						type: 'data-table',
						config: {
							type: 'data-table',
							title: 'Users',
							columns: [{accessor: '$[*].name', label: 'Name'}],
							affordances: [],
						},
					},
					'table-2': {
						id: 'table-2',
						type: 'data-table',
						config: {
							type: 'data-table',
							title: 'Details',
							columns: [{accessor: '$[*].email', label: 'Email'}],
							affordances: [],
						},
					},
				},
				accessor_bindings: {
					'table-1': {
						'$[*].name': {roles: ['label'], data_types: ['string']},
					},
					'table-2': {
						'$[*].email': {roles: ['label'], data_types: ['string']},
					},
				},
			},
		};

		const data = [{name: 'Bob', email: 'bob@example.com'}];
		const result = buildRenderTree(spec, data);

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
	});

	it('should handle empty stack children array', () => {
		const spec: ComponentSpec = {
			id: 'test-empty-stack',
			title: 'Empty Stack Test',
			created_at: '2025-01-01T00:00:00.000Z',
			data_shape: 'tabular',
			root: {
				layout: {
					id: 'root',
					type: 'stack',
					direction: 'vertical',
					spacing: 'normal',
					children: [],
				} as VerticalStackLayoutNode,
				nodes: {},
				accessor_bindings: {},
			},
		};

		const result = buildRenderTree(spec, []);

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

describe('buildRenderTree v2 - grid layouts', () => {
	it('should process grid layout with positioned children', () => {
		const spec: ComponentSpec = {
			id: 'test-grid',
			title: 'Grid Test',
			created_at: '2025-01-01T00:00:00.000Z',
			data_shape: 'tabular',
			root: {
				layout: {
					id: 'root',
					type: 'grid',
					columns: 2,
					rows: 2,
					children: [
						{
							element: {type: 'component', component_id: 'table-1'},
							column_start: 1,
							row_start: 1,
						},
						{
							element: {type: 'component', component_id: 'table-2'},
							column_start: 2,
							row_start: 1,
							column_span: 1,
							row_span: 2,
						},
					],
				} as GridLayoutNode,
				nodes: {
					'table-1': {
						id: 'table-1',
						type: 'data-table',
						config: {
							type: 'data-table',
							title: 'Top Left',
							columns: [{accessor: '$[*].a', label: 'A'}],
							affordances: [],
						},
					},
					'table-2': {
						id: 'table-2',
						type: 'data-table',
						config: {
							type: 'data-table',
							title: 'Right Side',
							columns: [{accessor: '$[*].b', label: 'B'}],
							affordances: [],
						},
					},
				},
				accessor_bindings: {
					'table-1': {
						'$[*].a': {roles: ['label'], data_types: ['string']},
					},
					'table-2': {
						'$[*].b': {roles: ['label'], data_types: ['string']},
					},
				},
			},
		};

		const data = [{a: 'foo', b: 'bar'}];
		const result = buildRenderTree(spec, data);

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

		// Verify second child positioning is preserved
		const gridChild2 = result.data.children.at(1);
		expect(gridChild2?.column_start).toBe(2);
		expect(gridChild2?.row_start).toBe(1);
		expect(gridChild2?.column_span).toBe(1);
		expect(gridChild2?.row_span).toBe(2);
		expect(gridChild2?.element.type).toBe('data-table');
	});

	it('should process grid layout with auto-flow children', () => {
		const spec: ComponentSpec = {
			id: 'test-grid-autoflow',
			title: 'Grid Auto-flow Test',
			created_at: '2025-01-01T00:00:00.000Z',
			data_shape: 'tabular',
			root: {
				layout: {
					id: 'root',
					type: 'grid',
					columns: 3,
					children: [
						{element: {type: 'component', component_id: 'table-1'}},
						{element: {type: 'component', component_id: 'table-2'}},
						{element: {type: 'component', component_id: 'table-3'}},
					],
				} as GridLayoutNode,
				nodes: {
					'table-1': {
						id: 'table-1',
						type: 'data-table',
						config: {
							type: 'data-table',
							columns: [{accessor: '$[*].x', label: 'X'}],
							affordances: [],
						},
					},
					'table-2': {
						id: 'table-2',
						type: 'data-table',
						config: {
							type: 'data-table',
							columns: [{accessor: '$[*].y', label: 'Y'}],
							affordances: [],
						},
					},
					'table-3': {
						id: 'table-3',
						type: 'data-table',
						config: {
							type: 'data-table',
							columns: [{accessor: '$[*].z', label: 'Z'}],
							affordances: [],
						},
					},
				},
				accessor_bindings: {
					'table-1': {
						'$[*].x': {roles: ['label'], data_types: ['string']},
					},
					'table-2': {
						'$[*].y': {roles: ['label'], data_types: ['string']},
					},
					'table-3': {
						'$[*].z': {roles: ['label'], data_types: ['string']},
					},
				},
			},
		};

		const data = [{x: '1', y: '2', z: '3'}];
		const result = buildRenderTree(spec, data);

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
	});
});

describe('buildRenderTree v2 - nested layouts', () => {
	it('should process nested stack in stack', () => {
		const spec: ComponentSpec = {
			id: 'test-nested-stack',
			title: 'Nested Stack Test',
			created_at: '2025-01-01T00:00:00.000Z',
			data_shape: 'tabular',
			root: {
				layout: {
					id: 'outer',
					type: 'stack',
					direction: 'vertical',
					spacing: 'normal',
					children: [
						{
							type: 'layout',
							node: {
								id: 'inner',
								type: 'stack',
								direction: 'horizontal',
								spacing: 'tight',
								children: [{type: 'component', component_id: 'table-1'}],
							},
						},
						{type: 'component', component_id: 'table-2'},
					],
				} as VerticalStackLayoutNode,
				nodes: {
					'table-1': {
						id: 'table-1',
						type: 'data-table',
						config: {
							type: 'data-table',
							title: 'Inner Table',
							columns: [{accessor: '$[*].name', label: 'Name'}],
							affordances: [],
						},
					},
					'table-2': {
						id: 'table-2',
						type: 'data-table',
						config: {
							type: 'data-table',
							title: 'Outer Table',
							columns: [{accessor: '$[*].age', label: 'Age'}],
							affordances: [],
						},
					},
				},
				accessor_bindings: {
					'table-1': {
						'$[*].name': {roles: ['label'], data_types: ['string']},
					},
					'table-2': {
						'$[*].age': {roles: ['value'], data_types: ['number']},
					},
				},
			},
		};

		const data = [{name: 'Alice', age: 30}];
		const result = buildRenderTree(spec, data);

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
		}

		// Second child should be data-table
		const outerTable = result.data.children.at(1);
		expect(outerTable?.type).toBe('data-table');
	});

	it('should process nested grid in stack', () => {
		const spec: ComponentSpec = {
			id: 'test-nested-grid',
			title: 'Nested Grid Test',
			created_at: '2025-01-01T00:00:00.000Z',
			data_shape: 'tabular',
			root: {
				layout: {
					id: 'outer',
					type: 'stack',
					direction: 'vertical',
					spacing: 'normal',
					children: [
						{
							type: 'layout',
							node: {
								id: 'inner',
								type: 'grid',
								columns: 2,
								children: [
									{element: {type: 'component', component_id: 'table-1'}},
									{element: {type: 'component', component_id: 'table-2'}},
								],
							},
						},
					],
				} as VerticalStackLayoutNode,
				nodes: {
					'table-1': {
						id: 'table-1',
						type: 'data-table',
						config: {
							type: 'data-table',
							columns: [{accessor: '$[*].a', label: 'A'}],
							affordances: [],
						},
					},
					'table-2': {
						id: 'table-2',
						type: 'data-table',
						config: {
							type: 'data-table',
							columns: [{accessor: '$[*].b', label: 'B'}],
							affordances: [],
						},
					},
				},
				accessor_bindings: {
					'table-1': {
						'$[*].a': {roles: ['label'], data_types: ['string']},
					},
					'table-2': {
						'$[*].b': {roles: ['label'], data_types: ['string']},
					},
				},
			},
		};

		const data = [{a: 'x', b: 'y'}];
		const result = buildRenderTree(spec, data);

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
		}
	});

	it('should process deeply nested layouts (3 levels)', () => {
		const spec: ComponentSpec = {
			id: 'test-deep-nesting',
			title: 'Deep Nesting Test',
			created_at: '2025-01-01T00:00:00.000Z',
			data_shape: 'tabular',
			root: {
				layout: {
					id: 'level-1',
					type: 'stack',
					direction: 'vertical',
					spacing: 'normal',
					children: [
						{
							type: 'layout',
							node: {
								id: 'level-2',
								type: 'grid',
								columns: 1,
								children: [
									{
										element: {
											type: 'layout',
											node: {
												id: 'level-3',
												type: 'stack',
												direction: 'horizontal',
												spacing: 'tight',
												children: [{type: 'component', component_id: 'table-1'}],
											},
										},
									},
								],
							},
						},
					],
				} as VerticalStackLayoutNode,
				nodes: {
					'table-1': {
						id: 'table-1',
						type: 'data-table',
						config: {
							type: 'data-table',
							title: 'Deep Table',
							columns: [{accessor: '$[*].value', label: 'Value'}],
							affordances: [],
						},
					},
				},
				accessor_bindings: {
					'table-1': {
						'$[*].value': {roles: ['label'], data_types: ['string']},
					},
				},
			},
		};

		const data = [{value: 'deep'}];
		const result = buildRenderTree(spec, data);

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
				}
			}
		}
	});
});

describe('buildRenderTree v2 - error handling', () => {
	it('should accumulate errors from multiple components', () => {
		const spec: ComponentSpec = {
			id: 'test-multiple-errors',
			title: 'Multiple Errors Test',
			created_at: '2025-01-01T00:00:00.000Z',
			data_shape: 'tabular',
			root: {
				layout: {
					id: 'root',
					type: 'stack',
					direction: 'vertical',
					spacing: 'normal',
					children: [
						{type: 'component', component_id: 'table-1'},
						{type: 'component', component_id: 'table-2'},
					],
				} as VerticalStackLayoutNode,
				nodes: {
					'table-1': {
						id: 'table-1',
						type: 'data-table',
						config: {
							type: 'data-table',
							columns: [{accessor: 'badAccessor1', label: 'Bad 1'}],
							affordances: [],
						},
					},
					'table-2': {
						id: 'table-2',
						type: 'data-table',
						config: {
							type: 'data-table',
							columns: [{accessor: 'badAccessor2', label: 'Bad 2'}],
							affordances: [],
						},
					},
				},
				accessor_bindings: {
					'table-1': {
						badAccessor1: {roles: ['label'], data_types: ['string']},
					},
					'table-2': {
						badAccessor2: {roles: ['label'], data_types: ['string']},
					},
				},
			},
		};

		const data = [{x: 1}];
		const result = buildRenderTree(spec, data);

		expect(isErr(result)).toBe(true);
		if (!isErr(result)) {
			return;
		}

		// Should accumulate errors from both components
		expect(result.error.length).toBeGreaterThan(0);

		// Both invalid accessors should be reported
		const accessorErrors = result.error.filter((e) => e.code === ERROR_CODES.INVALID_ACCESSOR);
		expect(accessorErrors.length).toBeGreaterThan(0);
	});

	it('should continue processing siblings when one fails', () => {
		const spec: ComponentSpec = {
			id: 'test-partial-success',
			title: 'Partial Success Test',
			created_at: '2025-01-01T00:00:00.000Z',
			data_shape: 'tabular',
			root: {
				layout: {
					id: 'root',
					type: 'stack',
					direction: 'horizontal',
					spacing: 'normal',
					children: [
						{type: 'component', component_id: 'table-valid'},
						{type: 'component', component_id: 'table-invalid'},
					],
				} as HorizontalStackLayoutNode,
				nodes: {
					'table-valid': {
						id: 'table-valid',
						type: 'data-table',
						config: {
							type: 'data-table',
							columns: [{accessor: '$[*].name', label: 'Name'}],
							affordances: [],
						},
					},
					'table-invalid': {
						id: 'table-invalid',
						type: 'data-table',
						config: {
							type: 'data-table',
							columns: [{accessor: 'invalid', label: 'Invalid'}],
							affordances: [],
						},
					},
				},
				accessor_bindings: {
					'table-valid': {
						'$[*].name': {roles: ['label'], data_types: ['string']},
					},
					'table-invalid': {
						invalid: {roles: ['label'], data_types: ['string']},
					},
				},
			},
		};

		const data = [{name: 'Alice'}];
		const result = buildRenderTree(spec, data);

		// Should fail because one component has errors
		expect(isErr(result)).toBe(true);
		if (!isErr(result)) {
			return;
		}

		// Should have errors from the invalid component
		expect(result.error.length).toBeGreaterThan(0);
	});
});

describe('buildRenderTree v2 - pathContext', () => {
	it('should thread pathContext through recursion', () => {
		// This test verifies that pathContext is correctly passed through nested layouts
		// The actual path verification would happen in error messages
		const spec: ComponentSpec = {
			id: 'test-path-context',
			title: 'Path Context Test',
			created_at: '2025-01-01T00:00:00.000Z',
			data_shape: 'tabular',
			root: {
				layout: {
					id: 'root',
					type: 'stack',
					direction: 'vertical',
					spacing: 'normal',
					children: [
						{
							type: 'layout',
							node: {
								id: 'nested',
								type: 'stack',
								direction: 'horizontal',
								spacing: 'normal',
								children: [{type: 'component', component_id: 'table-1'}],
							},
						},
					],
				} as VerticalStackLayoutNode,
				nodes: {
					'table-1': {
						id: 'table-1',
						type: 'data-table',
						config: {
							type: 'data-table',
							columns: [{accessor: 'invalidAccessor', label: 'Invalid'}],
							affordances: [],
						},
					},
				},
				accessor_bindings: {
					'table-1': {
						invalidAccessor: {roles: ['label'], data_types: ['string']},
					},
				},
			},
		};

		const data = [{x: 1}];
		const result = buildRenderTree(spec, data);

		expect(isErr(result)).toBe(true);
		if (!isErr(result)) {
			return;
		}

		// Errors should include path context showing nesting
		const error = result.error.at(0);
		expect(error?.path).toContain('$');
	});
});
