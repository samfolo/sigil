/**
 * Core render tree builder v2 - orchestrates walkLayout and ComponentBuilders
 *
 * Two-phase processing:
 * 1. walkLayout: Validates layout structure and produces RenderTree with component placeholders
 * 2. processRenderTree: Recursively replaces placeholders with built components using builders
 *
 * This separation enables independent testing of layout traversal and data binding,
 * and allows reporting all errors in one pass rather than failing fast.
 */

import {err, isErr, ok, type Result, type SpecError} from '@sigil/src/common/errors';
import type {ComponentSpec} from '@sigil/src/lib/generated/types/specification';

import {getBuilder} from '../builders/registry';
import {JSONPATH_ROOT} from '../constants';
import type {
	RenderComponent,
	RenderGridChild,
	RenderGridLayout,
	RenderHorizontalStackLayout,
	RenderTree,
	RenderVerticalStackLayout,
} from '../types';
import {walkLayout} from '../utils/walkLayout';

/**
 * Builds a RenderTree from ComponentSpec and raw data
 *
 * Processing pipeline:
 * 1. Call walkLayout to get RenderTree skeleton with component placeholders
 * 2. Call processRenderTree to recursively replace placeholders with built components
 * 3. Return complete RenderTree with all component props populated
 *
 * Error accumulation:
 * - Errors from walkLayout are returned immediately (cannot proceed without valid structure)
 * - Errors from data binding are accumulated across all components
 * - All binding errors reported in one pass to enable fixing multiple issues simultaneously
 *
 * @param spec - ComponentSpec from Sigil IR
 * @param data - Raw data (structure validated based on component requirements)
 * @returns Result containing RenderTree or array of structured errors
 */
export const buildRenderTree = (spec: ComponentSpec, data: unknown): Result<RenderTree, SpecError[]> => {
	// Phase 1: Get layout structure with placeholders
	const layoutResult = walkLayout(spec);

	if (isErr(layoutResult)) {
		// Layout errors prevent data binding - return immediately
		return layoutResult;
	}

	// Phase 2: Recursively replace placeholders with built components
	const pathContext = [JSONPATH_ROOT];
	const processedResult = processRenderTree(layoutResult.data, spec, data, pathContext);

	return processedResult;
};

/**
 * Recursively processes a RenderTree, replacing component placeholders with built components
 *
 * Handles three cases:
 * 1. Stack layouts (horizontal/vertical): Recursively process children array
 * 2. Grid layouts: Recursively process children whilst preserving positioning
 * 3. Leaf components: Call replaceComponentPlaceholder to build actual props
 *
 * Error accumulation strategy:
 * - Continue processing siblings even when one child fails
 * - Collect all errors from recursive calls
 * - Return accumulated errors if any failures occurred
 *
 * @param tree - RenderTree to process (may be layout or component)
 * @param spec - ComponentSpec containing component definitions and bindings
 * @param data - Raw data to bind to components
 * @param pathContext - JSONPath segments for error reporting
 * @returns Result containing processed RenderTree or accumulated errors
 */
const processRenderTree = (
	tree: RenderTree,
	spec: ComponentSpec,
	data: unknown,
	pathContext: string[]
): Result<RenderTree, SpecError[]> => {
	const errors: SpecError[] = [];

	// Switch on discriminator to handle RenderLayout vs RenderComponent
	switch (tree.type) {
		case 'horizontal-stack':
		case 'vertical-stack': {
			// Process stack layout children
			const processedChildren: RenderTree[] = [];

			for (const [index, child] of tree.children.entries()) {
				const childPathContext = [...pathContext, `.layout.children[${index}]`];
				const result = processRenderTree(child, spec, data, childPathContext);

				if (isErr(result)) {
					// Accumulate errors but continue processing siblings
					errors.push(...result.error);
				} else {
					processedChildren.push(result.data);
				}
			}

			// Return layout with processed children
			if (errors.length > 0) {
				return err(errors);
			}

			if (tree.type === 'horizontal-stack') {
				const processedLayout: RenderHorizontalStackLayout = {
					...tree,
					children: processedChildren,
				};
				return ok(processedLayout);
			} else {
				const processedLayout: RenderVerticalStackLayout = {
					...tree,
					children: processedChildren,
				};
				return ok(processedLayout);
			}
		}

		case 'grid': {
			// Process grid layout children whilst preserving positioning
			const processedChildren: RenderGridChild[] = [];

			for (const [index, gridChild] of tree.children.entries()) {
				const childPathContext = [...pathContext, `.layout.children[${index}]`];
				const elementPathContext = [...childPathContext, `.element`];
				const result = processRenderTree(gridChild.element, spec, data, elementPathContext);

				if (isErr(result)) {
					// Accumulate errors but continue processing siblings
					errors.push(...result.error);
				} else {
					// Preserve positioning metadata whilst replacing element
					processedChildren.push({
						element: result.data,
						column_start: gridChild.column_start,
						row_start: gridChild.row_start,
						column_span: gridChild.column_span,
						row_span: gridChild.row_span,
					});
				}
			}

			// Return grid layout with processed children
			if (errors.length > 0) {
				return err(errors);
			}

			const processedLayout: RenderGridLayout = {
				...tree,
				children: processedChildren,
			};
			return ok(processedLayout);
		}

		case 'data-table':
		case 'hierarchy':
		case 'composition':
		case 'text-insight': {
			// Leaf component - replace placeholder with built component
			return replaceComponentPlaceholder(tree, spec, data, pathContext);
		}

		default: {
			// Exhaustiveness check - should never reach here
			const _exhaustive: never = tree;
			return _exhaustive;
		}
	}
};

