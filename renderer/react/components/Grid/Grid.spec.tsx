/**
 * Tests for Grid component
 */

import {render, screen} from '@testing-library/react';
import {describe, expect, it} from 'vitest';

import {getByLayoutType} from '@sigil/renderer/react/common';

import {Grid} from './Grid';

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
