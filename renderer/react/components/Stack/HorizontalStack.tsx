/**
 * HorizontalStack - arranges children left-to-right using Flexbox
 */

import type {ReactElement, ReactNode} from 'react';
import {memo} from 'react';

import type {RenderHorizontalStackLayout} from '@sigil/renderer/core/types/types';

import {getAlignmentClass, getPaddingStyle, getSpacingClass} from '../../utils';

/**
 * HorizontalStack props with ReactNode children instead of RenderTree[]
 */
export interface HorizontalStackProps extends Omit<RenderHorizontalStackLayout, 'children' | 'type'> {
	children: ReactNode;
}

/**
 * Renders children in horizontal flexbox container
 */
const HorizontalStackComponent = ({
	spacing,
	vertical_alignment,
	padding,
	children,
}: HorizontalStackProps): ReactElement => {
	const alignmentClass = getAlignmentClass(vertical_alignment);
	const className = `flex flex-row ${getSpacingClass(spacing)}${alignmentClass ? ` ${alignmentClass}` : ''}`;

	return (
		<div
			data-layout-type="horizontal-stack"
			className={className}
			style={getPaddingStyle(padding)}
		>
			{children}
		</div>
	);
};

export const HorizontalStack = memo(HorizontalStackComponent);
HorizontalStack.displayName = 'HorizontalStack';
