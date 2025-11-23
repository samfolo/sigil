/**
 * Test fixtures for buildRenderTree v2
 *
 * Comprehensive fixtures covering:
 * - Single component specs
 * - Multi-component stack layouts
 * - Grid layouts with positioning
 * - Nested layouts at multiple depths
 * - Error cases for testing error accumulation
 */

import type {ComponentSpec} from '@sigil/src/lib/generated/types/specification';

/**
 * Spec with single data-table in vertical stack
 */
export const SINGLE_DATA_TABLE_SPEC: ComponentSpec = {
	id: 'single-table',
	title: 'Single Table',
	created_at: '2025-01-01T00:00:00.000Z',
	data_shape: 'tabular',
	root: {
		layout: {
			id: 'root',
			type: 'stack',
			direction: 'vertical',
			spacing: 'normal',
			children: [
				{type: 'component', component_id: 'users-table'},
			],
		},
		nodes: {
			'users-table': {
				id: 'users-table',
				type: 'data-table',
				config: {
					type: 'data-table',
					title: 'Users',
					description: 'List of users',
					columns: [
						{accessor: '$[*].name', label: 'Name'},
						{accessor: '$[*].age', label: 'Age', alignment: 'right'},
					],
					affordances: [],
				},
			},
		},
		accessor_bindings: {
			'users-table': {
				'$[*].name': {roles: ['label'], data_types: ['string']},
				'$[*].age': {roles: ['value'], data_types: ['number']},
			},
		},
	},
};

export const SINGLE_DATA_TABLE_DATA = [
	{name: 'Alice', age: 30},
	{name: 'Bob', age: 25},
];

/**
 * Horizontal stack with three data-tables
 */
export const HORIZONTAL_STACK_SPEC: ComponentSpec = {
	id: 'horizontal-stack',
	title: 'Horizontal Stack',
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
		},
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

export const HORIZONTAL_STACK_DATA = [
	{name: 'Alice', age: 30, status: 'active'},
];

/**
 * Vertical stack with two data-tables
 */
export const VERTICAL_STACK_SPEC: ComponentSpec = {
	id: 'vertical-stack',
	title: 'Vertical Stack',
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
		},
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

export const VERTICAL_STACK_DATA = [
	{name: 'Bob', email: 'bob@example.com'},
];

/**
 * Empty vertical stack (no children)
 */
export const EMPTY_STACK_SPEC: ComponentSpec = {
	id: 'empty-stack',
	title: 'Empty Stack',
	created_at: '2025-01-01T00:00:00.000Z',
	data_shape: 'tabular',
	root: {
		layout: {
			id: 'root',
			type: 'stack',
			direction: 'vertical',
			spacing: 'normal',
			children: [],
		},
		nodes: {},
		accessor_bindings: {},
	},
};

/**
 * Grid with explicit positioning and spanning
 */
export const GRID_POSITIONED_SPEC: ComponentSpec = {
	id: 'grid-positioned',
	title: 'Grid Positioned',
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
		},
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

export const GRID_POSITIONED_DATA = [
	{a: 'foo', b: 'bar'},
];

/**
 * Grid with auto-flow (no explicit positioning)
 */
export const GRID_AUTO_FLOW_SPEC: ComponentSpec = {
	id: 'grid-auto-flow',
	title: 'Grid Auto-flow',
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
		},
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

export const GRID_AUTO_FLOW_DATA = [
	{x: '1', y: '2', z: '3'},
];

/**
 * Nested stack within stack
 */
export const NESTED_STACK_IN_STACK_SPEC: ComponentSpec = {
	id: 'nested-stack-in-stack',
	title: 'Nested Stack in Stack',
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
		},
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

export const NESTED_STACK_DATA = [
	{name: 'Alice', age: 30},
];

/**
 * Nested grid within stack
 */
export const NESTED_GRID_IN_STACK_SPEC: ComponentSpec = {
	id: 'nested-grid-in-stack',
	title: 'Nested Grid in Stack',
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
		},
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

export const NESTED_GRID_DATA = [
	{a: 'x', b: 'y'},
];

/**
 * Deeply nested layout (3 levels): stack → grid → stack
 */
export const DEEPLY_NESTED_SPEC: ComponentSpec = {
	id: 'deeply-nested',
	title: 'Deeply Nested',
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
		},
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

export const DEEPLY_NESTED_DATA = [
	{value: 'deep'},
];

/**
 * Spec with multiple components having invalid accessors (for error accumulation test)
 */
export const MULTIPLE_ERRORS_SPEC: ComponentSpec = {
	id: 'multiple-errors',
	title: 'Multiple Errors',
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
		},
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

export const MULTIPLE_ERRORS_DATA = [{x: 1}];

/**
 * Spec with one valid component and one invalid component (partial success)
 */
export const PARTIAL_SUCCESS_SPEC: ComponentSpec = {
	id: 'partial-success',
	title: 'Partial Success',
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
		},
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

export const PARTIAL_SUCCESS_DATA = [{name: 'Alice'}];

/**
 * Nested layout with invalid accessor for pathContext testing
 */
export const NESTED_ERROR_SPEC: ComponentSpec = {
	id: 'nested-error',
	title: 'Nested Error',
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
		},
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

export const NESTED_ERROR_DATA = [{x: 1}];
