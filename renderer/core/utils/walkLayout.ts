/**
 * Layout tree walker for recursive layout processing
 *
 * Recursively processes layout trees, transforming ComponentSpec layout nodes
 * into RenderTree structures ready for rendering. Handles both stack and grid
 * layouts with arbitrary nesting depth.
 */

import {ERROR_CODES, err, isErr, ok, type Result, type SpecError} from '@sigil/src/common/errors';
import {generateFieldNameSimilaritySuggestion} from '@sigil/src/common/errors';
import type {
	ComponentSpec,
	GridChild,
	LayoutChild,
	LayoutNode,
} from '@sigil/src/lib/generated/types/specification';

import {VALID_LAYOUT_CHILD_TYPES} from '../constants/constants';
import type {
	RenderComponent,
	RenderGridChild,
	RenderGridLayout,
	RenderHorizontalStackLayout,
	RenderTree,
	RenderVerticalStackLayout,
	SizeConstraints,
} from '../types';

/**
 * Minimum number of columns required for grid layouts
 */
const MIN_GRID_COLUMNS = 1;

/**
 * Context passed through the walk to avoid recalculation and track position
 */
interface WalkContext {
	/**
	 * Available component IDs from spec.root.nodes
	 */
	componentIds: string[];

	/**
	 * Current JSONPath position for error reporting
	 */
	path: string;
}

/**
 * Recursively walks a layout tree and transforms it into a RenderTree
 *
 * Processes layout nodes (stacks and grids) and their children, validating
 * component references and preserving all metadata needed for rendering.
 * Accumulates all errors encountered during traversal.
 *
 * @param spec - Component specification containing layout and component definitions
 * @returns Result containing RenderTree on success, or array of structured errors
 */
export const walkLayout = (spec: ComponentSpec): Result<RenderTree, SpecError[]> => {
	const context: WalkContext = {
		componentIds: Object.keys(spec.root.nodes),
		path: '$.root.layout',
	};

	return walkLayoutNode(spec.root.layout, spec, context);
};

/**
 * Internal recursive function that processes a single layout node
 */
const walkLayoutNode = (
	node: LayoutNode,
	spec: ComponentSpec,
	context: WalkContext
): Result<RenderTree, SpecError[]> => {
	const errors: SpecError[] = [];

	switch (node.type) {
		case 'stack': {
			const bounds = extractBounds(node);
			const children: RenderTree[] = [];

			for (const [index, child] of node.children.entries()) {
				const childContext: WalkContext = {
					...context,
					path: `${context.path}.children[${index}]`,
				};

				const result = processLayoutChild(child, spec, childContext);
				if (isErr(result)) {
					errors.push(...result.error);
				} else {
					children.push(result.data);
				}
			}

			if (errors.length > 0) {
				return err(errors);
			}

			// Discriminate based on direction field
			if (node.direction === 'horizontal') {
				const renderLayout: RenderHorizontalStackLayout = {
					type: 'horizontal-stack',
					spacing: node.spacing,
					vertical_alignment: node.vertical_alignment,
					padding: node.padding,
					children,
					...bounds,
				};
				return ok(renderLayout);
			} else {
				const renderLayout: RenderVerticalStackLayout = {
					type: 'vertical-stack',
					spacing: node.spacing,
					horizontal_alignment: node.horizontal_alignment,
					padding: node.padding,
					children,
					...bounds,
				};
				return ok(renderLayout);
			}
		}

		case 'grid': {
			if (node.columns < MIN_GRID_COLUMNS) {
				return err([{
					code: ERROR_CODES.FIELD_REQUIRED,
					severity: 'error',
					category: 'spec',
					path: `${context.path}.columns`,
					context: {},
					suggestion: `Grid columns must be at least ${MIN_GRID_COLUMNS}, got ${node.columns}`,
				}]);
			}

			const bounds = extractBounds(node);
			const children: RenderGridChild[] = [];

			for (const [index, gridChild] of node.children.entries()) {
				const childContext: WalkContext = {
					...context,
					path: `${context.path}.children[${index}]`,
				};

				const result = processGridChild(gridChild, spec, childContext);
				if (isErr(result)) {
					errors.push(...result.error);
				} else {
					children.push(result.data);
				}
			}

			if (errors.length > 0) {
				return err(errors);
			}

			const renderLayout: RenderGridLayout = {
				type: 'grid',
				columns: node.columns,
				rows: node.rows,
				column_gap: node.column_gap,
				row_gap: node.row_gap,
				padding: node.padding,
				children,
				...bounds,
			};
			return ok(renderLayout);
		}

		default: {
			const _exhaustive: never = node;
			return err([{
				code: ERROR_CODES.UNKNOWN_LAYOUT_TYPE,
				severity: 'error',
				category: 'spec',
				path: context.path,
				context: {
					layoutType: (_exhaustive as {type: string}).type,
					validTypes: ['stack', 'grid'],
				},
			}]);
		}
	}
};

