/**
 * Tests for walkLayout utility
 *
 * Tests cover:
 * - Horizontal and vertical stack layouts
 * - Grid layouts with explicit positioning and auto-flow
 * - Nested layouts at various depths
 * - All component types (data-table, hierarchy, composition, text-insight)
 * - Size constraints preservation
 * - Spacing and alignment configuration
 * - Error accumulation for missing components
 * - Levenshtein suggestions for typos
 */

import {describe, expect, it} from 'vitest';

import {ERROR_CODES} from '@sigil/src/common/errors';
import {isErr, isOk} from '@sigil/src/common/errors/result';

import {walkLayout} from './walkLayout';
import {
	createCompositionComponentSpec,
	createHierarchyComponentSpec,
	createMultipleTablesSpec,
	createSingleDataTableSpec,
	createTextInsightComponentSpec,
	DEEPLY_NESTED_LAYOUT,
	GRID_AUTO_FLOW,
	GRID_EXPLICIT_POSITIONING,
	GRID_SINGLE_CHILD,
	GRID_WITH_GAPS,
	HORIZONTAL_STACK_EMPTY,
	HORIZONTAL_STACK_MULTIPLE_CHILDREN,
	HORIZONTAL_STACK_SINGLE_CHILD,
	HORIZONTAL_STACK_WITH_CONSTRAINTS,
	HORIZONTAL_STACK_WITH_STYLING,
	LAYOUT_MISSING_COMPONENT,
	LAYOUT_MULTIPLE_MISSING,
	LAYOUT_TYPO_COMPONENT,
	NESTED_LAYOUT_WITH_ERRORS,
	NESTED_STACK_IN_GRID,
	NESTED_STACK_IN_STACK,
	VERTICAL_STACK_SINGLE_CHILD,
	VERTICAL_STACK_WITH_ALIGNMENT,
} from './walkLayout.fixtures';

describe('walkLayout - horizontal stack layouts', () => {
	it('should process horizontal stack with single component child', () => {
		const spec = createSingleDataTableSpec(HORIZONTAL_STACK_SINGLE_CHILD);
		const result = walkLayout(spec);

		expect(isOk(result)).toBe(true);
		if (!isOk(result)) {
			return;
		}

		expect(result.data.type).toBe('horizontal-stack');
		if (result.data.type !== 'horizontal-stack') {
			return;
		}

		expect(result.data.spacing).toBe(HORIZONTAL_STACK_SINGLE_CHILD.spacing);
		expect(result.data.children).toHaveLength(HORIZONTAL_STACK_SINGLE_CHILD.children.length);
		expect(result.data.children.at(0)?.type).toBe('data-table');
	});

	it('should process horizontal stack with multiple component children', () => {
		const spec = createMultipleTablesSpec(HORIZONTAL_STACK_MULTIPLE_CHILDREN);
		const result = walkLayout(spec);

		expect(isOk(result)).toBe(true);
		if (!isOk(result)) {
			return;
		}

		expect(result.data.type).toBe('horizontal-stack');
		if (result.data.type !== 'horizontal-stack') {
			return;
		}

		expect(result.data.children).toHaveLength(HORIZONTAL_STACK_MULTIPLE_CHILDREN.children.length);
		expect(result.data.spacing).toBe(HORIZONTAL_STACK_MULTIPLE_CHILDREN.spacing);
		expect(result.data.children.at(0)?.type).toBe('data-table');
		expect(result.data.children.at(1)?.type).toBe('data-table');
		expect(result.data.children.at(2)?.type).toBe('data-table');
	});

	it('should preserve size constraints for horizontal stack', () => {
		const spec = createSingleDataTableSpec(HORIZONTAL_STACK_WITH_CONSTRAINTS);
		const result = walkLayout(spec);

		expect(isOk(result)).toBe(true);
		if (!isOk(result)) {
			return;
		}

		expect(result.data.type).toBe('horizontal-stack');
		if (result.data.type !== 'horizontal-stack') {
			return;
		}

		expect(result.data.width).toEqual(HORIZONTAL_STACK_WITH_CONSTRAINTS.width);
		expect(result.data.height).toEqual(HORIZONTAL_STACK_WITH_CONSTRAINTS.height);
		expect(result.data.min_width).toEqual(HORIZONTAL_STACK_WITH_CONSTRAINTS.min_width);
		expect(result.data.max_width).toEqual(HORIZONTAL_STACK_WITH_CONSTRAINTS.max_width);
	});

	it('should preserve alignment and padding for horizontal stack', () => {
		const spec = createSingleDataTableSpec(HORIZONTAL_STACK_WITH_STYLING);
		const result = walkLayout(spec);

		expect(isOk(result)).toBe(true);
		if (!isOk(result)) {
			return;
		}

		expect(result.data.type).toBe('horizontal-stack');
		if (result.data.type !== 'horizontal-stack') {
			return;
		}

		expect(result.data.vertical_alignment).toBe(HORIZONTAL_STACK_WITH_STYLING.vertical_alignment);
		expect(result.data.padding).toEqual(HORIZONTAL_STACK_WITH_STYLING.padding);
	});

	it('should process empty horizontal stack', () => {
		const spec = createSingleDataTableSpec(HORIZONTAL_STACK_EMPTY);
		const result = walkLayout(spec);

		expect(isOk(result)).toBe(true);
		if (!isOk(result)) {
			return;
		}

		expect(result.data.type).toBe('horizontal-stack');
		if (result.data.type !== 'horizontal-stack') {
			return;
		}

		expect(result.data.children).toHaveLength(HORIZONTAL_STACK_EMPTY.children.length);
	});
});

