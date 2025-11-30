/**
 * Text - renders formatted values with semantic typography and affordances
 *
 * Applies scale-based sizing, combinable traits (bold, italic, code, etc.),
 * hyperlink behaviour, and truncation. All formatting is pre-processed by
 * TextBuilder - this component handles presentation only.
 */

import type {CSSProperties, ReactElement, ReactNode} from 'react';
import {memo} from 'react';

import type {TextProps} from '@sigil/renderer/core/types/types';
import type {
	HyperlinkAffordance,
	TextAffordance,
	TextScale,
	TextTrait,
	TruncationAffordance,
} from '@sigil/src/lib/generated/types/specification';

/**
 * Maximum line-clamp value supported by Tailwind utility classes
 */
const MAX_LINE_CLAMP_UTILITY = 6;

/**
 * Default scale when none specified
 */
const DEFAULT_SCALE: TextScale = 'body';

/**
 * Scale to Tailwind class mapping
 */
export const SCALE_CLASS_MAP: Record<TextScale, string> = {
	display: 'text-4xl font-bold',
	title: 'text-2xl font-semibold',
	heading: 'text-xl font-semibold',
	subheading: 'text-lg font-medium',
	body: 'text-base',
	caption: 'text-sm text-muted-foreground',
	overline: 'text-xs uppercase tracking-wide text-muted-foreground',
};

/**
 * Trait to Tailwind class mapping
 *
 * Semantic traits (mono, superscript, subscript) use wrapper elements
 * instead of classes - they map to empty string and are filtered out.
 */
export const TRAIT_CLASS_MAP: Record<TextTrait, string> = {
	strong: 'font-bold',
	emphasis: 'italic',
	underline: 'underline',
	subtle: 'text-muted-foreground',
	mono: '',
	superscript: '',
	subscript: '',
};

/**
 * Styling for inline code elements (mono trait)
 */
const CODE_ELEMENT_CLASSES = 'font-mono bg-muted px-1 rounded text-[0.9em]';

/**
 * Truncation styling result
 */
interface TruncationStyles {
	className: string;
	style?: CSSProperties;
}

/**
 * Extracted affordances by type
 */
interface ExtractedAffordances {
	hyperlink?: HyperlinkAffordance;
	truncation?: TruncationAffordance;
}

/**
 * Builds truncation classes and styles from affordance
 */
const getTruncationStyles = (affordance: TruncationAffordance): TruncationStyles => {
	const lines = affordance.maximum_lines ?? 1;

	if (lines === 1) {
		return {className: 'truncate'};
	}

	if (lines <= MAX_LINE_CLAMP_UTILITY) {
		return {className: `line-clamp-${lines}`};
	}

	return {
		className: 'overflow-hidden',
		style: {
			display: '-webkit-box',
			WebkitBoxOrient: 'vertical',
			WebkitLineClamp: lines,
		},
	};
};

/**
 * Wraps content in semantic elements based on traits
 *
 * Application order (outermost to innermost):
 * 1. superscript OR subscript (mutually exclusive - superscript takes precedence)
 * 2. mono (code element)
 *
 * If both superscript and subscript are present, superscript wins.
 * This behaviour should be documented at the schema level.
 */
const wrapWithSemanticElements = (content: ReactNode, traits: TextTrait[]): ReactNode => {
	const hasMono = traits.includes('mono');
	const hasSuperscript = traits.includes('superscript');
	const hasSubscript = traits.includes('subscript');

	let wrapped = content;

	if (hasMono) {
		wrapped = <code className={CODE_ELEMENT_CLASSES}>{wrapped}</code>;
	}

	if (hasSuperscript) {
		wrapped = <sup>{wrapped}</sup>;
	} else if (hasSubscript) {
		wrapped = <sub>{wrapped}</sub>;
	}

	return wrapped;
};

/**
 * Builds class string from traits, filtering empty mappings
 */
const getTraitClasses = (traits: TextTrait[]): string =>
	traits
		.map((trait) => TRAIT_CLASS_MAP[trait])
		.filter(Boolean)
		.join(' ');

/**
 * Extracts unique affordances by type from array
 *
 * Affordances are independent capabilities - duplicates are ignored,
 * only the first of each type is used.
 */
const extractAffordances = (affordances: TextAffordance[]): ExtractedAffordances => {
	let hyperlink: HyperlinkAffordance | undefined;
	let truncation: TruncationAffordance | undefined;

	for (const affordance of affordances) {
		switch (affordance.type) {
			case 'hyperlink':
				if (!hyperlink) {
					hyperlink = affordance;
				}
				break;
			case 'truncation':
				if (!truncation) {
					truncation = affordance;
				}
				break;
			default: {
				const _exhaustive: never = affordance;
				throw new Error(`Unknown affordance type: ${JSON.stringify(_exhaustive)}`);
			}
		}
	}

	return {hyperlink, truncation};
};

/**
 * Text component renders formatted values with semantic styling
 */
const TextComponent = ({config, formattedValue}: TextProps): ReactElement => {
	const {scale = DEFAULT_SCALE, traits = [], affordances = []} = config;
	const {hyperlink, truncation} = extractAffordances(affordances);

	const classes: string[] = [SCALE_CLASS_MAP[scale]];
	const traitClasses = getTraitClasses(traits);
	if (traitClasses) {
		classes.push(traitClasses);
	}

	let truncationStyle: CSSProperties | undefined;
	if (truncation) {
		const truncationStyles = getTruncationStyles(truncation);
		classes.push(truncationStyles.className);
		truncationStyle = truncationStyles.style;
	}

	let content: ReactNode = formattedValue ?? '';
	if (traits.length > 0) {
		content = wrapWithSemanticElements(content, traits);
	}

	if (hyperlink) {
		const {href, target} = hyperlink;

		if (href.startsWith('$')) {
			console.warn(
				`[Text] Hyperlink href contains unresolved JSONPath: ${href}. Rendering as plain text.`
			);
		} else {
			const linkProps: React.AnchorHTMLAttributes<HTMLAnchorElement> = {
				href,
				className: classes.join(' '),
				style: truncationStyle,
			};

			if (target === 'blank') {
				linkProps.target = '_blank';
				linkProps.rel = 'noopener noreferrer';
			}

			return <a data-element-type="text" {...linkProps}>{content}</a>;
		}
	}

	return (
		<span
			data-element-type="text"
			data-scale={scale}
			className={classes.join(' ')}
			style={truncationStyle}
		>
			{content}
		</span>
	);
};

export const Text = memo(TextComponent);
Text.displayName = 'Text';
