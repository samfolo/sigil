/**
 * Tailwind gap classes for layout spacing
 *
 * Scale: tight (8px) → normal (16px) → relaxed (24px)
 */

import type {LayoutNodeSpacing} from '@sigil/src/lib/generated/types/specification';

export const SPACING_CLASS_MAP: Record<LayoutNodeSpacing, string> = {
	tight: 'gap-2',
	normal: 'gap-4',
	relaxed: 'gap-6',
};

export const COLUMN_GAP_CLASS_MAP: Record<LayoutNodeSpacing, string> = {
	tight: 'gap-x-2',
	normal: 'gap-x-4',
	relaxed: 'gap-x-6',
};

export const ROW_GAP_CLASS_MAP: Record<LayoutNodeSpacing, string> = {
	tight: 'gap-y-2',
	normal: 'gap-y-4',
	relaxed: 'gap-y-6',
};

export const getSpacingClass = (spacing: LayoutNodeSpacing): string =>
	SPACING_CLASS_MAP[spacing];

export const getColumnGapClass = (spacing: LayoutNodeSpacing): string =>
	COLUMN_GAP_CLASS_MAP[spacing];

export const getRowGapClass = (spacing: LayoutNodeSpacing): string =>
	ROW_GAP_CLASS_MAP[spacing];
