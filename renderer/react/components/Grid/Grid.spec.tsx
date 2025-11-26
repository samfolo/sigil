/**
 * Tests for Grid component
 */

import {render, screen} from '@testing-library/react';
import {describe, expect, it} from 'vitest';

import {getByLayoutType, objectToEntries} from '@sigil/renderer/react/common';
import {COLUMN_GAP_CLASS_MAP, ROW_GAP_CLASS_MAP} from '@sigil/renderer/react/utils';

import {Grid} from './Grid';
import {GridChild} from './GridChild';

describe('Grid', () => {
	it('should render with grid class and children', () => {
		const {container} = render(
			<Grid columns={2}>
				<div>First</div>
				<div>Second</div>
			</Grid>
		);

		const gridDiv = getByLayoutType(container, 'grid');
		expect(gridDiv).toBeInTheDocument();
		expect(gridDiv).toHaveClass('grid');
		expect(screen.getByText('First')).toBeInTheDocument();
		expect(screen.getByText('Second')).toBeInTheDocument();
	});

	it('should apply gridTemplateColumns inline style', () => {
		const {container} = render(
			<Grid columns={3}>
				<div>Child</div>
			</Grid>
		);

		expect(getByLayoutType(container, 'grid')).toHaveStyle({
			gridTemplateColumns: 'repeat(3, 1fr)',
		});
	});

	it('should apply gridTemplateRows when rows is provided', () => {
		const {container} = render(
			<Grid columns={2} rows={3}>
				<div>Child</div>
			</Grid>
		);

		expect(getByLayoutType(container, 'grid')).toHaveStyle({
			gridTemplateRows: 'repeat(3, 1fr)',
		});
	});

	it('should not apply gridTemplateRows when rows is undefined', () => {
		const {container} = render(
			<Grid columns={2}>
				<div>Child</div>
			</Grid>
		);

		const style = getByLayoutType(container, 'grid')?.getAttribute('style') ?? '';
		expect(style).not.toContain('grid-template-rows');
	});

	it.each(objectToEntries(COLUMN_GAP_CLASS_MAP))(
		'applies %s column_gap as %s class',
		(gap, expectedClass) => {
			const {container} = render(
				<Grid columns={2} column_gap={gap}>
					<div>Child</div>
				</Grid>
			);

			expect(getByLayoutType(container, 'grid')).toHaveClass(expectedClass);
		}
	);

	it.each(objectToEntries(ROW_GAP_CLASS_MAP))(
		'applies %s row_gap as %s class',
		(gap, expectedClass) => {
			const {container} = render(
				<Grid columns={2} row_gap={gap}>
					<div>Child</div>
				</Grid>
			);

			expect(getByLayoutType(container, 'grid')).toHaveClass(expectedClass);
		}
	);

	it('applies both column_gap and row_gap classes', () => {
		const {container} = render(
			<Grid columns={2} column_gap="tight" row_gap="relaxed">
				<div>Child</div>
			</Grid>
		);

		const gridDiv = getByLayoutType(container, 'grid');
		expect(gridDiv).toHaveClass('gap-x-2', 'gap-y-6');
	});

	it('does not apply gap classes when gaps are undefined', () => {
		const {container} = render(
			<Grid columns={2}>
				<div>Child</div>
			</Grid>
		);

		const gridDiv = getByLayoutType(container, 'grid');
		Object.values(COLUMN_GAP_CLASS_MAP).forEach((className) => {
			expect(gridDiv).not.toHaveClass(className);
		});
		Object.values(ROW_GAP_CLASS_MAP).forEach((className) => {
			expect(gridDiv).not.toHaveClass(className);
		});
	});

	it('applies uniform padding for number value', () => {
		const {container} = render(
			<Grid columns={2} padding={16}>
				<div>Child</div>
			</Grid>
		);

		expect(getByLayoutType(container, 'grid')).toHaveStyle({padding: '16px'});
	});

	it('applies individual padding for object value', () => {
		const {container} = render(
			<Grid columns={2} padding={{top: 8, bottom: 8}}>
				<div>Child</div>
			</Grid>
		);

		expect(getByLayoutType(container, 'grid')).toHaveStyle({
			paddingTop: '8px',
			paddingBottom: '8px',
		});
	});
});

describe('GridChild', () => {
	it('should render with data-layout-type="grid-child"', () => {
		const {container} = render(
			<GridChild>
				<div>Content</div>
			</GridChild>
		);

		const gridChild = container.querySelector('[data-layout-type="grid-child"]');
		expect(gridChild).toBeInTheDocument();
	});

	it('should apply min-w-0 and min-h-0 classes', () => {
		const {container} = render(
			<GridChild>
				<div>Content</div>
			</GridChild>
		);

		const gridChild = container.querySelector('[data-layout-type="grid-child"]');
		expect(gridChild).toHaveClass('min-w-0');
		expect(gridChild).toHaveClass('min-h-0');
	});

	it('should render children', () => {
		render(
			<GridChild>
				<div>Child content</div>
			</GridChild>
		);

		expect(screen.getByText('Child content')).toBeInTheDocument();
	});

	it('should apply gridColumnStart when columnStart provided', () => {
		const {container} = render(
			<GridChild columnStart={2}>
				<div>Content</div>
			</GridChild>
		);

		const gridChild = container.querySelector('[data-layout-type="grid-child"]');
		expect(gridChild).toHaveStyle({gridColumnStart: 2});
	});

	it('should apply gridRowStart when rowStart provided', () => {
		const {container} = render(
			<GridChild rowStart={3}>
				<div>Content</div>
			</GridChild>
		);

		const gridChild = container.querySelector('[data-layout-type="grid-child"]');
		expect(gridChild).toHaveStyle({gridRowStart: 3});
	});

	it('should apply gridColumn span when only columnSpan provided', () => {
		const {container} = render(
			<GridChild columnSpan={2}>
				<div>Content</div>
			</GridChild>
		);

		const gridChild = container.querySelector('[data-layout-type="grid-child"]');
		expect(gridChild).toHaveStyle({gridColumn: 'span 2'});
	});

	it('should apply gridRow span when only rowSpan provided', () => {
		const {container} = render(
			<GridChild rowSpan={3}>
				<div>Content</div>
			</GridChild>
		);

		const gridChild = container.querySelector('[data-layout-type="grid-child"]');
		expect(gridChild).toHaveStyle({gridRow: 'span 3'});
	});

	it('should combine columnStart and columnSpan', () => {
		const {container} = render(
			<GridChild columnStart={2} columnSpan={3}>
				<div>Content</div>
			</GridChild>
		);

		const gridChild = container.querySelector('[data-layout-type="grid-child"]');
		expect(gridChild).toHaveStyle({gridColumn: '2 / span 3'});
	});

	it('should combine rowStart and rowSpan', () => {
		const {container} = render(
			<GridChild rowStart={1} rowSpan={2}>
				<div>Content</div>
			</GridChild>
		);

		const gridChild = container.querySelector('[data-layout-type="grid-child"]');
		expect(gridChild).toHaveStyle({gridRow: '1 / span 2'});
	});

	it('should not apply style attribute when no positioning provided', () => {
		const {container} = render(
			<GridChild>
				<div>Content</div>
			</GridChild>
		);

		const gridChild = container.querySelector('[data-layout-type="grid-child"]');
		expect(gridChild).not.toHaveAttribute('style');
	});
});
