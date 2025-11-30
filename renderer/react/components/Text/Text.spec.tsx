/**
 * Tests for Text component
 *
 * Verifies Text renders correctly with scales, traits, affordances,
 * and handles edge cases robustly.
 */

import {render, screen} from '@testing-library/react';
import {describe, expect, it, vi} from 'vitest';

import type {TextScale, TextTrait} from '@sigil/src/lib/generated/types/specification';

import {objectToEntries} from '../../common';
import {Text} from './Text';
import {
	BASIC_TEXT,
	COMBINED_AFFORDANCES_TEXT,
	COMBINED_TRAITS_TEXT,
	CONFLICTING_SCRIPT_TRAITS_TEXT,
	DUPLICATE_AFFORDANCES_TEXT,
	EMPTY_STRING_TEXT,
	FULLY_CONFIGURED_TEXT,
	HYPERLINK_BLANK_TEXT,
	HYPERLINK_JSONPATH_TEXT,
	HYPERLINK_SELF_TEXT,
	MONO_SUPERSCRIPT_TEXT,
	MONO_TEXT,
	NULL_VALUE_TEXT,
	SCALE_EXPECTED_CLASSES,
	SUBSCRIPT_TEXT,
	SUPERSCRIPT_TEXT,
	TRAIT_EXPECTED_CLASSES,
	TRAIT_EXPECTED_ELEMENTS,
	TRUNCATE_SINGLE_LINE_TEXT,
	TRUNCATE_TEN_LINES_TEXT,
	TRUNCATE_THREE_LINES_TEXT,
	UNDEFINED_VALUE_TEXT,
} from './Text.fixtures';

