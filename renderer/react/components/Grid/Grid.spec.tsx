/**
 * Tests for Grid component
 */

import {render, screen} from '@testing-library/react';
import {describe, expect, it} from 'vitest';

import {getByLayoutType} from '@sigil/renderer/react/common';

import {Grid} from './Grid';
import {GridChild} from './GridChild';

describe('Grid', () => {
	it('should render with data-layout-type="grid"', () => {
		const {container} = render(
			<Grid columns={2}>
				<div>Child 1</div>
				<div>Child 2</div>
			</Grid>
		);

		const gridDiv = getByLayoutType(container, 'grid');
		expect(gridDiv).toBeInTheDocument();
	});

	it('should apply grid-cols class with arbitrary value', () => {
		const {container} = render(
			<Grid columns={3}>
				<div>Child</div>
			</Grid>
		);

		const gridDiv = getByLayoutType(container, 'grid');
		expect(gridDiv).toHaveClass('grid');
		expect(gridDiv).toHaveClass('grid-cols-[repeat(3,1fr)]');
	});

	it('should apply grid-rows class when rows is provided', () => {
		const {container} = render(
			<Grid columns={2} rows={3}>
				<div>Child</div>
			</Grid>
		);

		const gridDiv = getByLayoutType(container, 'grid');
		expect(gridDiv).toHaveClass('grid-rows-[repeat(3,1fr)]');
	});

	it('should not apply grid-rows class when rows is undefined', () => {
		const {container} = render(
			<Grid columns={2}>
				<div>Child</div>
			</Grid>
		);

		const gridDiv = getByLayoutType(container, 'grid');
		expect(gridDiv?.className).not.toContain('grid-rows');
	});

	it('should render children', () => {
		render(
			<Grid columns={2}>
				<div>First</div>
				<div>Second</div>
				<div>Third</div>
			</Grid>
		);

		expect(screen.getByText('First')).toBeInTheDocument();
		expect(screen.getByText('Second')).toBeInTheDocument();
		expect(screen.getByText('Third')).toBeInTheDocument();
	});

	it('should support large column counts via arbitrary values', () => {
		const {container} = render(
			<Grid columns={15}>
				<div>Child</div>
			</Grid>
		);

		const gridDiv = getByLayoutType(container, 'grid');
		expect(gridDiv).toHaveClass('grid-cols-[repeat(15,1fr)]');
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
