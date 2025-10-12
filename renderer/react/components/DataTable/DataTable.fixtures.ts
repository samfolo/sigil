/**
 * Test fixtures for DataTable component
 *
 * These fixtures provide reusable TableProps scenarios for testing various
 * rendering cases, edge cases, and accessibility features.
 */

import type {TableProps} from '@sigil/renderer/core';

/**
 * Basic valid table with three rows and mixed alignments
 */
export const BASIC_TABLE: TableProps = {
	title: 'User Directory',
	description: 'A table displaying user information',
	columns: [
		{
			id: 'name',
			label: 'Full Name',
			dataType: 'string',
			alignment: 'left',
		},
		{
			id: 'email',
			label: 'Email Address',
			dataType: 'string',
			alignment: 'left',
		},
		{
			id: 'age',
			label: 'Age',
			dataType: 'number',
			alignment: 'right',
		},
		{
			id: 'status',
			label: 'Status',
			dataType: 'string',
			alignment: 'center',
		},
	],
	data: [
		{
			id: 'row-0',
			cells: {
				name: {raw: 'Alice Johnson', display: 'Alice Johnson'},
				email: {raw: 'alice@example.com', display: 'alice@example.com'},
				age: {raw: 28, display: '28'},
				status: {raw: 'active', display: 'Active'},
			},
		},
		{
			id: 'row-1',
			cells: {
				name: {raw: 'Bob Smith', display: 'Bob Smith'},
				email: {raw: 'bob@example.com', display: 'bob@example.com'},
				age: {raw: 35, display: '35'},
				status: {raw: 'inactive', display: 'Inactive'},
			},
		},
		{
			id: 'row-2',
			cells: {
				name: {raw: 'Charlie Brown', display: 'Charlie Brown'},
				email: {raw: 'charlie@example.com', display: 'charlie@example.com'},
				age: {raw: 42, display: '42'},
				status: {raw: 'active', display: 'Active'},
			},
		},
	],
};

/**
 * Table with no data - should show empty state
 */
export const EMPTY_TABLE: TableProps = {
	title: 'Empty Users',
	description: 'No users found',
	columns: [
		{
			id: 'name',
			label: 'Full Name',
			dataType: 'string',
		},
		{
			id: 'email',
			label: 'Email Address',
			dataType: 'string',
		},
	],
	data: [],
};

/**
 * Table without title or description
 */
export const TABLE_WITHOUT_OPTIONAL_PROPS: TableProps = {
	columns: [
		{
			id: 'id',
			label: 'ID',
			dataType: 'string',
		},
		{
			id: 'value',
			label: 'Value',
			dataType: 'string',
		},
	],
	data: [
		{
			id: 'row-0',
			cells: {
				id: {raw: '1', display: '1'},
				value: {raw: 'test', display: 'test'},
			},
		},
	],
};

/**
 * Table with undefined alignment values (should default to left)
 */
export const TABLE_WITH_UNDEFINED_ALIGNMENT: TableProps = {
	columns: [
		{
			id: 'field1',
			label: 'Field 1',
			dataType: 'string',
			// alignment is undefined
		},
		{
			id: 'field2',
			label: 'Field 2',
			dataType: 'number',
			// alignment is undefined
		},
	],
	data: [
		{
			id: 'row-0',
			cells: {
				field1: {raw: 'value1', display: 'value1'},
				field2: {raw: 123, display: '123'},
			},
		},
	],
};

/**
 * Table with missing cell data (cell undefined in row.cells)
 * Tests robustness when data is incomplete
 */
export const TABLE_WITH_MISSING_CELLS: TableProps = {
	columns: [
		{
			id: 'col1',
			label: 'Column 1',
			dataType: 'string',
		},
		{
			id: 'col2',
			label: 'Column 2',
			dataType: 'string',
		},
		{
			id: 'col3',
			label: 'Column 3',
			dataType: 'string',
		},
	],
	data: [
		{
			id: 'row-0',
			cells: {
				col1: {raw: 'present', display: 'present'},
				// col2 is missing
				col3: {raw: 'also present', display: 'also present'},
			},
		},
	],
};

/**
 * Table with undefined display values
 * Tests handling of cells where display is explicitly undefined
 */
export const TABLE_WITH_UNDEFINED_DISPLAY: TableProps = {
	columns: [
		{
			id: 'name',
			label: 'Name',
			dataType: 'string',
		},
	],
	data: [
		{
			id: 'row-0',
			cells: {
				name: {
					raw: null,
					display: undefined as unknown as string, // Simulating undefined display
				},
			},
		},
	],
};

/**
 * Table testing all alignment options
 */
export const TABLE_WITH_ALL_ALIGNMENTS: TableProps = {
	columns: [
		{
			id: 'left',
			label: 'Left Aligned',
			dataType: 'string',
			alignment: 'left',
		},
		{
			id: 'center',
			label: 'Center Aligned',
			dataType: 'string',
			alignment: 'center',
		},
		{
			id: 'right',
			label: 'Right Aligned',
			dataType: 'number',
			alignment: 'right',
		},
	],
	data: [
		{
			id: 'row-0',
			cells: {
				left: {raw: 'left text', display: 'left text'},
				center: {raw: 'center text', display: 'center text'},
				right: {raw: 42, display: '42'},
			},
		},
	],
};

/**
 * Large table for testing performance characteristics
 */
export const LARGE_TABLE: TableProps = {
	title: 'Large Dataset',
	columns: [
		{id: 'id', label: 'ID', dataType: 'string'},
		{id: 'name', label: 'Name', dataType: 'string'},
		{id: 'value', label: 'Value', dataType: 'number', alignment: 'right'},
	],
	data: Array.from({length: 100}, (_, i) => ({
		id: `row-${i}`,
		cells: {
			id: {raw: i, display: String(i)},
			name: {raw: `Item ${i}`, display: `Item ${i}`},
			value: {raw: i * 10, display: String(i * 10)},
		},
	})),
};