describe('walkLayout - vertical stack layouts', () => {
	it('should process vertical stack with single component child', () => {
		const spec = createSingleDataTableSpec(VERTICAL_STACK_SINGLE_CHILD);
		const result = walkLayout(spec);

		expect(isOk(result)).toBe(true);
		if (!isOk(result)) {
			return;
		}

		expect(result.data.type).toBe('vertical-stack');
		if (result.data.type !== 'vertical-stack') {
			return;
		}

		expect(result.data.spacing).toBe(VERTICAL_STACK_SINGLE_CHILD.spacing);
		expect(result.data.children).toHaveLength(VERTICAL_STACK_SINGLE_CHILD.children.length);
	});

	it('should preserve horizontal alignment for vertical stack', () => {
		const spec = createSingleDataTableSpec(VERTICAL_STACK_WITH_ALIGNMENT);
		const result = walkLayout(spec);

		expect(isOk(result)).toBe(true);
		if (!isOk(result)) {
			return;
		}

		expect(result.data.type).toBe('vertical-stack');
		if (result.data.type !== 'vertical-stack') {
			return;
		}

		expect(result.data.horizontal_alignment).toBe(VERTICAL_STACK_WITH_ALIGNMENT.horizontal_alignment);
	});
});

describe('walkLayout - grid layouts', () => {
	it('should process grid with single component child', () => {
		const spec = createSingleDataTableSpec(GRID_SINGLE_CHILD);
		const result = walkLayout(spec);

		expect(isOk(result)).toBe(true);
		if (!isOk(result)) {
			return;
		}

		expect(result.data.type).toBe('grid');
		if (result.data.type !== 'grid') {
			return;
		}

		expect(result.data.columns).toBe(GRID_SINGLE_CHILD.columns);
		expect(result.data.children).toHaveLength(GRID_SINGLE_CHILD.children.length);
		expect(result.data.children.at(0)?.element.type).toBe('data-table');
	});

	it('should preserve grid positioning for explicitly positioned children', () => {
		const spec = createMultipleTablesSpec(GRID_EXPLICIT_POSITIONING);
		const result = walkLayout(spec);

		expect(isOk(result)).toBe(true);
		if (!isOk(result)) {
			return;
		}

		expect(result.data.type).toBe('grid');
		if (result.data.type !== 'grid') {
			return;
		}

		const firstChild = result.data.children.at(0);
		const firstFixture = GRID_EXPLICIT_POSITIONING.children.at(0);

		expect(firstChild?.column_start).toBe(firstFixture?.column_start);
		expect(firstChild?.row_start).toBe(firstFixture?.row_start);
		expect(firstChild?.column_span).toBe(firstFixture?.column_span);
		expect(firstChild?.row_span).toBe(firstFixture?.row_span);

		const secondChild = result.data.children.at(1);
		const secondFixture = GRID_EXPLICIT_POSITIONING.children.at(1);

		expect(secondChild?.column_start).toBe(secondFixture?.column_start);
		expect(secondChild?.row_start).toBe(secondFixture?.row_start);
	});

	it('should support auto-flow grid children with omitted positioning', () => {
		const spec = createMultipleTablesSpec(GRID_AUTO_FLOW);
		const result = walkLayout(spec);

		expect(isOk(result)).toBe(true);
		if (!isOk(result)) {
			return;
		}

		expect(result.data.type).toBe('grid');
		if (result.data.type !== 'grid') {
			return;
		}

		const firstChild = result.data.children.at(0);
		const secondChild = result.data.children.at(1);
		const firstFixture = GRID_AUTO_FLOW.children.at(0);
		const secondFixture = GRID_AUTO_FLOW.children.at(1);

		expect(firstChild?.column_start).toBe(firstFixture?.column_start);
		expect(firstChild?.row_start).toBe(firstFixture?.row_start);
		expect(secondChild?.column_start).toBe(secondFixture?.column_start);
		expect(secondChild?.row_start).toBe(secondFixture?.row_start);
	});

	it('should preserve grid gaps and padding', () => {
		const spec = createSingleDataTableSpec(GRID_WITH_GAPS);
		const result = walkLayout(spec);

		expect(isOk(result)).toBe(true);
		if (!isOk(result)) {
			return;
		}

		expect(result.data.type).toBe('grid');
		if (result.data.type !== 'grid') {
			return;
		}

		expect(result.data.column_gap).toBe(GRID_WITH_GAPS.column_gap);
		expect(result.data.row_gap).toBe(GRID_WITH_GAPS.row_gap);
		expect(result.data.padding).toBe(GRID_WITH_GAPS.padding);
	});
});

