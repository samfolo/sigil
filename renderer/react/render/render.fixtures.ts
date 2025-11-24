/**
 * Test fixtures for render function
 *
 * These fixtures provide complete ComponentSpec + data pairs for testing
 * the full rendering pipeline from IR to React elements.
 */

import type {ComponentConfig, ComponentSpec} from '@sigil/src/lib/generated/types/specification';

/**
 * Simple valid spec with basic user table
 * Matches the structure from spec/examples/simple-table.json
 */
export const SIMPLE_USER_SPEC: ComponentSpec = {
	id: 'test-user-table',
	title: 'User Directory',
	description: 'A simple table displaying user information',
	created_at: '2025-10-11T00:00:00Z',
	data_shape: 'tabular',
	root: {
		layout: {
			type: 'stack',
			direction: 'vertical',
			id: 'root-layout',
			spacing: 'normal',
			children: [
				{
					type: 'component',
					component_id: 'users-table',
				},
			],
		},
		nodes: {
			'users-table': {
				id: 'users-table',
				type: 'data-table',
				config: {
					type: 'data-table',
					title: 'Users',
					description: 'List of all users in the system',
					columns: [
						{
							accessor: '$[*].name',
							label: 'Full Name',
						},
						{
							accessor: '$[*].email',
							label: 'Email Address',
						},
						{
							accessor: '$[*].status',
							label: 'Status',
							alignment: 'center',
						},
					],
					affordances: [],
				},
			},
		},
		accessor_bindings: {
			'users-table': {
				'$[*].name': {
					roles: ['label'],
					data_types: ['string'],
				},
				'$[*].email': {
					roles: ['label'],
					data_types: ['string'],
				},
				'$[*].status': {
					roles: ['categorical'],
					data_types: ['string'],
					value_mappings: {
						active: {
							display_value: 'Active',
							display_config: {
								type: 'chip',
								details: {
									color: 'green',
								},
							},
						},
						inactive: {
							display_value: 'Inactive',
							display_config: {
								type: 'chip',
								details: {
									color: 'grey',
								},
							},
						},
					},
				},
			},
		},
	},
};

/**
 * Sample data for SIMPLE_USER_SPEC
 */
export const SIMPLE_USER_DATA = [
	{
		name: 'Alice Johnson',
		email: 'alice@example.com',
		status: 'active',
	},
	{
		name: 'Bob Smith',
		email: 'bob@example.com',
		status: 'inactive',
	},
];

/**
 * Valid spec with empty data array
 */
export const EMPTY_DATA: unknown[] = [];

/**
 * Spec with invalid component_id reference
 * References 'missing-component' which doesn't exist in nodes
 */
export const INVALID_COMPONENT_ID_SPEC: ComponentSpec = {
	id: 'invalid-component-id',
	title: 'Invalid Spec',
	created_at: '2025-10-11T00:00:00Z',
	data_shape: 'tabular',
	root: {
		layout: {
			type: 'stack',
			direction: 'vertical',
			id: 'root-layout',
			spacing: 'normal',
			children: [
				{
					type: 'component',
					component_id: 'missing-component', // This doesn't exist
				},
			],
		},
		nodes: {
			'actual-component': {
				id: 'actual-component',
				type: 'data-table',
				config: {
					type: 'data-table',
					columns: [],
					affordances: [],
				},
			},
		},
		accessor_bindings: {},
	},
};

/**
 * Spec with type mismatch between node and config
 */
export const TYPE_MISMATCH_SPEC: ComponentSpec = {
	id: 'type-mismatch',
	title: 'Type Mismatch',
	created_at: '2025-10-11T00:00:00Z',
	data_shape: 'tabular',
	root: {
		layout: {
			type: 'stack',
			direction: 'vertical',
			id: 'root-layout',
			spacing: 'normal',
			children: [
				{
					type: 'component',
					component_id: 'mismatched-table',
				},
			],
		},
		nodes: {
			'mismatched-table': {
				id: 'mismatched-table',
				type: 'data-table',
				config: {
					// Config says hierarchy but node says data-table
					type: 'hierarchy',
					affordances: [],
				} as unknown as ComponentConfig, // Type cast to bypass TypeScript checks for test
			},
		},
		accessor_bindings: {},
	},
};

/**
 * Spec with nested data accessor (tests JSONPath support)
 */
export const NESTED_ACCESSOR_SPEC: ComponentSpec = {
	id: 'nested-accessor',
	title: 'Nested Data',
	created_at: '2025-10-11T00:00:00Z',
	data_shape: 'tabular',
	root: {
		layout: {
			type: 'stack',
			direction: 'vertical',
			id: 'root-layout',
			spacing: 'normal',
			children: [
				{
					type: 'component',
					component_id: 'nested-table',
				},
			],
		},
		nodes: {
			'nested-table': {
				id: 'nested-table',
				type: 'data-table',
				config: {
					type: 'data-table',
					columns: [
						{
							accessor: '$[*].user.name',
							label: 'Name',
						},
						{
							accessor: '$[*].user.profile.email',
							label: 'Email',
						},
					],
					affordances: [],
				},
			},
		},
		accessor_bindings: {
			'nested-table': {
				'$[*].user.name': {
					roles: ['label'],
					data_types: ['string'],
				},
				'$.user.profile.email': {
					roles: ['label'],
					data_types: ['string'],
				},
			},
		},
	},
};

/**
 * Sample data for NESTED_ACCESSOR_SPEC
 */
export const NESTED_ACCESSOR_DATA = [
	{
		user: {
			name: 'Alice',
			profile: {
				email: 'alice@example.com',
			},
		},
	},
	{
		user: {
			name: 'Bob',
			profile: {
				email: 'bob@example.com',
			},
		},
	},
];

