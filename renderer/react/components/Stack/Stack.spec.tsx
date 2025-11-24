/**
 * Tests for Stack components
 */

import {render, screen} from '@testing-library/react';
import {describe, expect, it} from 'vitest';

import {getByLayoutType} from '@sigil/renderer/react/common';

import {HorizontalStack} from './HorizontalStack';
import {VerticalStack} from './VerticalStack';

describe('HorizontalStack', () => {
	it('should render with flex-row', () => {
		const {container} = render(
			<HorizontalStack spacing="normal">
				<div>Child 1</div>
				<div>Child 2</div>
			</HorizontalStack>
		);

		const stackDiv = getByLayoutType(container, 'horizontal-stack');
		expect(stackDiv).toBeInTheDocument();
	});

	it('should render children', () => {
		render(
			<HorizontalStack spacing="normal">
				<div>First</div>
				<div>Second</div>
			</HorizontalStack>
		);

		expect(screen.getByText('First')).toBeInTheDocument();
		expect(screen.getByText('Second')).toBeInTheDocument();
	});
});

describe('VerticalStack', () => {
	it('should render with flex-col', () => {
		const {container} = render(
			<VerticalStack spacing="normal">
				<div>Child 1</div>
				<div>Child 2</div>
			</VerticalStack>
		);

		const stackDiv = getByLayoutType(container, 'vertical-stack');
		expect(stackDiv).toBeInTheDocument();
	});

	it('should render children', () => {
		render(
			<VerticalStack spacing="normal">
				<div>First</div>
				<div>Second</div>
			</VerticalStack>
		);

		expect(screen.getByText('First')).toBeInTheDocument();
		expect(screen.getByText('Second')).toBeInTheDocument();
	});
});
