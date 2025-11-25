/**
 * GridChild - grid cell wrapper providing positioning and containment
 */

import type {CSSProperties, ReactElement, ReactNode} from 'react';
import {memo} from 'react';

export interface GridChildProps {
	/**
	 * Explicit column position (1-indexed). Omit for auto-flow
	 */
	columnStart?: number;

	/**
	 * Explicit row position (1-indexed). Omit for auto-flow
	 */
	rowStart?: number;

	/**
	 * Number of columns to span
	 */
	columnSpan?: number;

	/**
	 * Number of rows to span
	 */
	rowSpan?: number;

	/**
	 * Content to render within the grid cell
	 */
	children: ReactNode;
}

/**
 * Computes CSS grid positioning styles from props
 */
const computePositionStyle = ({
	columnStart,
	rowStart,
	columnSpan,
	rowSpan,
}: Omit<GridChildProps, 'children'>): CSSProperties => {
	const style: CSSProperties = {};

	if (columnStart !== undefined && columnSpan !== undefined) {
		style.gridColumn = `${columnStart} / span ${columnSpan}`;
	} else if (columnStart !== undefined) {
		style.gridColumnStart = columnStart;
	} else if (columnSpan !== undefined) {
		style.gridColumn = `span ${columnSpan}`;
	}

	if (rowStart !== undefined && rowSpan !== undefined) {
		style.gridRow = `${rowStart} / span ${rowSpan}`;
	} else if (rowStart !== undefined) {
		style.gridRowStart = rowStart;
	} else if (rowSpan !== undefined) {
		style.gridRow = `span ${rowSpan}`;
	}

	return style;
};

/**
 * Grid cell wrapper providing positioning and containment
 *
 * - Applies grid positioning (column/row start, span)
 * - Uses min-w-0 min-h-0 to prevent content blowout
 * - Leaf components handle their own overflow behaviour
 */
const GridChildComponent = ({
	columnStart,
	rowStart,
	columnSpan,
	rowSpan,
	children,
}: GridChildProps): ReactElement => {
	const positionStyle = computePositionStyle({columnStart, rowStart, columnSpan, rowSpan});
	const hasPositioning = Object.keys(positionStyle).length > 0;

	return (
		<div
			data-layout-type="grid-child"
			className="min-h-0 min-w-0"
			style={hasPositioning ? positionStyle : undefined}
		>
			{children}
		</div>
	);
};

export const GridChild = memo(GridChildComponent);
GridChild.displayName = 'GridChild';
