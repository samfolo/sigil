/**
 * Layout utilities for traversing and extracting layout nodes
 */

import {distance} from 'fastest-levenshtein';

import {ERROR_CODES, err, ok, type Result, type SpecError} from '@sigil/src/common/errors';
import type {LayoutChild, LayoutNode} from '@sigil/src/lib/generated/types/specification';

import {DEFAULT_LEVENSHTEIN_DISTANCE, VALID_LAYOUT_TYPES} from '../constants/constants';

/**
 * Extracts the first child from a layout node
 *
 * Handles different layout types (stack, grid) and returns the first child element.
 * Returns structured errors if the layout has no children or is an unknown type.
 * Errors are formatted for LLM feedback with actionable context and suggestions.
 *
 * @param layout - Layout node to extract from
 * @returns Result containing the first child element, or array of structured errors
 */
export const extractFirstLayoutChild = (layout: LayoutNode): Result<LayoutChild, SpecError[]> => {
	switch (layout.type) {
		case 'stack': {
			const child = layout.children.at(0);
			if (!child) {
				return err([{
					code: ERROR_CODES.EMPTY_LAYOUT,
					severity: 'error',
					category: 'spec',
					path: '$.root.layout',
					context: {layoutType: 'stack'}
				}]);
			}
			return ok(child);
		}

		case 'grid': {
			const gridCell = layout.children.at(0);
			if (!gridCell) {
				return err([{
					code: ERROR_CODES.EMPTY_LAYOUT,
					severity: 'error',
					category: 'spec',
					path: '$.root.layout',
					context: {layoutType: 'grid'}
				}]);
			}
			return ok(gridCell.element);
		}

		default: {
			const _exhaustive: never = layout;
			const layoutType = (_exhaustive as {type: string}).type;
			const closest = VALID_LAYOUT_TYPES.find(
				t => distance(layoutType.toLowerCase(), t.toLowerCase()) <= DEFAULT_LEVENSHTEIN_DISTANCE
			);
			return err([{
				code: ERROR_CODES.UNKNOWN_LAYOUT_TYPE,
				severity: 'error',
				category: 'spec',
				path: '$.root.layout',
				context: {layoutType, validTypes: [...VALID_LAYOUT_TYPES]},
				suggestion: closest ? `Did you mean '${closest}'?` : undefined
			}]);
		}
	}
};
