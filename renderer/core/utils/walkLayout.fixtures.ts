/**
 * Test fixtures for walkLayout utility
 *
 * Covers:
 * - Horizontal and vertical stack layouts
 * - Grid layouts with explicit positioning and auto-flow
 * - Nested layouts at various depths
 * - All component types (data-table, hierarchy, composition, text-insight)
 * - Size constraints and spacing configurations
 * - Error cases (missing components, invalid types)
 */

import type {
	ComponentSpec,
	GridLayoutNode,
	HorizontalStackLayoutNode,
	LayoutNode,
	StackLayoutNode,
	VerticalStackLayoutNode,
} from '@sigil/src/lib/generated/types/specification';

/**
 * Creates spec with single data-table component
 */
export const createSingleDataTableSpec = (layout: LayoutNode): ComponentSpec => ({
	id: 'spec-1',
	title: 'Single Table Spec',
	created_at: '2025-01-01T00:00:00.000Z',
	data_shape: 'tabular',
	root: {
		accessor_bindings: {},
		layout,
		nodes: {
			'table-1': {
				id: 'table-1',
				type: 'data-table',
				config: {
					type: 'data-table',
					affordances: [],
					columns: [
						{accessor: '$.name', label: 'Name'},
						{accessor: '$.age', label: 'Age'},
					],
				},
			},
		},
	},
});

/**
 * Creates spec with multiple data-table components
 */
export const createMultipleTablesSpec = (layout: LayoutNode): ComponentSpec => ({
	id: 'spec-2',
	title: 'Multiple Tables Spec',
	created_at: '2025-01-01T00:00:00.000Z',
	data_shape: 'tabular',
	root: {
		accessor_bindings: {},
		layout,
		nodes: {
			'table-1': {
				id: 'table-1',
				type: 'data-table',
				config: {
					type: 'data-table',
					affordances: [],
					columns: [{accessor: '$.name', label: 'Name'}],
				},
			},
			'table-2': {
				id: 'table-2',
				type: 'data-table',
				config: {
					type: 'data-table',
					affordances: [],
					columns: [{accessor: '$.email', label: 'Email'}],
				},
			},
			'table-3': {
				id: 'table-3',
				type: 'data-table',
				config: {
					type: 'data-table',
					affordances: [],
					columns: [{accessor: '$.status', label: 'Status'}],
				},
			},
		},
	},
});

/**
 * Creates spec with hierarchy component
 */
export const createHierarchyComponentSpec = (layout: LayoutNode): ComponentSpec => ({
	id: 'spec-3',
	title: 'Hierarchy Spec',
	created_at: '2025-01-01T00:00:00.000Z',
	data_shape: 'hierarchical',
	root: {
		accessor_bindings: {},
		layout,
		nodes: {
			'hierarchy-1': {
				id: 'hierarchy-1',
				type: 'hierarchy',
				config: {
					type: 'hierarchy',
					affordances: [],
				},
			},
		},
	},
});

/**
 * Creates spec with composition component
 */
export const createCompositionComponentSpec = (layout: LayoutNode): ComponentSpec => ({
	id: 'spec-4',
	title: 'Composition Spec',
	created_at: '2025-01-01T00:00:00.000Z',
	data_shape: 'tabular',
	root: {
		accessor_bindings: {},
		layout,
		nodes: {
			'composition-1': {
				id: 'composition-1',
				type: 'composition',
				config: {
					type: 'composition',
					affordances: [],
				},
			},
		},
	},
});

/**
 * Creates spec with text-insight component
 */
export const createTextInsightComponentSpec = (layout: LayoutNode): ComponentSpec => ({
	id: 'spec-5',
	title: 'Text Insight Spec',
	created_at: '2025-01-01T00:00:00.000Z',
	data_shape: 'key_value',
	root: {
		accessor_bindings: {},
		layout,
		nodes: {
			'insight-1': {
				id: 'insight-1',
				type: 'text-insight',
				config: {
					type: 'text-insight',
					affordances: [],
				},
			},
		},
	},
});

/**
 * Simple horizontal stack with one component
 */
export const HORIZONTAL_STACK_SINGLE_CHILD: HorizontalStackLayoutNode = {
	id: 'stack-1',
	type: 'stack',
	direction: 'horizontal',
	spacing: 'normal',
	children: [
		{
			type: 'component',
			component_id: 'table-1',
		},
	],
};

/**
 * Horizontal stack with multiple components
 */
export const HORIZONTAL_STACK_MULTIPLE_CHILDREN: HorizontalStackLayoutNode = {
	id: 'stack-1',
	type: 'stack',
	direction: 'horizontal',
	spacing: 'relaxed',
	children: [
		{type: 'component', component_id: 'table-1'},
		{type: 'component', component_id: 'table-2'},
		{type: 'component', component_id: 'table-3'},
	],
};

/**
 * Horizontal stack with size constraints
 */
export const HORIZONTAL_STACK_WITH_CONSTRAINTS: HorizontalStackLayoutNode = {
	id: 'stack-1',
	type: 'stack',
	direction: 'horizontal',
	spacing: 'normal',
	width: {type: 'fixed', value: 800},
	height: {type: 'flex', value: 1},
	min_width: {type: 'fixed', value: 600},
	max_width: {type: 'fixed', value: 1200},
	children: [{type: 'component', component_id: 'table-1'}],
};

/**
 * Horizontal stack with alignment and padding
 */
