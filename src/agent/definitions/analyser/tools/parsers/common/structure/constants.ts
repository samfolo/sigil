/**
 * Structure analysis limit constants shared across parsers
 */

/**
 * Maximum number of items to extract from collections
 * Used for top-level keys (JSON/YAML), tags (XML), columns (CSV), etc.
 */
export const MAX_STRUCTURE_EXTRACTED_ITEMS = 50;

/**
 * Maximum length for extracted string values
 * Applies to keys, tag names, column values, etc.
 * Longer values are truncated with ellipsis
 */
export const MAX_STRUCTURE_VALUE_LENGTH = 100;

/**
 * Maximum depth to probe when calculating nesting depth
 * Depth calculation is capped at this value to prevent excessive recursion
 * Applies to JSON, YAML, and XML structures
 */
export const MAX_STRUCTURE_PROBING_DEPTH = 20;
