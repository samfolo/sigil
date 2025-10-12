/**
 * Layout utilities for traversing and extracting layout nodes
 */

import {err, ok, type Result} from '@sigil/src/common/errors/result';
import type {LayoutChild, LayoutNode} from '@sigil/src/lib/generated/types/specification';

/**
 * Extracts the first child from a layout node
 *
 * Handles different layout types (stack, grid) and returns the first child element.
 * Returns an error if the layout has no children or is an unknown type.
 *
 * @param layout - Layout node to extract from
 * @returns Result containing the first child element, or error message
 */
export const extractFirstLayoutChild = (layout: LayoutNode): Result<LayoutChild, string> => {
	switch (layout.type) {
		case 'stack': {
			const child = layout.children.at(0);
			if (!child) {
				return err('Stack layout has no children');
			}
			return ok(child);
		}

		case 'grid': {
			const gridCell = layout.children.at(0);
			if (!gridCell) {
				return err('Grid layout has no children');
			}
			return ok(gridCell.element);
		}

		default: {
			const _exhaustive: never = layout;
			return err(`Unknown layout type: ${(_exhaustive as {type: string}).type}`);
		}
	}
};
