/**
 * VerticalStack - arranges children top-to-bottom using Flexbox
 */

import type {ReactElement, ReactNode} from 'react';
import {memo} from 'react';

import type {RenderVerticalStackLayout} from '@sigil/renderer/core/types/types';

import {getAlignmentClass, getPaddingStyle, getSpacingClass} from '../../utils';

/**
 * VerticalStack props with ReactNode children instead of RenderTree[]
 */
export interface VerticalStackProps extends Omit<RenderVerticalStackLayout, 'children' | 'type'> {
	children: ReactNode;
}

/**
 * Renders children in vertical flexbox container
 */
const VerticalStackComponent = ({
	spacing,
	horizontal_alignment,
	padding,
	children,
}: VerticalStackProps): ReactElement => {
	const alignmentClass = getAlignmentClass(horizontal_alignment);
	const className = `flex flex-col ${getSpacingClass(spacing)}${alignmentClass ? ` ${alignmentClass}` : ''}`;

	return (
		<div
			data-layout-type="vertical-stack"
			className={className}
			style={getPaddingStyle(padding)}
		>
			{children}
		</div>
	);
};

export const VerticalStack = memo(VerticalStackComponent);
VerticalStack.displayName = 'VerticalStack';
