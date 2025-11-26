/**
 * XML parsing configuration constants
 *
 * Defines the structure of parsed XML data. Use these constants when
 * accessing XML attributes and text content in JSONPath expressions.
 *
 * Attributes are grouped under a single key to avoid JSONPath reserved
 * character conflicts (the `@` symbol is reserved in JSONPath).
 */

/**
 * Key under which XML attributes are grouped
 *
 * XML attributes are collected into a nested object rather than
 * prefixed inline, avoiding JSONPath reserved character conflicts.
 *
 * @example
 * ```xml
 * <item id="123" status="active"/>
 * ```
 * Becomes:
 * ```json
 * {"item": {"__attrs": {"id": "123", "status": "active"}}}
 * ```
 * Access via: `$.item.__attrs.id`
 */
export const ATTRIBUTES_GROUP_NAME = '__attrs';

/**
 * Key for XML text content
 *
 * @example
 * ```xml
 * <item>Text content here</item>
 * ```
 * Becomes:
 * ```json
 * {"item": {"__text": "Text content here"}}
 * ```
 * Access via: `$.item.__text`
 */
export const TEXT_NODE_NAME = '__text';

/**
 * Sentinel value used as rootElement when multiple root elements exist
 */
export const FRAGMENT_SENTINEL = '(fragment)';