describe('walkLayout - nested layouts', () => {
	it('should process stack containing stack', () => {
		const spec = createMultipleTablesSpec(NESTED_STACK_IN_STACK);
		const result = walkLayout(spec);

		expect(isOk(result)).toBe(true);
		if (!isOk(result)) {
			return;
		}

		expect(result.data.type).toBe('vertical-stack');
		if (result.data.type !== 'vertical-stack') {
			return;
		}

		expect(result.data.children).toHaveLength(NESTED_STACK_IN_STACK.children.length);

		const innerStack = result.data.children.at(0);
		expect(innerStack?.type).toBe('horizontal-stack');
		if (innerStack?.type !== 'horizontal-stack') {
			return;
		}

		const innerFixture = NESTED_STACK_IN_STACK.children.at(0);
		if (innerFixture?.type !== 'layout') {
			return;
		}

		expect(innerStack.spacing).toBe(innerFixture.node.spacing);
		expect(innerStack.children).toHaveLength(innerFixture.node.children.length);
	});

	it('should process grid containing stack', () => {
		const spec = createMultipleTablesSpec(NESTED_STACK_IN_GRID);
		const result = walkLayout(spec);

		expect(isOk(result)).toBe(true);
		if (!isOk(result)) {
			return;
		}

		expect(result.data.type).toBe('grid');
		if (result.data.type !== 'grid') {
			return;
		}

		const firstChild = result.data.children.at(0);
		expect(firstChild?.element.type).toBe('vertical-stack');
	});

	it('should process deeply nested layouts (3 levels)', () => {
		const spec = createSingleDataTableSpec(DEEPLY_NESTED_LAYOUT);
		const result = walkLayout(spec);

		expect(isOk(result)).toBe(true);
		if (!isOk(result)) {
			return;
		}

		expect(result.data.type).toBe('vertical-stack');
		if (result.data.type !== 'vertical-stack') {
			return;
		}

		const level2 = result.data.children.at(0);
		expect(level2?.type).toBe('grid');
		if (level2?.type !== 'grid') {
			return;
		}

		const level3 = level2.children.at(0)?.element;
		expect(level3?.type).toBe('horizontal-stack');
		if (level3?.type !== 'horizontal-stack') {
			return;
		}

		expect(level3.children.at(0)?.type).toBe('data-table');
	});
});

describe('walkLayout - component types', () => {
	it('should create placeholder for data-table component', () => {
		const spec = createSingleDataTableSpec(HORIZONTAL_STACK_SINGLE_CHILD);
		const result = walkLayout(spec);

		expect(isOk(result)).toBe(true);
		if (!isOk(result)) {
			return;
		}

		expect(result.data.type).toBe('horizontal-stack');
		if (result.data.type !== 'horizontal-stack') {
			return;
		}

		const component = result.data.children.at(0);
		expect(component?.type).toBe('data-table');
		if (component?.type !== 'data-table') {
			return;
		}

		expect(component.props.columns).toEqual([]);
		expect(component.props.data).toEqual([]);
	});

	it('should create placeholder for hierarchy component', () => {
		const layout = {
			...HORIZONTAL_STACK_SINGLE_CHILD,
			children: [{type: 'component' as const, component_id: 'hierarchy-1'}],
		};
		const spec = createHierarchyComponentSpec(layout);
		const result = walkLayout(spec);

		expect(isOk(result)).toBe(true);
		if (!isOk(result)) {
			return;
		}

		expect(result.data.type).toBe('horizontal-stack');
		if (result.data.type !== 'horizontal-stack') {
			return;
		}

		const component = result.data.children.at(0);
		expect(component?.type).toBe('hierarchy');
		if (component?.type !== 'hierarchy') {
			return;
		}

		expect(component.props).toEqual({});
	});

	it('should create placeholder for composition component', () => {
		const layout = {
			...HORIZONTAL_STACK_SINGLE_CHILD,
			children: [{type: 'component' as const, component_id: 'composition-1'}],
		};
		const spec = createCompositionComponentSpec(layout);
		const result = walkLayout(spec);

		expect(isOk(result)).toBe(true);
		if (!isOk(result)) {
			return;
		}

		expect(result.data.type).toBe('horizontal-stack');
		if (result.data.type !== 'horizontal-stack') {
			return;
		}

		const component = result.data.children.at(0);
		expect(component?.type).toBe('composition');
		if (component?.type !== 'composition') {
			return;
		}

		expect(component.props).toEqual({});
	});

	it('should create placeholder for text-insight component', () => {
		const layout = {
			...HORIZONTAL_STACK_SINGLE_CHILD,
			children: [{type: 'component' as const, component_id: 'insight-1'}],
		};
		const spec = createTextInsightComponentSpec(layout);
		const result = walkLayout(spec);

		expect(isOk(result)).toBe(true);
		if (!isOk(result)) {
			return;
		}

		expect(result.data.type).toBe('horizontal-stack');
		if (result.data.type !== 'horizontal-stack') {
			return;
		}

		const component = result.data.children.at(0);
		expect(component?.type).toBe('text-insight');
		if (component?.type !== 'text-insight') {
			return;
		}

		expect(component.props).toEqual({});
	});
});