/**
 * Extracts size constraints from a layout node
 *
 * Extracts all optional size constraint properties (width, height, min/max variants)
 * from a layout node into a SizeConstraints object.
 *
 * @param node - Layout node to extract bounds from
 * @returns SizeConstraints object with all size properties
 */
const extractBounds = (node: LayoutNode): SizeConstraints => ({
	width: node.width,
	height: node.height,
	min_width: node.min_width,
	max_width: node.max_width,
	min_height: node.min_height,
	max_height: node.max_height,
});

/**
 * Creates a component placeholder by looking up the component in the spec
 *
 * Validates that the component exists in spec.root.nodes and returns a minimal
 * placeholder with the component type and empty props. Actual props are built
 * later by ComponentBuilder.
 *
 * @param componentId - ID of the component to look up
 * @param spec - Component specification containing component definitions
 * @param context - Walk context with available component IDs and current path
 * @returns Result containing RenderComponent placeholder or structured errors
 */
const createComponentPlaceholder = (
	componentId: string,
	spec: ComponentSpec,
	context: WalkContext
): Result<RenderComponent, SpecError[]> => {
	const componentNode = spec.root.nodes[componentId];

	if (!componentNode) {
		const suggestion = generateFieldNameSimilaritySuggestion(componentId, context.componentIds);

		return err([{
			code: ERROR_CODES.MISSING_COMPONENT,
			severity: 'error',
			category: 'spec',
			path: `${context.path}.component_id`,
			context: {
				componentId,
				availableComponents: context.componentIds,
			},
			suggestion,
		}]);
	}

	// Create minimal placeholder - ComponentBuilder will populate actual props
	switch (componentNode.type) {
		case 'data-table':
			return ok({
				type: 'data-table',
				props: {
					columns: [],
					data: [],
				},
			});

		case 'hierarchy':
			return ok({
				type: 'hierarchy',
				props: {},
			});

		case 'composition':
			return ok({
				type: 'composition',
				props: {},
			});

		case 'text-insight':
			return ok({
				type: 'text-insight',
				props: {},
			});

		default: {
			const _exhaustive: never = componentNode.type;
			return err([{
				code: ERROR_CODES.TYPE_MISMATCH,
				severity: 'error',
				category: 'spec',
				path: context.path,
				context: {
					expected: 'data-table | hierarchy | composition | text-insight',
					actual: _exhaustive,
					nodeId: componentId,
				},
			}]);
		}
	}
};

/**
 * Processes a layout child (either a nested layout or a component reference)
 *
 * Handles the discriminated union of LayoutChild types, recursively processing
 * nested layouts or creating component placeholders.
 *
 * @param child - Layout child to process
 * @param spec - Component specification containing component definitions
 * @param context - Walk context with available component IDs and current path
 * @returns Result containing processed RenderTree or structured errors
 */
const processLayoutChild = (
	child: LayoutChild,
	spec: ComponentSpec,
	context: WalkContext
): Result<RenderTree, SpecError[]> => {
	switch (child.type) {
		case 'layout': {
			return walkLayoutNode(child.node, spec, context);
		}

		case 'component': {
			return createComponentPlaceholder(child.component_id, spec, context);
		}

		default: {
			const _exhaustive: never = child;
			const childType = (_exhaustive as {type: string}).type;
			const suggestion = generateFieldNameSimilaritySuggestion(childType, [...VALID_LAYOUT_CHILD_TYPES]);

			return err([{
				code: ERROR_CODES.UNKNOWN_LAYOUT_CHILD_TYPE,
				severity: 'error',
				category: 'spec',
				path: context.path,
				context: {
					childType,
					validTypes: [...VALID_LAYOUT_CHILD_TYPES],
				},
				suggestion,
			}]);
		}
	}
};

/**
 * Processes a grid child with positioning information
 *
 * Processes the child element via processLayoutChild and extracts grid positioning
 * properties (column_start, row_start, column_span, row_span).
 *
 * @param gridChild - Grid child to process
 * @param spec - Component specification containing component definitions
 * @param context - Walk context with available component IDs and current path
 * @returns Result containing RenderGridChild with positioning or structured errors
 */
const processGridChild = (
	gridChild: GridChild,
	spec: ComponentSpec,
	context: WalkContext
): Result<RenderGridChild, SpecError[]> => {
	const elementContext: WalkContext = {
		...context,
		path: `${context.path}.element`,
	};

	const result = processLayoutChild(gridChild.element, spec, elementContext);

	if (isErr(result)) {
		return result;
	}

	return ok({
		element: result.data,
		column_start: gridChild.column_start,
		row_start: gridChild.row_start,
		column_span: gridChild.column_span,
		row_span: gridChild.row_span,
	});
};
