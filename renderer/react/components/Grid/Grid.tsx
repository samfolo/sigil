/**
 * Grid - arranges children in rows and columns using CSS Grid
 */

import type {ReactElement, ReactNode} from 'react';
import {memo} from 'react';

import type {RenderGridLayout} from '@sigil/renderer/core/types/types';

import {getColumnGapClass, getPaddingStyle, getRowGapClass} from '../../utils';

/**
 * Grid props with ReactNode children instead of RenderGridChild[]
 */
export interface GridProps extends Omit<RenderGridLayout, 'children' | 'type'> {
	children: ReactNode;
}

/**
 * Renders children in CSS Grid container
 *
 * Uses inline styles for dynamic column/row counts as Tailwind
 * cannot detect dynamically constructed class names at build time.
 */
const GridComponent = ({
	columns,
	rows,
	column_gap,
	row_gap,
	padding,
	children,
}: GridProps): ReactElement => {
	const gapClasses = [
		column_gap !== undefined ? getColumnGapClass(column_gap) : null,
		row_gap !== undefined ? getRowGapClass(row_gap) : null,
	]
		.filter(Boolean)
		.join(' ');

	const className = `grid${gapClasses ? ` ${gapClasses}` : ''}`;

	return (
		<div
			data-layout-type="grid"
			className={className}
			style={{
				gridTemplateColumns: `repeat(${columns}, 1fr)`,
				...(rows !== undefined && {gridTemplateRows: `repeat(${rows}, 1fr)`}),
				...getPaddingStyle(padding),
			}}
		>
			{children}
		</div>
	);
};

export const Grid = memo(GridComponent);
Grid.displayName = 'Grid';
