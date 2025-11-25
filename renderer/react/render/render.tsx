/**
 * React adapter for Sigil renderer
 *
 * Transforms RenderTree into React elements. This adapter layer enables
 * the framework-agnostic core to be used with React components.
 */

import {Fragment} from 'react';
import type {ReactElement} from 'react';

import {buildRenderTree} from '@sigil/renderer/core';
import type {RenderTree} from '@sigil/renderer/core/types/types';
import {SpecProcessingError} from '@sigil/src/common/errors';
import type {ComponentSpec} from '@sigil/src/lib/generated/types/specification';

import {DataTable, Grid, GridChild, HorizontalStack, VerticalStack} from '../components';

/**
 * Recursively renders a RenderTree node as React element
 *
 * @param tree - RenderTree node (layout or component)
 * @returns React element
 */
const renderTreeNode = (tree: RenderTree): ReactElement => {
	switch (tree.type) {
		case 'horizontal-stack':
			return (
				<HorizontalStack {...tree}>
					{tree.children.map((child, index) => (
						<Fragment key={index}>
							{renderTreeNode(child)}
						</Fragment>
					))}
				</HorizontalStack>
			);

		case 'vertical-stack':
			return (
				<VerticalStack {...tree}>
					{tree.children.map((child, index) => (
						<Fragment key={index}>
							{renderTreeNode(child)}
						</Fragment>
					))}
				</VerticalStack>
			);

		case 'grid':
			return (
				<Grid columns={tree.columns} rows={tree.rows}>
					{tree.children.map((child, index) => (
						<GridChild
							key={index}
							columnStart={child.column_start}
							rowStart={child.row_start}
							columnSpan={child.column_span}
							rowSpan={child.row_span}
						>
							{renderTreeNode(child.element)}
						</GridChild>
					))}
				</Grid>
			);

		case 'data-table':
			return <DataTable {...tree.props} />;

		default:
			throw new Error(`Unknown render node type: ${tree.type}`);
	}
};

/**
 * Renders a ComponentSpec with data as React elements
 *
 * Pipeline:
 * 1. Call buildRenderTree() to get framework-agnostic RenderTree
 * 2. Handle any errors from tree building
 * 3. Recursively render tree to React elements
 *
 * @param spec - ComponentSpec from Sigil IR
 * @param data - Raw data (structure depends on parser and component requirements)
 * @returns React element ready to render
 * @throws Error if rendering fails (converts Result errors to exceptions for React error boundaries)
 */
export const render = (spec: ComponentSpec, data: unknown): ReactElement => {
	const renderTreeResult = buildRenderTree(spec, data);

	if (!renderTreeResult.success) {
		throw new SpecProcessingError(renderTreeResult.error);
	}

	return renderTreeNode(renderTreeResult.data);
};