/**
 * Replaces a component placeholder with actual props from ComponentBuilder
 *
 * Processing steps:
 * 1. Extract componentId from placeholder
 * 2. Look up component in spec.root.nodes
 * 3. Look up builder from registry using component type
 * 4. Extract accessor_bindings for this component
 * 5. Call builder.build with config, data, bindings, pathContext
 * 6. Return RenderComponent with built props or accumulated errors
 *
 * @param placeholder - RenderComponent placeholder with empty props
 * @param spec - ComponentSpec containing component definitions and bindings
 * @param data - Raw data to bind to component
 * @param pathContext - JSONPath segments for error reporting
 * @returns Result containing RenderComponent with built props or accumulated errors
 */
const replaceComponentPlaceholder = (
	placeholder: RenderComponent,
	spec: ComponentSpec,
	data: unknown,
	pathContext: string[]
): Result<RenderComponent, SpecError[]> => {
	// Extract componentId from placeholder
	const componentId = placeholder.componentId;

	if (!componentId) {
		// This should never happen if walkLayout is working correctly
		throw new Error('Component placeholder missing componentId - this is a bug in walkLayout');
	}

	// Look up component in spec.root.nodes
	const componentNode = spec.root.nodes[componentId];

	if (!componentNode) {
		// This should never happen if walkLayout validated component references
		throw new Error(`Component "${componentId}" not found in spec.root.nodes - this is a bug in walkLayout`);
	}

	// Extract data_source for binding (defaults to root if not specified)
	const dataSource = componentNode.data_source ?? JSONPATH_ROOT;

	// Switch on component type for type narrowing and builder dispatch
	switch (placeholder.type) {
		case 'data-table': {
			// Verify config type matches component type
			if (componentNode.config.type !== 'data-table') {
				throw new Error(`Component "${componentId}" has type mismatch - this is a bug in walkLayout`);
			}

			const config = componentNode.config;
			const accessorBindings = spec.root.accessor_bindings[componentId] ?? {};
			const builder = getBuilder('data-table');

			const propsResult = builder.build(config, data, accessorBindings, pathContext, dataSource);

			if (isErr(propsResult)) {
				return propsResult;
			}

			return ok({
				type: 'data-table',
				componentId,
				props: propsResult.data,
			});
		}

		case 'hierarchy': {
			// Verify config type matches component type
			if (componentNode.config.type !== 'hierarchy') {
				throw new Error(`Component "${componentId}" has type mismatch - this is a bug in walkLayout`);
			}

			const config = componentNode.config;
			const accessorBindings = spec.root.accessor_bindings[componentId] ?? {};
			const builder = getBuilder('hierarchy');

			const propsResult = builder.build(config, data, accessorBindings, pathContext, dataSource);

			if (isErr(propsResult)) {
				return propsResult;
			}

			return ok({
				type: 'hierarchy',
				componentId,
				props: propsResult.data,
			});
		}

		case 'composition': {
			// Verify config type matches component type
			if (componentNode.config.type !== 'composition') {
				throw new Error(`Component "${componentId}" has type mismatch - this is a bug in walkLayout`);
			}

			const config = componentNode.config;
			const accessorBindings = spec.root.accessor_bindings[componentId] ?? {};
			const builder = getBuilder('composition');

			const propsResult = builder.build(config, data, accessorBindings, pathContext, dataSource);

			if (isErr(propsResult)) {
				return propsResult;
			}

			return ok({
				type: 'composition',
				componentId,
				props: propsResult.data,
			});
		}

		case 'text-insight': {
			// Verify config type matches component type
			if (componentNode.config.type !== 'text-insight') {
				throw new Error(`Component "${componentId}" has type mismatch - this is a bug in walkLayout`);
			}

			const config = componentNode.config;
			const accessorBindings = spec.root.accessor_bindings[componentId] ?? {};
			const builder = getBuilder('text-insight');

			const propsResult = builder.build(config, data, accessorBindings, pathContext, dataSource);

			if (isErr(propsResult)) {
				return propsResult;
			}

			return ok({
				type: 'text-insight',
				componentId,
				props: propsResult.data,
			});
		}

		default: {
			// Exhaustiveness check
			const _exhaustive: never = placeholder;
			return _exhaustive;
		}
	}
};
