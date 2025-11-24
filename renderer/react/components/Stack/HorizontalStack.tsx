/**
 * HorizontalStack - arranges children left-to-right using Flexbox
 */

import type {ReactElement, ReactNode} from 'react';
import {memo} from 'react';

import type {RenderHorizontalStackLayout} from '@sigil/renderer/core/types/types';

/**
 * HorizontalStack props with ReactNode children instead of RenderTree[]
 */
export interface HorizontalStackProps extends Omit<RenderHorizontalStackLayout, 'children' | 'type'> {
	children: ReactNode;
}

/**
 * Renders children in horizontal flexbox container
 *
 * Only implements flex-direction; spacing, alignment, padding, and size constraints deferred
 */
const HorizontalStackComponent = ({children}: HorizontalStackProps): ReactElement => (
	<div className="flex flex-row">
		{children}
	</div>
);

export const HorizontalStack = memo(HorizontalStackComponent);
HorizontalStack.displayName = 'HorizontalStack';
