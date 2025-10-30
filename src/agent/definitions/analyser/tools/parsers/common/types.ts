/**
 * Common types for parser tools
 */

/**
 * State type for parser tools
 *
 * Parsers read from `raw` and write parsed results to `parsed`.
 */
export interface ParserState {
	raw: string;
	parsed?: unknown;
}
