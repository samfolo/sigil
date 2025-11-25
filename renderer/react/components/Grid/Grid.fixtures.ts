/**
 * Test fixtures for Grid component
 */

import type {RenderGridLayout} from '@sigil/renderer/core/types/types';

/**
 * 2x2 grid with four DataTable children (explicit rows)
 */
export const GRID_2X2_FOUR_TABLES: RenderGridLayout = {
	type: 'grid',
	columns: 2,
	rows: 2,
	children: [
		{
			element: {
				type: 'data-table',
				componentId: 'table-1',
				props: {
					title: 'Users',
					columns: [
						{id: '$.name', label: 'Name', dataType: 'string', alignment: 'left'},
						{id: '$.age', label: 'Age', dataType: 'number', alignment: 'right'},
					],
					data: [
						{id: 'row-0', cells: {'$.name': {raw: 'Alice', display: 'Alice'}, '$.age': {raw: 28, display: '28'}}},
					],
				},
			},
		},
		{
			element: {
				type: 'data-table',
				componentId: 'table-2',
				props: {
					title: 'Products',
					columns: [
						{id: '$.product', label: 'Product', dataType: 'string', alignment: 'left'},
					],
					data: [
						{id: 'row-0', cells: {'$.product': {raw: 'Widget', display: 'Widget'}}},
					],
				},
			},
		},
		{
			element: {
				type: 'data-table',
				componentId: 'table-3',
				props: {
					title: 'Orders',
					columns: [
						{id: '$.order_id', label: 'Order ID', dataType: 'string', alignment: 'left'},
					],
					data: [
						{id: 'row-0', cells: {'$.order_id': {raw: 'ORD-001', display: 'ORD-001'}}},
					],
				},
			},
		},
		{
			element: {
				type: 'data-table',
				componentId: 'table-4',
				props: {
					title: 'Sales',
					columns: [
						{id: '$.total', label: 'Total', dataType: 'number', alignment: 'right'},
					],
					data: [
						{id: 'row-0', cells: {'$.total': {raw: 1000, display: '1,000'}}},
					],
				},
			},
		},
	],
};

/**
 * 3-column grid with auto-flow (rows undefined)
 */
export const GRID_AUTO_FLOW_THREE_TABLES: RenderGridLayout = {
	type: 'grid',
	columns: 3,
	children: [
		{
			element: {
				type: 'data-table',
				componentId: 'table-1',
				props: {
					title: 'Region A',
					columns: [
						{id: '$.sales', label: 'Sales', dataType: 'number', alignment: 'right'},
					],
					data: [
						{id: 'row-0', cells: {'$.sales': {raw: 100, display: '100'}}},
					],
				},
			},
		},
		{
			element: {
				type: 'data-table',
				componentId: 'table-2',
				props: {
					title: 'Region B',
					columns: [
						{id: '$.sales', label: 'Sales', dataType: 'number', alignment: 'right'},
					],
					data: [
						{id: 'row-0', cells: {'$.sales': {raw: 200, display: '200'}}},
					],
				},
			},
		},
		{
			element: {
				type: 'data-table',
				componentId: 'table-3',
				props: {
					title: 'Region C',
					columns: [
						{id: '$.sales', label: 'Sales', dataType: 'number', alignment: 'right'},
					],
					data: [
						{id: 'row-0', cells: {'$.sales': {raw: 300, display: '300'}}},
					],
				},
			},
		},
	],
};

/**
 * Grid with explicit positioning (column_start, row_start)
 */
export const GRID_WITH_POSITIONING: RenderGridLayout = {
	type: 'grid',
	columns: 3,
	rows: 2,
	children: [
		{
			element: {
				type: 'data-table',
				componentId: 'top-left',
				props: {
					title: 'Top Left',
					columns: [{id: '$.value', label: 'Value', dataType: 'string', alignment: 'left'}],
					data: [{id: 'row-0', cells: {'$.value': {raw: 'A', display: 'A'}}}],
				},
			},
			column_start: 1,
			row_start: 1,
		},
		{
			element: {
				type: 'data-table',
				componentId: 'top-right',
				props: {
					title: 'Top Right',
					columns: [{id: '$.value', label: 'Value', dataType: 'string', alignment: 'left'}],
					data: [{id: 'row-0', cells: {'$.value': {raw: 'B', display: 'B'}}}],
				},
			},
			column_start: 3,
			row_start: 1,
		},
		{
			element: {
				type: 'data-table',
				componentId: 'bottom-span',
				props: {
					title: 'Bottom Spanning',
					columns: [{id: '$.value', label: 'Value', dataType: 'string', alignment: 'left'}],
					data: [{id: 'row-0', cells: {'$.value': {raw: 'C', display: 'C'}}}],
				},
			},
			column_start: 2,
			row_start: 2,
			column_span: 2,
		},
	],
};

/**
 * Grid with column spanning only (no explicit positioning)
 */
export const GRID_WITH_SPAN: RenderGridLayout = {
	type: 'grid',
	columns: 4,
	children: [
		{
			element: {
				type: 'data-table',
				componentId: 'header',
				props: {
					title: 'Header (spans 4)',
					columns: [{id: '$.title', label: 'Title', dataType: 'string', alignment: 'left'}],
					data: [{id: 'row-0', cells: {'$.title': {raw: 'Dashboard', display: 'Dashboard'}}}],
				},
			},
			column_span: 4,
		},
		{
			element: {
				type: 'data-table',
				componentId: 'sidebar',
				props: {
					title: 'Sidebar',
					columns: [{id: '$.menu', label: 'Menu', dataType: 'string', alignment: 'left'}],
					data: [{id: 'row-0', cells: {'$.menu': {raw: 'Home', display: 'Home'}}}],
				},
			},
			row_span: 2,
		},
		{
			element: {
				type: 'data-table',
				componentId: 'content',
				props: {
					title: 'Content (spans 3)',
					columns: [{id: '$.body', label: 'Body', dataType: 'string', alignment: 'left'}],
					data: [{id: 'row-0', cells: {'$.body': {raw: 'Main content', display: 'Main content'}}}],
				},
			},
			column_span: 3,
		},
	],
};
