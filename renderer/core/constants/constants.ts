/**
 * Core renderer constants
 *
 * Centralised configuration values for the renderer
 */

import type {LayoutChild} from '@sigil/src/lib/generated/types/specification';

/**
 * Maximum length for stringified complex values (objects/arrays) before truncation
 *
 * Prevents UI overflow when displaying nested data structures.
 * Values longer than this are truncated with "..." suffix.
 */
export const MAX_DISPLAY_LENGTH = 100;

/**
 * Valid layout child types extracted from LayoutChild discriminated union
 */
type LayoutChildType = LayoutChild['type'];
export const VALID_LAYOUT_CHILD_TYPES = ['component', 'layout'] as const satisfies readonly LayoutChildType[];
