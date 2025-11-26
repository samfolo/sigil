/**
 * Tailwind align-items classes for stack cross-axis alignment
 */

import type {StackLayoutNodeAlignment} from '@sigil/src/lib/generated/types/specification';

export const ALIGNMENT_CLASS_MAP: Record<StackLayoutNodeAlignment, string> = {
	start: 'items-start',
	center: 'items-center',
	end: 'items-end',
	stretch: 'items-stretch',
};

export const getAlignmentClass = (
	alignment: StackLayoutNodeAlignment | undefined
): string | undefined =>
	alignment !== undefined ? ALIGNMENT_CLASS_MAP[alignment] : undefined;
