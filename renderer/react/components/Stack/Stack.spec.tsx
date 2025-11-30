/**
 * Tests for Stack components
 */

import {render, screen} from '@testing-library/react';
import {describe, expect, it} from 'vitest';

import {getByElementType, objectToEntries} from '@sigil/renderer/react/common';
import {ALIGNMENT_CLASS_MAP, SPACING_CLASS_MAP} from '@sigil/renderer/react/utils';

import {HorizontalStack} from './HorizontalStack';
import {VerticalStack} from './VerticalStack';

describe('HorizontalStack', () => {
	it('should render with flex-row and children', () => {
		const {container} = render(
			<HorizontalStack spacing="normal">
				<div>First</div>
				<div>Second</div>
			</HorizontalStack>
		);

		const stackDiv = getByElementType(container, 'horizontal-stack');
		expect(stackDiv).toBeInTheDocument();
		expect(stackDiv).toHaveClass('flex', 'flex-row');
		expect(screen.getByText('First')).toBeInTheDocument();
		expect(screen.getByText('Second')).toBeInTheDocument();
	});

	it.each(objectToEntries(SPACING_CLASS_MAP))(
		'applies %s spacing as %s class',
		(spacing, expectedClass) => {
			const {container} = render(
				<HorizontalStack spacing={spacing}>
					<div>Child</div>
				</HorizontalStack>
			);

			expect(getByElementType(container, 'horizontal-stack')).toHaveClass(expectedClass);
		}
	);

	it.each(objectToEntries(ALIGNMENT_CLASS_MAP))(
		'applies %s vertical_alignment as %s class',
		(alignment, expectedClass) => {
			const {container} = render(
				<HorizontalStack spacing="normal" vertical_alignment={alignment}>
					<div>Child</div>
				</HorizontalStack>
			);

			expect(getByElementType(container, 'horizontal-stack')).toHaveClass(expectedClass);
		}
	);

	it('does not apply alignment class when vertical_alignment is undefined', () => {
		const {container} = render(
			<HorizontalStack spacing="normal">
				<div>Child</div>
			</HorizontalStack>
		);

		const stackDiv = getByElementType(container, 'horizontal-stack');
		Object.values(ALIGNMENT_CLASS_MAP).forEach((className) => {
			expect(stackDiv).not.toHaveClass(className);
		});
	});

	it('applies uniform padding for number value', () => {
		const {container} = render(
			<HorizontalStack spacing="normal" padding={16}>
				<div>Child</div>
			</HorizontalStack>
		);

		expect(getByElementType(container, 'horizontal-stack')).toHaveStyle({padding: '16px'});
	});

	it('applies individual padding for object value', () => {
		const {container} = render(
			<HorizontalStack spacing="normal" padding={{top: 8, bottom: 16}}>
				<div>Child</div>
			</HorizontalStack>
		);

		expect(getByElementType(container, 'horizontal-stack')).toHaveStyle({
			paddingTop: '8px',
			paddingBottom: '16px',
		});
	});
});

describe('VerticalStack', () => {
	it('should render with flex-col and children', () => {
		const {container} = render(
			<VerticalStack spacing="normal">
				<div>First</div>
				<div>Second</div>
			</VerticalStack>
		);

		const stackDiv = getByElementType(container, 'vertical-stack');
		expect(stackDiv).toBeInTheDocument();
		expect(stackDiv).toHaveClass('flex', 'flex-col');
		expect(screen.getByText('First')).toBeInTheDocument();
		expect(screen.getByText('Second')).toBeInTheDocument();
	});

	it.each(objectToEntries(SPACING_CLASS_MAP))(
		'applies %s spacing as %s class',
		(spacing, expectedClass) => {
			const {container} = render(
				<VerticalStack spacing={spacing}>
					<div>Child</div>
				</VerticalStack>
			);

			expect(getByElementType(container, 'vertical-stack')).toHaveClass(expectedClass);
		}
	);

	it.each(objectToEntries(ALIGNMENT_CLASS_MAP))(
		'applies %s horizontal_alignment as %s class',
		(alignment, expectedClass) => {
			const {container} = render(
				<VerticalStack spacing="normal" horizontal_alignment={alignment}>
					<div>Child</div>
				</VerticalStack>
			);

			expect(getByElementType(container, 'vertical-stack')).toHaveClass(expectedClass);
		}
	);

	it('does not apply alignment class when horizontal_alignment is undefined', () => {
		const {container} = render(
			<VerticalStack spacing="normal">
				<div>Child</div>
			</VerticalStack>
		);

		const stackDiv = getByElementType(container, 'vertical-stack');
		Object.values(ALIGNMENT_CLASS_MAP).forEach((className) => {
			expect(stackDiv).not.toHaveClass(className);
		});
	});

	it('applies uniform padding for number value', () => {
		const {container} = render(
			<VerticalStack spacing="normal" padding={24}>
				<div>Child</div>
			</VerticalStack>
		);

		expect(getByElementType(container, 'vertical-stack')).toHaveStyle({padding: '24px'});
	});

	it('applies individual padding for object value', () => {
		const {container} = render(
			<VerticalStack spacing="normal" padding={{left: 12, right: 12}}>
				<div>Child</div>
			</VerticalStack>
		);

		expect(getByElementType(container, 'vertical-stack')).toHaveStyle({
			paddingLeft: '12px',
			paddingRight: '12px',
		});
	});
});
