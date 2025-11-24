/**
 * VerticalStack - arranges children top-to-bottom using Flexbox
 */

import type {ReactElement, ReactNode} from 'react';
import {memo} from 'react';

import type {RenderVerticalStackLayout} from '@sigil/renderer/core/types/types';

/**
 * VerticalStack props with ReactNode children instead of RenderTree[]
 */
export interface VerticalStackProps extends Omit<RenderVerticalStackLayout, 'children' | 'type'> {
	children: ReactNode;
}

/**
 * Renders children in vertical flexbox container
 *
 * Only implements flex-direction; spacing, alignment, padding, and size constraints deferred
 */
const VerticalStackComponent = ({children}: VerticalStackProps): ReactElement => (
	<div className="flex flex-col">
		{children}
	</div>
);

export const VerticalStack = memo(VerticalStackComponent);
VerticalStack.displayName = 'VerticalStack';
