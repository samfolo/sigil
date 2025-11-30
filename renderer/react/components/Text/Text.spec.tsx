/**
 * Tests for Text component
 *
 * Verifies Text renders correctly with scales, traits, affordances,
 * and handles edge cases robustly.
 */

import {render, screen} from '@testing-library/react';
import {describe, expect, it, vi} from 'vitest';

import type {TextScale, TextTrait} from '@sigil/src/lib/generated/types/specification';

import {getByElementType, objectToEntries} from '../../common';

import {SCALE_CLASS_MAP, Text, TRAIT_CLASS_MAP} from './Text';
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

			const value = BASIC_TEXT.formattedValue;
			expect(value).toBeDefined();
			expect(value).not.toBeNull();
			if (value) {
				expect(screen.getByText(value)).toBeInTheDocument();
			}
		});

		it('should render empty text element for null formatted value', () => {
			const {container} = render(<Text {...NULL_VALUE_TEXT} />);

			const textElement = getByElementType(container, 'text');
			expect(textElement).toBeInTheDocument();
			expect(textElement).toHaveTextContent('');
		});

		it('should render empty text element for undefined formatted value', () => {
			const {container} = render(<Text {...UNDEFINED_VALUE_TEXT} />);

			const textElement = getByElementType(container, 'text');
			expect(textElement).toBeInTheDocument();
			expect(textElement).toHaveTextContent('');
		});

		it('should render empty string formatted value', () => {
			const {container} = render(<Text {...EMPTY_STRING_TEXT} />);

			const textElement = getByElementType(container, 'text');
			expect(textElement).toBeInTheDocument();
			expect(textElement).toHaveTextContent('');
		});

		it('should apply default body scale when scale not specified', () => {
			const {container} = render(<Text {...BASIC_TEXT} />);

			const textElement = getByElementType(container, 'text');
			expect(textElement).toHaveAttribute('data-scale', 'body');
			expect(textElement).toHaveClass('text-base');
		});
	});

	describe('Scale Styling', () => {
		it.each(objectToEntries(SCALE_CLASS_MAP))(
			'should apply correct classes for %s scale',
			(scale: TextScale, expectedClasses: string) => {
				const {container} = render(
					<Text
						config={{accessor: '$.value', scale}}
						formattedValue="Test"
					/>
				);

				const textElement = getByElementType(container, 'text');
				expect(textElement).toHaveAttribute('data-scale', scale);
				expect(textElement).toHaveClass(...expectedClasses.split(' '));
			}
		);
	});

	describe('Trait Styling', () => {
		describe('Class-based traits', () => {
			const classBasedTraits = objectToEntries(TRAIT_CLASS_MAP)
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

					const textElement = getByElementType(container, 'text');
					expect(textElement).toHaveClass(expectedClass);
				}
			);
		});

		describe('Semantic element traits', () => {
			const elementBasedTraits = objectToEntries(TRAIT_EXPECTED_ELEMENTS)
				.filter(([_, expectedElement]) => expectedElement !== '');

			it.each(elementBasedTraits)(
				'should wrap in <%s> element for %s trait',
				(trait: TextTrait, expectedElement: string) => {
					render(
						<Text
							config={{accessor: '$.value', traits: [trait]}}
							formattedValue="Test"
						/>
					);

					const element = screen.getByText('Test');
					expect(element).toBeInTheDocument();
					expect(element.tagName.toLowerCase()).toBe(expectedElement);
				}
			);
		});

		it('should apply mono styling to code element', () => {
			render(<Text {...MONO_TEXT} />);

			const value = MONO_TEXT.formattedValue;
			expect(value).toBeDefined();
			if (value) {
				const code = screen.getByText(value);
				expect(code).toBeInTheDocument();
				expect(code.tagName.toLowerCase()).toBe('code');
				expect(code).toHaveClass('font-mono', 'bg-muted', 'px-1', 'rounded');
			}
		});

		it('should combine multiple class-based traits', () => {
			const {container} = render(<Text {...COMBINED_TRAITS_TEXT} />);

			const textElement = getByElementType(container, 'text');
			expect(textElement).toHaveClass('font-bold', 'italic');
		});

		it('should nest code inside superscript', () => {
			render(<Text {...MONO_SUPERSCRIPT_TEXT} />);

			const value = MONO_SUPERSCRIPT_TEXT.formattedValue;
			expect(value).toBeDefined();
			if (value) {
				const code = screen.getByText(value);
				expect(code).toBeInTheDocument();
				expect(code.tagName.toLowerCase()).toBe('code');

				const sup = code.parentElement;
				expect(sup).not.toBeNull();
				expect(sup?.tagName.toLowerCase()).toBe('sup');
			}
		});

		it('should prefer superscript when both superscript and subscript are present', () => {
			render(<Text {...CONFLICTING_SCRIPT_TRAITS_TEXT} />);

			const value = CONFLICTING_SCRIPT_TRAITS_TEXT.formattedValue;
			expect(value).toBeDefined();
			if (value) {
				const element = screen.getByText(value);
				expect(element.tagName.toLowerCase()).toBe('sup');
			}
		});
	});

	describe('Hyperlink Affordance', () => {
		it('should render anchor element for hyperlink affordance', () => {
			render(<Text {...HYPERLINK_SELF_TEXT} />);

			const value = HYPERLINK_SELF_TEXT.formattedValue;
			expect(value).toBeDefined();

			const link = screen.getByRole('link');
			expect(link).toBeInTheDocument();
			expect(link).toHaveAttribute('href', '/about');
			if (value) {
				expect(link).toHaveTextContent(value);
			}
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

			const textElement = getByElementType(container, 'text');
			expect(textElement).toBeInTheDocument();

			const value = HYPERLINK_JSONPATH_TEXT.formattedValue;
			expect(value).toBeDefined();
			if (value) {
				expect(textElement).toHaveTextContent(value);
			}

			warnSpy.mockRestore();
		});
	});

	describe('Truncation Affordance', () => {
		it('should apply truncate class for single-line truncation', () => {
			const {container} = render(<Text {...TRUNCATE_SINGLE_LINE_TEXT} />);

			const textElement = getByElementType(container, 'text');
			expect(textElement).toHaveClass('truncate');
		});

		it('should apply line-clamp-3 class for three-line truncation', () => {
			const {container} = render(<Text {...TRUNCATE_THREE_LINES_TEXT} />);

			const textElement = getByElementType(container, 'text');
			expect(textElement).toHaveClass('line-clamp-3');
		});

		it('should apply inline style for truncation beyond utility range', () => {
			const {container} = render(<Text {...TRUNCATE_TEN_LINES_TEXT} />);

			const textElement = getByElementType(container, 'text');
			expect(textElement).toHaveClass('overflow-hidden');
			expect(textElement).toHaveStyle({
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
			render(<Text {...DUPLICATE_AFFORDANCES_TEXT} />);

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