describe('walkLayout - error handling', () => {
	it('should return error for missing component reference', () => {
		const spec = createSingleDataTableSpec(LAYOUT_MISSING_COMPONENT);
		const result = walkLayout(spec);

		expect(isErr(result)).toBe(true);
		if (!isErr(result)) {
			return;
		}

		const firstChild = LAYOUT_MISSING_COMPONENT.children.at(0);
		expect(firstChild?.type).toBe('component');
		if (firstChild?.type !== 'component') {
			return;
		}

		expect(result.error).toHaveLength(1);
		expect(result.error.at(0)?.code).toBe(ERROR_CODES.MISSING_COMPONENT);
		expect(result.error.at(0)?.context.componentId).toBe(firstChild.component_id);
		expect(result.error.at(0)?.path).toBe('$.root.layout.children[0].component_id');
	});

	it('should provide Levenshtein suggestion for typo in component ID', () => {
		const spec = createSingleDataTableSpec(LAYOUT_TYPO_COMPONENT);
		const result = walkLayout(spec);

		expect(isErr(result)).toBe(true);
		if (!isErr(result)) {
			return;
		}

		const firstChild = LAYOUT_TYPO_COMPONENT.children.at(0);
		expect(firstChild?.type).toBe('component');
		if (firstChild?.type !== 'component') {
			return;
		}

		expect(result.error.at(0)?.suggestion).toBeDefined();
		expect(result.error.at(0)?.context.componentId).toBe(firstChild.component_id);
	});

	it('should accumulate errors for multiple missing components', () => {
		const spec = createSingleDataTableSpec(LAYOUT_MULTIPLE_MISSING);
		const result = walkLayout(spec);

		expect(isErr(result)).toBe(true);
		if (!isErr(result)) {
			return;
		}

		const firstChild = LAYOUT_MULTIPLE_MISSING.children.at(0);
		const thirdChild = LAYOUT_MULTIPLE_MISSING.children.at(2);

		expect(firstChild?.type).toBe('component');
		expect(thirdChild?.type).toBe('component');
		if (firstChild?.type !== 'component' || thirdChild?.type !== 'component') {
			return;
		}

		expect(result.error).toHaveLength(2);
		expect(result.error.at(0)?.context.componentId).toBe(firstChild.component_id);
		expect(result.error.at(1)?.context.componentId).toBe(thirdChild.component_id);
	});

	it('should accumulate errors from nested layouts', () => {
		const spec = createSingleDataTableSpec(NESTED_LAYOUT_WITH_ERRORS);
		const result = walkLayout(spec);

		expect(isErr(result)).toBe(true);
		if (!isErr(result)) {
			return;
		}

		expect(result.error.length).toBeGreaterThanOrEqual(2);

		const firstChild = NESTED_LAYOUT_WITH_ERRORS.children.at(0);
		const secondChild = NESTED_LAYOUT_WITH_ERRORS.children.at(1);

		expect(firstChild?.type).toBe('layout');
		expect(secondChild?.type).toBe('component');
		if (firstChild?.type !== 'layout' || secondChild?.type !== 'component') {
			return;
		}

		const innerChild = firstChild.node.children.at(0);
		expect(innerChild?.type).toBe('component');
		if (innerChild?.type !== 'component') {
			return;
		}

		const componentIds = result.error.map((error) => error.context.componentId);
		expect(componentIds).toContain(innerChild.component_id);
		expect(componentIds).toContain(secondChild.component_id);
	});
});
