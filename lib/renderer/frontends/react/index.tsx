/**
 * React adapter for Sigil renderer
 *
 * Transforms RenderTree into React elements. This adapter layer enables
 * the framework-agnostic core to be used with React components.
 */

import type {ReactElement} from 'react';

import type {ComponentSpec} from '@sigil/lib/generated/types/specification';

import {buildRenderTree} from '../../core';

import {DataTable} from './components/DataTable';

/**
 * Renders a ComponentSpec with data as React elements
 *
 * Pipeline:
 * 1. Call buildRenderTree() to get framework-agnostic RenderTree
 * 2. Switch on RenderNode type
 * 3. Map to appropriate React component
 * 4. Return React element
 *
 * @param spec - ComponentSpec from Sigil IR
 * @param data - Raw data array
 * @returns React element ready to render
 */
export const render = (spec: ComponentSpec, data: unknown[]): ReactElement => {
	const renderTree = buildRenderTree(spec, data);

	// Switch on RenderNode type for type narrowing
	switch (renderTree.type) {
		case 'data-table':
			return <DataTable {...renderTree.props} />;

		default: {
			// Exhaustiveness check
			const _exhaustive: never = renderTree;
			throw new Error(`Unknown render node type: ${(_exhaustive as {type: string}).type}`);
		}
	}
};
