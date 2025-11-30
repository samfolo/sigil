/**
 * Test fixtures for Text component
 *
 * Provides reusable TextProps scenarios covering scales, traits, affordances,
 * and edge cases.
 */

import type {TextProps} from '@sigil/renderer/core/types/types';
import type {TextScale, TextTrait} from '@sigil/src/lib/generated/types/specification';

/**
 * Expected Tailwind classes for each scale
 *
 * Record ensures all TextScale values are covered - adding/removing
 * union members triggers compile-time errors.
 */
export const SCALE_EXPECTED_CLASSES: Record<TextScale, string[]> = {
	display: ['text-4xl', 'font-bold'],
	title: ['text-2xl', 'font-semibold'],
	heading: ['text-xl', 'font-semibold'],
	subheading: ['text-lg', 'font-medium'],
	body: ['text-base'],
	caption: ['text-sm', 'text-muted-foreground'],
	overline: ['text-xs', 'uppercase', 'tracking-wide', 'text-muted-foreground'],
};

/**
 * Expected Tailwind class for each trait that maps to a class
 *
 * Record ensures all TextTrait values are covered. Traits that use
 * semantic elements instead of classes have empty string values.
 */
export const TRAIT_EXPECTED_CLASSES: Record<TextTrait, string> = {
	strong: 'font-bold',
	emphasis: 'italic',
	underline: 'underline',
	subtle: 'text-muted-foreground',
	mono: '',
	superscript: '',
	subscript: '',
};

/**
 * Expected semantic element for traits that wrap content
 *
 * Record ensures all TextTrait values are covered. Traits that use
 * classes instead of elements have empty string values.
 */
export const TRAIT_EXPECTED_ELEMENTS: Record<TextTrait, string> = {
	strong: '',
	emphasis: '',
	underline: '',
	subtle: '',
	mono: 'code',
	superscript: 'sup',
	subscript: 'sub',
};

/**
 * Basic text with default styling
 */
export const BASIC_TEXT: TextProps = {
	config: {
		accessor: '$.name',
	},
	formattedValue: 'Hello World',
};

/**
 * Text with null formatted value
 */
export const NULL_VALUE_TEXT: TextProps = {
	config: {
		accessor: '$.missing',
	},
	formattedValue: null,
};

/**
 * Text with undefined formatted value
 */
export const UNDEFINED_VALUE_TEXT: TextProps = {
	config: {
		accessor: '$.missing',
	},
	formattedValue: undefined,
};

/**
 * Text with empty string formatted value
 */
export const EMPTY_STRING_TEXT: TextProps = {
	config: {
		accessor: '$.empty',
	},
	formattedValue: '',
};

/**
 * Text with strong trait
 */
export const STRONG_TEXT: TextProps = {
	config: {
		accessor: '$.value',
		traits: ['strong'],
	},
	formattedValue: 'Important text',
};

/**
 * Text with emphasis trait
 */
export const EMPHASIS_TEXT: TextProps = {
	config: {
		accessor: '$.value',
		traits: ['emphasis'],
	},
	formattedValue: 'Emphasised text',
};

/**
 * Text with mono trait (code element)
 */
export const MONO_TEXT: TextProps = {
	config: {
		accessor: '$.code',
		traits: ['mono'],
	},
	formattedValue: 'const x = 42',
};

/**
 * Text with superscript trait
 */
export const SUPERSCRIPT_TEXT: TextProps = {
	config: {
		accessor: '$.ref',
		traits: ['superscript'],
	},
	formattedValue: '2',
};

/**
 * Text with subscript trait
 */
export const SUBSCRIPT_TEXT: TextProps = {
	config: {
		accessor: '$.formula',
		traits: ['subscript'],
	},
	formattedValue: '2',
};

/**
 * Text with multiple combined traits
 */
export const COMBINED_TRAITS_TEXT: TextProps = {
	config: {
		accessor: '$.value',
		traits: ['strong', 'emphasis'],
	},
	formattedValue: 'Bold and italic',
};

