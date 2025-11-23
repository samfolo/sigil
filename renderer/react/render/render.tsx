/**
 * React adapter for Sigil renderer
 *
 * Transforms RenderTree into React elements. This adapter layer enables
 * the framework-agnostic core to be used with React components.
 */

import type {ReactElement} from 'react';

import {buildRenderTree} from '@sigil/renderer/core';
import {SpecProcessingError} from '@sigil/src/common/errors';
import type {ComponentSpec} from '@sigil/src/lib/generated/types/specification';

import {DataTable} from '../components';

/**
 * Renders a ComponentSpec with data as React elements
 *
 * Pipeline:
 * 1. Call buildRenderTree() to get framework-agnostic RenderTree
 * 2. Handle any errors from tree building
 * 3. Extract component from layout wrapper (temporary until full layout rendering)
 * 4. Switch on RenderNode type
 * 5. Map to appropriate React component
 * 6. Return React element
 *
 * @param spec - ComponentSpec from Sigil IR
 * @param data - Raw data (structure depends on parser and component requirements)
 * @returns React element ready to render
 * @throws Error if rendering fails (converts Result errors to exceptions for React error boundaries)
 */
export const render = (spec: ComponentSpec, data: unknown): ReactElement => {
	const renderTreeResult = buildRenderTree(spec, data);

	// Convert Result error to exception for React error boundary handling
	if (!renderTreeResult.success) {
		// Structured errors that model can fix - use SpecProcessingError
		throw new SpecProcessingError(renderTreeResult.error);
	}

	let renderTree = renderTreeResult.data;

	// Temporary: Extract single component from layout wrapper
	// buildRenderTree v2 wraps everything in a layout, but React renderer
	// doesn't have layout components yet. Extract the component if there's
	// only one child in a vertical-stack wrapper.
	if (renderTree.type === 'vertical-stack' && renderTree.children.length === 1) {
		const child = renderTree.children.at(0);
		if (child && child.type === 'data-table') {
			renderTree = child;
		}
	}

	// Switch on RenderNode type for type narrowing
	switch (renderTree.type) {
		case 'data-table':
			return <DataTable {...renderTree.props} />;

		default:
			throw new Error(`Unknown render node type: ${renderTree.type}`);
	}
};
