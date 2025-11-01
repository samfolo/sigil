/**
 * JSONPath constants and utilities shared across explore tools
 */

/**
 * JSONPath root prefix
 *
 * All JSONPath expressions must start with this prefix
 */
export const JSONPATH_PREFIX = '$';

/**
 * Regular expression to match keys requiring bracket notation
 *
 * Keys with dots, brackets, quotes, or spaces must use bracket notation
 * when building JSONPath expressions.
 *
 * Used when constructing paths from object keys.
 *
 * @example
 * ```typescript
 * SPECIAL_CHARS_REGEX.test('user.name')  // true - has dot
 * SPECIAL_CHARS_REGEX.test('user name')  // true - has space
 * SPECIAL_CHARS_REGEX.test('username')   // false - safe for dot notation
 * ```
 */
export const SPECIAL_CHARS_REGEX = /[.[\]"\s]/;

/**
 * Regular expression to match safe property names in bracket notation
 *
 * Matches ['key'] where key is a valid identifier (letters, digits, underscores,
 * not starting with digit). Used when normalising JSONPath expressions from
 * bracket notation to dot notation.
 *
 * Used when transforming paths returned by jsonpath-plus library.
 *
 * @example
 * ```typescript
 * const path = "$['users'][0]['name']";
 * path.replace(SAFE_PROPERTY_REGEX, '.$1')  // "$.users[0].name"
 * ```
 */
export const SAFE_PROPERTY_REGEX = /\['([a-zA-Z_][a-zA-Z0-9_]*)'\]/g;