/**
 * Text with code inside superscript
 */
export const MONO_SUPERSCRIPT_TEXT: TextProps = {
	config: {
		accessor: '$.ref',
		traits: ['mono', 'superscript'],
	},
	formattedValue: 'n',
};

/**
 * Text with conflicting superscript and subscript (superscript wins)
 */
export const CONFLICTING_SCRIPT_TRAITS_TEXT: TextProps = {
	config: {
		accessor: '$.value',
		traits: ['superscript', 'subscript'],
	},
	formattedValue: 'x',
};

/**
 * Hyperlink with same-window target
 */
export const HYPERLINK_SELF_TEXT: TextProps = {
	config: {
		accessor: '$.link',
		affordances: [
			{type: 'hyperlink', href: '/about', target: 'self'},
		],
	},
	formattedValue: 'About page',
};

/**
 * Hyperlink with new tab target
 */
export const HYPERLINK_BLANK_TEXT: TextProps = {
	config: {
		accessor: '$.link',
		affordances: [
			{type: 'hyperlink', href: 'https://example.com', target: 'blank'},
		],
	},
	formattedValue: 'External link',
};

/**
 * Hyperlink with unresolved JSONPath (should warn and render as plain text)
 */
export const HYPERLINK_JSONPATH_TEXT: TextProps = {
	config: {
		accessor: '$.link',
		affordances: [
			{type: 'hyperlink', href: '$.url'},
		],
	},
	formattedValue: 'Dynamic link',
};

/**
 * Single-line truncation (default)
 */
export const TRUNCATE_SINGLE_LINE_TEXT: TextProps = {
	config: {
		accessor: '$.description',
		affordances: [
			{type: 'truncation'},
		],
	},
	formattedValue: 'This is a very long text that should be truncated to a single line',
};

/**
 * Multi-line truncation (within Tailwind utility range)
 */
export const TRUNCATE_THREE_LINES_TEXT: TextProps = {
	config: {
		accessor: '$.description',
		affordances: [
			{type: 'truncation', maximum_lines: 3},
		],
	},
	formattedValue: 'This is a long paragraph that spans multiple lines and should be truncated after three lines of content',
};

/**
 * Multi-line truncation (beyond Tailwind utility range, uses inline style)
 */
export const TRUNCATE_TEN_LINES_TEXT: TextProps = {
	config: {
		accessor: '$.description',
		affordances: [
			{type: 'truncation', maximum_lines: 10},
		],
	},
	formattedValue: 'Very long content that needs more than six lines',
};

/**
 * Combined hyperlink and truncation affordances
 */
export const COMBINED_AFFORDANCES_TEXT: TextProps = {
	config: {
		accessor: '$.link',
		affordances: [
			{type: 'hyperlink', href: 'https://example.com', target: 'blank'},
			{type: 'truncation', maximum_lines: 2},
		],
	},
	formattedValue: 'A truncated link to an external resource',
};

/**
 * Duplicate affordances (only first of each type should be used)
 */
export const DUPLICATE_AFFORDANCES_TEXT: TextProps = {
	config: {
		accessor: '$.value',
		affordances: [
			{type: 'truncation', maximum_lines: 2},
			{type: 'truncation', maximum_lines: 5},
			{type: 'hyperlink', href: '/first'},
			{type: 'hyperlink', href: '/second'},
		],
	},
	formattedValue: 'Text with duplicate affordances',
};

/**
 * Full configuration combining scale, traits, and affordances
 */
export const FULLY_CONFIGURED_TEXT: TextProps = {
	config: {
		accessor: '$.value',
		scale: 'heading',
		traits: ['strong', 'underline'],
		affordances: [
			{type: 'hyperlink', href: '/details', target: 'self'},
			{type: 'truncation', maximum_lines: 1},
		],
		title: 'Important Heading',
		description: 'A heading with multiple styling options',
	},
	formattedValue: 'Click here for details',
};
