/**
 * Core renderer constants
 *
 * Centralised configuration values for the renderer
 */

import type {LayoutChild, LayoutNode} from '@sigil/src/lib/generated/types/specification';

/**
 * Maximum length for stringified complex values (objects/arrays) before truncation
 *
 * Prevents UI overflow when displaying nested data structures.
 * Values longer than this are truncated with "..." suffix.
 */
export const MAX_DISPLAY_LENGTH = 100;

/**
 * Default maximum Levenshtein distance for string similarity matching
 *
 * Used when suggesting alternatives for misspelt identifiers.
 * Distance of 2 allows for single character insertions, deletions, or substitutions.
 */
export const DEFAULT_LEVENSHTEIN_DISTANCE = 2;

/**
 * Valid layout types extracted from LayoutNode discriminated union
 */
type LayoutType = LayoutNode['type'];
export const VALID_LAYOUT_TYPES = ['stack', 'grid'] as const satisfies readonly LayoutType[];

/**
 * Valid layout child types extracted from LayoutChild discriminated union
 */
type LayoutChildType = LayoutChild['type'];
export const VALID_LAYOUT_CHILD_TYPES = ['component', 'layout'] as const satisfies readonly LayoutChildType[];
