/**
 * Grid - arranges children in rows and columns using CSS Grid
 */

import type {ReactElement, ReactNode} from 'react';
import {memo} from 'react';

import type {RenderGridLayout} from '@sigil/renderer/core/types/types';

/**
 * Grid props with ReactNode children instead of RenderGridChild[]
 */
export interface GridProps extends Omit<RenderGridLayout, 'children' | 'type'> {
	children: ReactNode;
}

/**
 * Renders children in CSS Grid container
 *
 * Uses Tailwind arbitrary values for dynamic column/row counts.
 * Spacing, alignment, and padding deferred to subsequent implementation.
 */
const GridComponent = ({columns, rows, children}: GridProps): ReactElement => (
	<div
		data-layout-type="grid"
		className={`grid grid-cols-[repeat(${columns},1fr)]${rows !== undefined ? ` grid-rows-[repeat(${rows},1fr)]` : ''}`}
	>
		{children}
	</div>
);

export const Grid = memo(GridComponent);
Grid.displayName = 'Grid';
