/**
 * Test fixtures for Stack components
 */

import type {RenderHorizontalStackLayout, RenderVerticalStackLayout} from '@sigil/renderer/core/types/types';

/**
 * Horizontal stack with two DataTable children side-by-side
 */
export const HORIZONTAL_STACK_TWO_TABLES: RenderHorizontalStackLayout = {
	type: 'horizontal-stack',
	spacing: 'normal',
	children: [
		{
			type: 'data-table',
			componentId: 'table-1',
			props: {
				title: 'Users',
				columns: [
					{
						id: '$.name',
						label: 'Name',
						dataType: 'string',
						alignment: 'left',
					},
					{
						id: '$.age',
						label: 'Age',
						dataType: 'number',
						alignment: 'right',
					},
				],
				data: [
					{
						id: 'row-0',
						cells: {
							'$.name': {raw: 'Alice', display: 'Alice'},
							'$.age': {raw: 28, display: '28'},
						},
					},
					{
						id: 'row-1',
						cells: {
							'$.name': {raw: 'Bob', display: 'Bob'},
							'$.age': {raw: 32, display: '32'},
						},
					},
				],
			},
		},
		{
			type: 'data-table',
			componentId: 'table-2',
			props: {
				title: 'Products',
				columns: [
					{
						id: '$.product',
						label: 'Product',
						dataType: 'string',
						alignment: 'left',
					},
					{
						id: '$.price',
						label: 'Price',
						dataType: 'number',
						alignment: 'right',
					},
				],
				data: [
					{
						id: 'row-0',
						cells: {
							'$.product': {raw: 'Widget', display: 'Widget'},
							'$.price': {raw: 19.99, display: '$19.99'},
						},
					},
					{
						id: 'row-1',
						cells: {
							'$.product': {raw: 'Gadget', display: 'Gadget'},
							'$.price': {raw: 29.99, display: '$29.99'},
						},
					},
				],
			},
		},
	],
};

/**
 * Vertical stack with two DataTable children stacked
 */
export const VERTICAL_STACK_TWO_TABLES: RenderVerticalStackLayout = {
	type: 'vertical-stack',
	spacing: 'normal',
	children: [
		{
			type: 'data-table',
			componentId: 'table-1',
			props: {
				title: 'Users',
				columns: [
					{
						id: '$.name',
						label: 'Name',
						dataType: 'string',
						alignment: 'left',
					},
					{
						id: '$.email',
						label: 'Email',
						dataType: 'string',
						alignment: 'left',
					},
				],
				data: [
					{
						id: 'row-0',
						cells: {
							'$.name': {raw: 'Charlie', display: 'Charlie'},
							'$.email': {raw: 'charlie@example.com', display: 'charlie@example.com'},
						},
					},
				],
			},
		},
		{
			type: 'data-table',
			componentId: 'table-2',
			props: {
				title: 'Orders',
				columns: [
					{
						id: '$.order_id',
						label: 'Order ID',
						dataType: 'string',
						alignment: 'left',
					},
					{
						id: '$.total',
						label: 'Total',
						dataType: 'number',
						alignment: 'right',
					},
				],
				data: [
					{
						id: 'row-0',
						cells: {
							'$.order_id': {raw: 'ORD-001', display: 'ORD-001'},
							'$.total': {raw: 149.99, display: '$149.99'},
						},
					},
				],
			},
		},
	],
};

/**
 * Nested layout - vertical stack containing horizontal stack
 */
export const NESTED_HORIZONTAL_IN_VERTICAL: RenderVerticalStackLayout = {
	type: 'vertical-stack',
	spacing: 'relaxed',
	children: [
		{
			type: 'data-table',
			componentId: 'header-table',
			props: {
				title: 'Summary',
				columns: [
					{
						id: '$.metric',
						label: 'Metric',
						dataType: 'string',
						alignment: 'left',
					},
					{
						id: '$.value',
						label: 'Value',
						dataType: 'number',
						alignment: 'right',
					},
				],
				data: [
					{
						id: 'row-0',
						cells: {
							'$.metric': {raw: 'Total Sales', display: 'Total Sales'},
							'$.value': {raw: 1000, display: '1,000'},
						},
					},
				],
			},
		},
		{
			type: 'horizontal-stack',
			spacing: 'normal',
			children: [
				{
					type: 'data-table',
					componentId: 'left-table',
					props: {
						title: 'Region A',
						columns: [
							{
								id: '$.sales',
								label: 'Sales',
								dataType: 'number',
								alignment: 'right',
							},
						],
						data: [
							{
								id: 'row-0',
								cells: {
									'$.sales': {raw: 500, display: '500'},
								},
							},
						],
					},
				},
				{
					type: 'data-table',
					componentId: 'right-table',
					props: {
						title: 'Region B',
						columns: [
							{
								id: '$.sales',
								label: 'Sales',
								dataType: 'number',
								alignment: 'right',
							},
						],
						data: [
							{
								id: 'row-0',
								cells: {
									'$.sales': {raw: 500, display: '500'},
								},
							},
						],
					},
				},
			],
		},
	],
};
