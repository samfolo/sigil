/**
 * Tests for DataTable component
 *
 * These tests verify the DataTable component renders correctly with various
 * configurations, handles edge cases robustly, and provides proper accessibility
 * attributes.
 */

import {render, screen, within} from '@testing-library/react';
import {describe, expect, it} from 'vitest';

import {DataTable} from './DataTable';
import {
	BASIC_TABLE,
	EMPTY_TABLE,
	LARGE_TABLE,
	TABLE_WITH_ALL_ALIGNMENTS,
	TABLE_WITH_MISSING_CELLS,
	TABLE_WITH_UNDEFINED_ALIGNMENT,
	TABLE_WITH_UNDEFINED_DISPLAY,
	TABLE_WITHOUT_OPTIONAL_PROPS,
} from './DataTable.fixtures';

describe('DataTable', () => {
	describe('Basic Rendering', () => {
		it('should render table with headers', () => {
			render(<DataTable {...BASIC_TABLE} />);

			// Query headers by role
			expect(screen.getByRole('columnheader', {name: 'Full Name'})).toBeInTheDocument();
			expect(screen.getByRole('columnheader', {name: 'Email Address'})).toBeInTheDocument();
			expect(screen.getByRole('columnheader', {name: 'Age'})).toBeInTheDocument();
			expect(screen.getByRole('columnheader', {name: 'Status'})).toBeInTheDocument();
		});

		it('should render all data rows', () => {
			render(<DataTable {...BASIC_TABLE} />);

			// Verify each row's content
			expect(screen.getByText('Alice Johnson')).toBeInTheDocument();
			expect(screen.getByText('alice@example.com')).toBeInTheDocument();
			expect(screen.getByText('28')).toBeInTheDocument();

			expect(screen.getByText('Bob Smith')).toBeInTheDocument();
			expect(screen.getByText('bob@example.com')).toBeInTheDocument();
			expect(screen.getByText('35')).toBeInTheDocument();

			expect(screen.getByText('Charlie Brown')).toBeInTheDocument();
			expect(screen.getByText('charlie@example.com')).toBeInTheDocument();
			expect(screen.getByText('42')).toBeInTheDocument();
		});

		it('should render cells with correct structure', () => {
			render(<DataTable {...BASIC_TABLE} />);

			// Get all cells
			const cells = screen.getAllByRole('cell');

			// Should have 4 columns × 3 rows = 12 cells
			expect(cells).toHaveLength(12);
		});

		it('should apply proper table structure', () => {
			render(<DataTable {...BASIC_TABLE} />);

			const table = screen.getByRole('table');
			expect(table).toBeInTheDocument();

			// Verify table has thead and tbody
			const thead = within(table).getAllByRole('rowgroup').at(0);
			const tbody = within(table).getAllByRole('rowgroup').at(1);

			expect(thead).toBeInTheDocument();
			expect(tbody).toBeInTheDocument();
		});
	});

	describe('Alignment', () => {
		it('should apply left alignment class', () => {
			render(<DataTable {...TABLE_WITH_ALL_ALIGNMENTS} />);

			const leftHeader = screen.getByRole('columnheader', {name: 'Left Aligned'});
			expect(leftHeader).toHaveClass('text-left');

			// Check first cell in left column
			const cells = screen.getAllByRole('cell');
			const leftCell = cells.at(0);
			expect(leftCell).toHaveClass('text-left');
		});

		it('should apply center alignment class', () => {
			render(<DataTable {...TABLE_WITH_ALL_ALIGNMENTS} />);

			const centerHeader = screen.getByRole('columnheader', {name: 'Center Aligned'});
			expect(centerHeader).toHaveClass('text-center');

			// Check second cell in center column
			const cells = screen.getAllByRole('cell');
			const centerCell = cells.at(1);
			expect(centerCell).toHaveClass('text-center');
		});

		it('should apply right alignment class', () => {
			render(<DataTable {...TABLE_WITH_ALL_ALIGNMENTS} />);

			const rightHeader = screen.getByRole('columnheader', {name: 'Right Aligned'});
			expect(rightHeader).toHaveClass('text-right');

			// Check third cell in right column
			const cells = screen.getAllByRole('cell');
			const rightCell = cells.at(2);
			expect(rightCell).toHaveClass('text-right');
		});

		it('should default to left alignment when alignment is undefined', () => {
			render(<DataTable {...TABLE_WITH_UNDEFINED_ALIGNMENT} />);

			const field1Header = screen.getByRole('columnheader', {name: 'Field 1'});
			const field2Header = screen.getByRole('columnheader', {name: 'Field 2'});

			expect(field1Header).toHaveClass('text-left');
			expect(field2Header).toHaveClass('text-left');

			// Check cells also default to left
			const cells = screen.getAllByRole('cell');
			expect(cells.at(0)).toHaveClass('text-left');
			expect(cells.at(1)).toHaveClass('text-left');
		});
	});

	describe('Title & Description', () => {
		it('should render title when provided', () => {
			render(<DataTable {...BASIC_TABLE} />);

			// Title is rendered as caption
			expect(screen.getByText('User Directory')).toBeInTheDocument();
		});

		it('should render description when provided', () => {
			render(<DataTable {...BASIC_TABLE} />);

			expect(screen.getByText('A table displaying user information')).toBeInTheDocument();
		});

		it('should not render title when omitted', () => {
			render(<DataTable {...TABLE_WITHOUT_OPTIONAL_PROPS} />);

			// No caption should exist
			const table = screen.getByRole('table');
			const caption = within(table).queryByRole('caption');
			expect(caption).not.toBeInTheDocument();
		});

		it('should not render description when omitted', () => {
			render(<DataTable {...TABLE_WITHOUT_OPTIONAL_PROPS} />);

			// Table should not have aria-describedby
			const table = screen.getByRole('table');
			expect(table).not.toHaveAttribute('aria-describedby');
		});

		it('should link description with aria-describedby', () => {
			render(<DataTable {...BASIC_TABLE} />);

			const table = screen.getByRole('table');
			const describedBy = table.getAttribute('aria-describedby');

			expect(describedBy).toBeTruthy();

			// Description element should have that ID
			const description = screen.getByText('A table displaying user information');
			expect(description).toHaveAttribute('id', describedBy);
		});
	});

	describe('Empty State', () => {
		it('should show "No results" when data is empty', () => {
			render(<DataTable {...EMPTY_TABLE} />);

			expect(screen.getByText('No results')).toBeInTheDocument();
		});

		it('should have role="status" on empty state cell', () => {
			render(<DataTable {...EMPTY_TABLE} />);

			const cell = screen.getByRole('status');
			expect(cell).toHaveTextContent('No results');
		});

		it('should span all columns in empty state', () => {
			render(<DataTable {...EMPTY_TABLE} />);

			const cell = screen.getByRole('status');
			// EMPTY_TABLE has 2 columns
			expect(cell).toHaveAttribute('colspan', '2');
		});

		it('should render headers even when data is empty', () => {
			render(<DataTable {...EMPTY_TABLE} />);

			expect(screen.getByRole('columnheader', {name: 'Full Name'})).toBeInTheDocument();
			expect(screen.getByRole('columnheader', {name: 'Email Address'})).toBeInTheDocument();
		});
	});

	describe('Edge Cases', () => {
		it('should handle missing cells gracefully', () => {
			render(<DataTable {...TABLE_WITH_MISSING_CELLS} />);

			// Should render present cells
			expect(screen.getByText('present')).toBeInTheDocument();
			expect(screen.getByText('also present')).toBeInTheDocument();

			// Missing cell (col2) should render as empty string
			const cells = screen.getAllByRole('cell');
			expect(cells).toHaveLength(3);

			// Middle cell (col2) should be empty but exist
			const middleCell = cells.at(1);
			expect(middleCell).toHaveTextContent('');
		});

		it('should handle undefined display value', () => {
			render(<DataTable {...TABLE_WITH_UNDEFINED_DISPLAY} />);

			// Should render empty string for undefined display
			const cells = screen.getAllByRole('cell');
			expect(cells.at(0)).toHaveTextContent('');
		});

		it('should render large datasets efficiently', () => {
			const {container} = render(<DataTable {...LARGE_TABLE} />);

			// Should have 100 rows + headers
			const rows = container.querySelectorAll('tbody tr');
			expect(rows).toHaveLength(100);

			// Spot check first and last items
			expect(screen.getByText('Item 0')).toBeInTheDocument();
			expect(screen.getByText('Item 99')).toBeInTheDocument();
		});
	});

	describe('Accessibility', () => {
		it('should set scope="col" on headers', () => {
			render(<DataTable {...BASIC_TABLE} />);

			const nameHeader = screen.getByRole('columnheader', {name: 'Full Name'});
			expect(nameHeader).toHaveAttribute('scope', 'col');
		});

		it('should have stable IDs for aria-describedby', () => {
			const {rerender} = render(<DataTable {...BASIC_TABLE} />);

			const table1 = screen.getByRole('table');
			const describedBy1 = table1.getAttribute('aria-describedby');

			// Rerender should maintain same ID (useId stability)
			rerender(<DataTable {...BASIC_TABLE} />);

			const table2 = screen.getByRole('table');
			const describedBy2 = table2.getAttribute('aria-describedby');

			expect(describedBy1).toBe(describedBy2);
		});

		it('should use semantic table elements', () => {
			render(<DataTable {...BASIC_TABLE} />);

			// Should use proper semantic HTML
			expect(screen.getByRole('table')).toBeInTheDocument();
			expect(screen.getAllByRole('rowgroup').length).toBe(2); // thead and tbody
			expect(screen.getAllByRole('row').length).toBeGreaterThan(0);
			expect(screen.getAllByRole('columnheader').length).toBe(4);
			expect(screen.getAllByRole('cell').length).toBe(12);
		});
	});
});
