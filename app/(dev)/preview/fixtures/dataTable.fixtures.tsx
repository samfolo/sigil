/**
 * Data Table Fixtures
 *
 * Test fixtures for developing and iterating on data-table components.
 * Each fixture provides a complete spec + data combination for preview.
 */

import type {ComponentSpec} from '@sigil/src/lib/generated/types/specification';

export interface DataTableFixture {
	id: string;
	name: string;
	description: string;
	spec: ComponentSpec;
	data: unknown[];
}

/**
 * Basic Users Table
 * Simple 4-row example demonstrating all status types
 */
export const basicUsersFixture: DataTableFixture = {
	id: 'basic-users',
	name: 'Basic Users',
	description: 'Simple user table with 4 rows and mixed statuses',
	spec: {
		id: 'example-users-table',
		title: 'User Directory',
		description: 'A simple table displaying user information with sorting and pagination',
		created_at: '2025-10-10T00:00:00Z',
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
								accessor: '$.name',
								label: 'Full Name',
								width: {type: 'flex', value: 2},
							},
							{
								accessor: '$.email',
								label: 'Email Address',
								width: {type: 'flex', value: 2},
							},
							{
								accessor: '$.created_at',
								label: 'Created',
								width: {type: 'fixed', value: 150},
								alignment: 'right',
							},
							{
								accessor: '$.status',
								label: 'Status',
								width: {type: 'fixed', value: 120},
								alignment: 'center',
							},
						],
						affordances: [
							{
								type: 'sorting',
								allowed_fields: [{accessor: '$.name'}, {accessor: '$.email'}, {accessor: '$.created_at'}],
								default_field: {accessor: '$.name'},
								default_direction: 'asc',
							},
							{
								type: 'pagination',
								page_size: 25,
								show_size_options: true,
								size_options: [10, 25, 50, 100],
							},
							{
								type: 'search',
								searchable_fields: [{accessor: '$.name'}, {accessor: '$.email'}],
								min_characters: 2,
								case_sensitive: false,
							},
						],
					},
				},
			},
			accessor_bindings: {
				'users-table': {
					'$.name': {
						roles: ['label', 'sortable', 'searchable'],
						data_types: ['string'],
					},
					'$.email': {
						roles: ['label', 'sortable', 'searchable'],
						data_types: ['string'],
						format: 'email',
					},
					'$.created_at': {
						roles: ['timestamp', 'sortable'],
						data_types: ['date'],
						format: 'iso8601',
					},
					'$.status': {
						roles: ['categorical'],
						data_types: ['string'],
						value_mappings: {
							active: {
								display_value: 'Active',
								display_config: {
									type: 'chip',
									details: {
										color: 'green',
										icon: 'check-circle',
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
							suspended: {
								display_value: 'Suspended',
								display_config: {
									type: 'chip',
									details: {
										color: 'red',
										icon: 'alert-circle',
									},
								},
							},
						},
					},
				},
			},
		},
	},
	data: [
		{
			name: 'Alice Johnson',
			email: 'alice@example.com',
			created_at: '2024-01-15T10:30:00Z',
			status: 'active',
		},
		{
			name: 'Bob Smith',
			email: 'bob@example.com',
			created_at: '2024-02-20T14:45:00Z',
			status: 'active',
		},
		{
			name: 'Charlie Brown',
			email: 'charlie@example.com',
			created_at: '2024-03-10T09:15:00Z',
			status: 'inactive',
		},
		{
			name: 'Diana Prince',
			email: 'diana@example.com',
			created_at: '2024-04-05T16:20:00Z',
			status: 'suspended',
		},
	],
};

/**
 * Empty Dataset
 * Tests empty state rendering with zero rows
 */
export const emptyDatasetFixture: DataTableFixture = {
	id: 'empty-dataset',
	name: 'Empty Dataset',
	description: 'Zero rows to test empty state rendering',
	spec: basicUsersFixture.spec,
	data: [],
};

/**
 * Large Dataset
 * 60 rows to test scrolling and pagination behaviour
 */
export const largeDatasetFixture: DataTableFixture = {
	id: 'large-dataset',
	name: 'Large Dataset',
	description: '60 rows to test scrolling and pagination',
	spec: basicUsersFixture.spec,
	data: Array.from({length: 60}, (_, i) => {
		const statuses = ['active', 'inactive', 'suspended'];
		const firstNames = [
			'Alice',
			'Bob',
			'Charlie',
			'Diana',
			'Eve',
			'Frank',
			'Grace',
			'Henry',
			'Ivy',
			'Jack',
		];
		const lastNames = [
			'Smith',
			'Johnson',
			'Williams',
			'Brown',
			'Jones',
			'Garcia',
			'Miller',
			'Davis',
			'Rodriguez',
			'Martinez',
		];

		const firstName = firstNames[i % firstNames.length];
		const lastName = lastNames[Math.floor(i / firstNames.length) % lastNames.length];
		const name = `${firstName} ${lastName}`;

		return {
			name,
			email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}${i}@example.com`,
			created_at: new Date(2024, 0, 1 + i).toISOString(),
			status: statuses[i % 3],
		};
	}),
};

/**
 * Status Variations
 * Demonstrates all possible status types with equal distribution
 */
export const statusVariationsFixture: DataTableFixture = {
	id: 'status-variations',
	name: 'Status Variations',
	description: 'Equal distribution of all status types',
	spec: basicUsersFixture.spec,
	data: [
		{
			name: 'Emma Wilson',
			email: 'emma.wilson@example.com',
			created_at: '2024-01-10T08:00:00Z',
			status: 'active',
		},
		{
			name: 'Liam Anderson',
			email: 'liam.anderson@example.com',
			created_at: '2024-01-11T09:30:00Z',
			status: 'active',
		},
		{
			name: 'Olivia Thomas',
			email: 'olivia.thomas@example.com',
			created_at: '2024-01-12T11:00:00Z',
			status: 'active',
		},
		{
			name: 'Noah Jackson',
			email: 'noah.jackson@example.com',
			created_at: '2024-01-13T13:15:00Z',
			status: 'inactive',
		},
		{
			name: 'Ava White',
			email: 'ava.white@example.com',
			created_at: '2024-01-14T14:45:00Z',
			status: 'inactive',
		},
		{
			name: 'Elijah Harris',
			email: 'elijah.harris@example.com',
			created_at: '2024-01-15T16:00:00Z',
			status: 'inactive',
		},
		{
			name: 'Sophia Martin',
			email: 'sophia.martin@example.com',
			created_at: '2024-01-16T17:30:00Z',
			status: 'suspended',
		},
		{
			name: 'James Thompson',
			email: 'james.thompson@example.com',
			created_at: '2024-01-17T18:45:00Z',
			status: 'suspended',
		},
		{
			name: 'Isabella Garcia',
			email: 'isabella.garcia@example.com',
			created_at: '2024-01-18T19:00:00Z',
			status: 'suspended',
		},
	],
};

/**
 * All available fixtures
 */
export const dataTableFixtures: DataTableFixture[] = [
	basicUsersFixture,
	emptyDatasetFixture,
	largeDatasetFixture,
	statusVariationsFixture,
];