export const HORIZONTAL_STACK_WITH_STYLING: HorizontalStackLayoutNode = {
	id: 'stack-1',
	type: 'stack',
	direction: 'horizontal',
	spacing: 'normal',
	vertical_alignment: 'center',
	padding: {top: 16, right: 24, bottom: 16, left: 24},
	children: [{type: 'component', component_id: 'table-1'}],
};

/**
 * Empty horizontal stack
 */
export const HORIZONTAL_STACK_EMPTY: HorizontalStackLayoutNode = {
	id: 'stack-1',
	type: 'stack',
	direction: 'horizontal',
	spacing: 'normal',
	children: [],
};

/**
 * Vertical stack with one component
 */
export const VERTICAL_STACK_SINGLE_CHILD: VerticalStackLayoutNode = {
	id: 'stack-1',
	type: 'stack',
	direction: 'vertical',
	spacing: 'tight',
	children: [{type: 'component', component_id: 'table-1'}],
};

/**
 * Vertical stack with horizontal alignment
 */
export const VERTICAL_STACK_WITH_ALIGNMENT: VerticalStackLayoutNode = {
	id: 'stack-1',
	type: 'stack',
	direction: 'vertical',
	spacing: 'normal',
	horizontal_alignment: 'end',
	children: [{type: 'component', component_id: 'table-1'}],
};

/**
 * Simple grid with one component
 */
export const GRID_SINGLE_CHILD: GridLayoutNode = {
	id: 'grid-1',
	type: 'grid',
	columns: 2,
	children: [
		{
			element: {type: 'component', component_id: 'table-1'},
		},
	],
};

/**
 * Grid with explicit positioning
 */
export const GRID_EXPLICIT_POSITIONING: GridLayoutNode = {
	id: 'grid-1',
	type: 'grid',
	columns: 3,
	rows: 2,
	children: [
		{
			element: {type: 'component', component_id: 'table-1'},
			column_start: 1,
			row_start: 1,
			column_span: 2,
			row_span: 1,
		},
		{
			element: {type: 'component', component_id: 'table-2'},
			column_start: 3,
			row_start: 2,
		},
	],
};

/**
 * Grid with auto-flow (no explicit positioning)
 */
export const GRID_AUTO_FLOW: GridLayoutNode = {
	id: 'grid-1',
	type: 'grid',
	columns: 2,
	children: [
		{element: {type: 'component', component_id: 'table-1'}},
		{element: {type: 'component', component_id: 'table-2'}},
	],
};

/**
 * Grid with gaps and padding
 */
export const GRID_WITH_GAPS: GridLayoutNode = {
	id: 'grid-1',
	type: 'grid',
	columns: 3,
	column_gap: 'relaxed',
	row_gap: 'tight',
	padding: 16,
	children: [{element: {type: 'component', component_id: 'table-1'}}],
};

/**
 * Nested layout - stack containing stack
 */
export const NESTED_STACK_IN_STACK: VerticalStackLayoutNode = {
	id: 'outer-stack',
	type: 'stack',
	direction: 'vertical',
	spacing: 'normal',
	children: [
		{
			type: 'layout',
			node: {
				id: 'inner-stack',
				type: 'stack',
				direction: 'horizontal',
				spacing: 'tight',
				children: [{type: 'component', component_id: 'table-1'}],
			},
		},
		{type: 'component', component_id: 'table-2'},
	],
};

/**
 * Nested layout - grid containing stack
 */
export const NESTED_STACK_IN_GRID: GridLayoutNode = {
	id: 'grid-1',
	type: 'grid',
	columns: 2,
	children: [
		{
			element: {
				type: 'layout',
				node: {
					id: 'stack-1',
					type: 'stack',
					direction: 'vertical',
					spacing: 'normal',
					children: [{type: 'component', component_id: 'table-1'}],
				},
			},
			column_start: 1,
		},
		{
			element: {type: 'component', component_id: 'table-2'},
			column_start: 2,
		},
	],
};

/**
 * Deeply nested layout (3 levels)
 */
export const DEEPLY_NESTED_LAYOUT: VerticalStackLayoutNode = {
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
};

/**
 * Layout with missing component reference
 */
export const LAYOUT_MISSING_COMPONENT: StackLayoutNode = {
	id: 'stack-1',
	type: 'stack',
	direction: 'horizontal',
	spacing: 'normal',
	children: [{type: 'component', component_id: 'missing-table'}],
};

/**
 * Layout with typo in component ID (for Levenshtein test)
 */
export const LAYOUT_TYPO_COMPONENT: StackLayoutNode = {
	id: 'stack-1',
	type: 'stack',
	direction: 'horizontal',
	spacing: 'normal',
	children: [{type: 'component', component_id: 'tabel-1'}],
};

/**
 * Layout with multiple missing components
 */
export const LAYOUT_MULTIPLE_MISSING: StackLayoutNode = {
	id: 'stack-1',
	type: 'stack',
	direction: 'horizontal',
	spacing: 'normal',
	children: [
		{type: 'component', component_id: 'missing-1'},
		{type: 'component', component_id: 'table-1'},
		{type: 'component', component_id: 'missing-2'},
	],
};

/**
 * Nested layout with missing components at multiple levels
 */
export const NESTED_LAYOUT_WITH_ERRORS: StackLayoutNode = {
	id: 'outer-stack',
	type: 'stack',
	direction: 'vertical',
	spacing: 'normal',
	children: [
		{
			type: 'layout',
			node: {
				id: 'inner-stack',
				type: 'stack',
				direction: 'horizontal',
				spacing: 'tight',
				children: [{type: 'component', component_id: 'missing-inner'}],
			},
		},
		{type: 'component', component_id: 'missing-outer'},
	],
};
