/**
 * Converts Padding to inline CSSProperties
 *
 * Number applies uniform padding. Object applies sides independently.
 */

import type {CSSProperties} from 'react';

import type {Padding} from '@sigil/src/lib/generated/types/specification';

export const getPaddingStyle = (padding: Padding | undefined): CSSProperties => {
	if (padding === undefined) {
		return {};
	}

	if (typeof padding === 'number') {
		return {padding: `${padding}px`};
	}

	const style: CSSProperties = {};

	if (padding.top !== undefined) {
		style.paddingTop = `${padding.top}px`;
	}
	if (padding.right !== undefined) {
		style.paddingRight = `${padding.right}px`;
	}
	if (padding.bottom !== undefined) {
		style.paddingBottom = `${padding.bottom}px`;
	}
	if (padding.left !== undefined) {
		style.paddingLeft = `${padding.left}px`;
	}

	return style;
};