/**
 * Spec with horizontal stack layout containing two tables
 */
export const HORIZONTAL_STACK_SPEC: ComponentSpec = {
	id: 'horizontal-stack',
	title: 'Horizontal Layout',
	created_at: '2025-10-11T00:00:00Z',
	data_shape: 'tabular',
	root: {
		layout: {
			type: 'stack',
			direction: 'horizontal',
			id: 'root-layout',
			spacing: 'normal',
			children: [
				{
					type: 'component',
					component_id: 'left-table',
				},
				{
					type: 'component',
					component_id: 'right-table',
				},
			],
		},
		nodes: {
			'left-table': {
				id: 'left-table',
				type: 'data-table',
				config: {
					type: 'data-table',
					title: 'Users',
					columns: [
						{
							accessor: '$[*].name',
							label: 'Name',
						},
					],
					affordances: [],
				},
			},
			'right-table': {
				id: 'right-table',
				type: 'data-table',
				config: {
					type: 'data-table',
					title: 'Products',
					columns: [
						{
							accessor: '$[*].product',
							label: 'Product',
						},
					],
					affordances: [],
				},
			},
		},
		accessor_bindings: {
			'left-table': {
				'$[*].name': {
					roles: ['label'],
					data_types: ['string'],
				},
			},
			'right-table': {
				'$[*].product': {
					roles: ['label'],
					data_types: ['string'],
				},
			},
		},
	},
};

/**
 * Sample data for HORIZONTAL_STACK_SPEC
 */
export const HORIZONTAL_STACK_DATA = [
	{name: 'Alice', product: 'Widget'},
	{name: 'Bob', product: 'Gadget'},
];

/**
 * Spec with vertical stack layout containing two tables
 */
export const VERTICAL_STACK_SPEC: ComponentSpec = {
	id: 'vertical-stack',
	title: 'Vertical Layout',
	created_at: '2025-10-11T00:00:00Z',
	data_shape: 'tabular',
	root: {
		layout: {
			type: 'stack',
			direction: 'vertical',
			id: 'root-layout',
			spacing: 'relaxed',
			children: [
				{
					type: 'component',
					component_id: 'top-table',
				},
				{
					type: 'component',
					component_id: 'bottom-table',
				},
			],
		},
		nodes: {
			'top-table': {
				id: 'top-table',
				type: 'data-table',
				config: {
					type: 'data-table',
					title: 'Sales',
					columns: [
						{
							accessor: '$[*].region',
							label: 'Region',
						},
					],
					affordances: [],
				},
			},
			'bottom-table': {
				id: 'bottom-table',
				type: 'data-table',
				config: {
					type: 'data-table',
					title: 'Orders',
					columns: [
						{
							accessor: '$[*].order_id',
							label: 'Order ID',
						},
					],
					affordances: [],
				},
			},
		},
		accessor_bindings: {
			'top-table': {
				'$[*].region': {
					roles: ['label'],
					data_types: ['string'],
				},
			},
			'bottom-table': {
				'$[*].order_id': {
					roles: ['label'],
					data_types: ['string'],
				},
			},
		},
	},
};

/**
 * Sample data for VERTICAL_STACK_SPEC
 */
export const VERTICAL_STACK_DATA = [
	{region: 'North', order_id: 'ORD-001'},
	{region: 'South', order_id: 'ORD-002'},
];

/**
 * Spec with nested stack layout (vertical containing horizontal)
 */
export const NESTED_STACK_SPEC: ComponentSpec = {
	id: 'nested-stack',
	title: 'Nested Layout',
	created_at: '2025-10-11T00:00:00Z',
	data_shape: 'tabular',
	root: {
		layout: {
			type: 'stack',
			direction: 'vertical',
			id: 'root-layout',
			spacing: 'relaxed',
			children: [
				{
					type: 'component',
					component_id: 'header-table',
				},
				{
					type: 'layout',
					node: {
						type: 'stack',
						direction: 'horizontal',
						id: 'nested-layout',
						spacing: 'normal',
						children: [
							{
								type: 'component',
								component_id: 'left-nested',
							},
							{
								type: 'component',
								component_id: 'right-nested',
							},
						],
					},
				},
			],
		},
		nodes: {
			'header-table': {
				id: 'header-table',
				type: 'data-table',
				config: {
					type: 'data-table',
					title: 'Summary',
					columns: [
						{
							accessor: '$[*].total',
							label: 'Total',
						},
					],
					affordances: [],
				},
			},
			'left-nested': {
				id: 'left-nested',
				type: 'data-table',
				config: {
					type: 'data-table',
					title: 'Region A',
					columns: [
						{
							accessor: '$[*].sales_a',
							label: 'Sales',
						},
					],
					affordances: [],
				},
			},
			'right-nested': {
				id: 'right-nested',
				type: 'data-table',
				config: {
					type: 'data-table',
					title: 'Region B',
					columns: [
						{
							accessor: '$[*].sales_b',
							label: 'Sales',
						},
					],
					affordances: [],
				},
			},
		},
		accessor_bindings: {
			'header-table': {
				'$[*].total': {
					roles: ['label'],
					data_types: ['number'],
				},
			},
			'left-nested': {
				'$[*].sales_a': {
					roles: ['label'],
					data_types: ['number'],
				},
			},
			'right-nested': {
				'$[*].sales_b': {
					roles: ['label'],
					data_types: ['number'],
				},
			},
		},
	},
};

/**
 * Sample data for NESTED_STACK_SPEC
 */
export const NESTED_STACK_DATA = [
	{total: 1000, sales_a: 500, sales_b: 500},
];