describe('Text', () => {
	describe('Basic Rendering', () => {
		it('should render formatted value', () => {
			render(<Text {...BASIC_TEXT} />);

			expect(screen.getByText(BASIC_TEXT.formattedValue as string)).toBeInTheDocument();
		});

		it('should render empty span for null formatted value', () => {
			const {container} = render(<Text {...NULL_VALUE_TEXT} />);

			const span = container.querySelector('span');
			expect(span).toBeInTheDocument();
			expect(span).toHaveTextContent('');
		});

		it('should render empty span for undefined formatted value', () => {
			const {container} = render(<Text {...UNDEFINED_VALUE_TEXT} />);

			const span = container.querySelector('span');
			expect(span).toBeInTheDocument();
			expect(span).toHaveTextContent('');
		});

		it('should render empty string formatted value', () => {
			const {container} = render(<Text {...EMPTY_STRING_TEXT} />);

			const span = container.querySelector('span');
			expect(span).toBeInTheDocument();
			expect(span).toHaveTextContent('');
		});

		it('should apply default body scale when scale not specified', () => {
			const {container} = render(<Text {...BASIC_TEXT} />);

			const span = container.querySelector('span');
			expect(span).toHaveAttribute('data-scale', 'body');
			expect(span).toHaveClass('text-base');
		});
	});

	describe('Scale Styling', () => {
		it.each(objectToEntries(SCALE_EXPECTED_CLASSES))(
			'should apply correct classes for %s scale',
			(scale: TextScale, expectedClasses: string[]) => {
				const {container} = render(
					<Text
						config={{accessor: '$.value', scale}}
						formattedValue="Test"
					/>
				);

				const span = container.querySelector('span');
				expect(span).toHaveAttribute('data-scale', scale);
				for (const className of expectedClasses) {
					expect(span).toHaveClass(className);
				}
			}
		);
	});

	describe('Trait Styling', () => {
		describe('Class-based traits', () => {
			const classBasedTraits = objectToEntries(TRAIT_EXPECTED_CLASSES)
				.filter(([_, expectedClass]) => expectedClass !== '');

			it.each(classBasedTraits)(
				'should apply %s class for %s trait',
				(trait: TextTrait, expectedClass: string) => {
					const {container} = render(
						<Text
							config={{accessor: '$.value', traits: [trait]}}
							formattedValue="Test"
						/>
					);

					const span = container.querySelector('span');
					expect(span).toHaveClass(expectedClass);
				}
			);
		});

		describe('Semantic element traits', () => {
			const elementBasedTraits = objectToEntries(TRAIT_EXPECTED_ELEMENTS)
				.filter(([_, expectedElement]) => expectedElement !== '');

			it.each(elementBasedTraits)(
				'should wrap in <%s> element for %s trait',
				(trait: TextTrait, expectedElement: string) => {
					const {container} = render(
						<Text
							config={{accessor: '$.value', traits: [trait]}}
							formattedValue="Test"
						/>
					);

					const element = container.querySelector(expectedElement);
					expect(element).toBeInTheDocument();
					expect(element).toHaveTextContent('Test');
				}
			);
		});

		it('should apply mono styling to code element', () => {
			const {container} = render(<Text {...MONO_TEXT} />);

			const code = container.querySelector('code');
			expect(code).toBeInTheDocument();
			expect(code).toHaveClass('font-mono', 'bg-muted', 'px-1', 'rounded');
		});

		it('should combine multiple class-based traits', () => {
			const {container} = render(<Text {...COMBINED_TRAITS_TEXT} />);

			const span = container.querySelector('span');
			expect(span).toHaveClass('font-bold', 'italic');
		});

		it('should nest code inside superscript', () => {
			const {container} = render(<Text {...MONO_SUPERSCRIPT_TEXT} />);

			const sup = container.querySelector('sup');
			expect(sup).toBeInTheDocument();

			const code = sup?.querySelector('code');
			expect(code).toBeInTheDocument();
			expect(code).toHaveTextContent(MONO_SUPERSCRIPT_TEXT.formattedValue as string);
		});

		it('should prefer superscript when both superscript and subscript are present', () => {
			const {container} = render(<Text {...CONFLICTING_SCRIPT_TRAITS_TEXT} />);

			const sup = container.querySelector('sup');
			const sub = container.querySelector('sub');

			expect(sup).toBeInTheDocument();
			expect(sub).not.toBeInTheDocument();
		});
	});

	describe('Hyperlink Affordance', () => {
		it('should render anchor element for hyperlink affordance', () => {
			render(<Text {...HYPERLINK_SELF_TEXT} />);

			const link = screen.getByRole('link');
			expect(link).toBeInTheDocument();
			expect(link).toHaveAttribute('href', '/about');
			expect(link).toHaveTextContent(HYPERLINK_SELF_TEXT.formattedValue as string);
		});

		it('should not add target attribute for self target', () => {
			render(<Text {...HYPERLINK_SELF_TEXT} />);

			const link = screen.getByRole('link');
			expect(link).not.toHaveAttribute('target');
			expect(link).not.toHaveAttribute('rel');
		});

		it('should add target="_blank" and rel for blank target', () => {
			render(<Text {...HYPERLINK_BLANK_TEXT} />);

			const link = screen.getByRole('link');
			expect(link).toHaveAttribute('target', '_blank');
			expect(link).toHaveAttribute('rel', 'noopener noreferrer');
		});

		it('should warn and render as plain text for unresolved JSONPath href', () => {
			const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

			const {container} = render(<Text {...HYPERLINK_JSONPATH_TEXT} />);

			expect(warnSpy).toHaveBeenCalledWith(
				expect.stringContaining('unresolved JSONPath')
			);

			const link = screen.queryByRole('link');
			expect(link).not.toBeInTheDocument();

			const span = container.querySelector('span');
			expect(span).toBeInTheDocument();
			expect(span).toHaveTextContent(HYPERLINK_JSONPATH_TEXT.formattedValue as string);

			warnSpy.mockRestore();
		});
	});

	describe('Truncation Affordance', () => {
		it('should apply truncate class for single-line truncation', () => {
			const {container} = render(<Text {...TRUNCATE_SINGLE_LINE_TEXT} />);

			const span = container.querySelector('span');
			expect(span).toHaveClass('truncate');
		});

		it('should apply line-clamp-3 class for three-line truncation', () => {
			const {container} = render(<Text {...TRUNCATE_THREE_LINES_TEXT} />);

			const span = container.querySelector('span');
			expect(span).toHaveClass('line-clamp-3');
		});

		it('should apply inline style for truncation beyond utility range', () => {
			const {container} = render(<Text {...TRUNCATE_TEN_LINES_TEXT} />);

			const span = container.querySelector('span');
			expect(span).toHaveClass('overflow-hidden');
			expect(span).toHaveStyle({
				display: '-webkit-box',
				WebkitLineClamp: 10,
			});
		});
	});

	describe('Combined Features', () => {
		it('should combine hyperlink and truncation affordances', () => {
			render(<Text {...COMBINED_AFFORDANCES_TEXT} />);

			const link = screen.getByRole('link');
			expect(link).toHaveAttribute('href', 'https://example.com');
			expect(link).toHaveAttribute('target', '_blank');
			expect(link).toHaveClass('line-clamp-2');
		});

		it('should use only first affordance of each type when duplicates present', () => {
			const {container} = render(<Text {...DUPLICATE_AFFORDANCES_TEXT} />);

			const link = screen.getByRole('link');
			expect(link).toHaveAttribute('href', '/first');
			expect(link).toHaveClass('line-clamp-2');
			expect(link).not.toHaveClass('line-clamp-5');
		});

		it('should apply scale, traits, and affordances together', () => {
			render(<Text {...FULLY_CONFIGURED_TEXT} />);

			const link = screen.getByRole('link');
			expect(link).toHaveClass('text-xl', 'font-semibold');
			expect(link).toHaveClass('font-bold', 'underline');
			expect(link).toHaveClass('truncate');
			expect(link).toHaveAttribute('href', '/details');
		});
	});
});
