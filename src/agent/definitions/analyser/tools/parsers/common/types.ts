/**
 * Common types for parser tools
 */

/**
 * Base contract for parser structure metadata
 *
 * All parser-specific metadata types must extend this interface.
 */
export interface BaseParserStructureMetadata {
	/**
	 * Tool name that successfully parsed the data
	 */
	tool: string;
	/**
	 * Parser-specific structure details
	 */
	details: unknown;
}

/**
 * State type for parser tools
 *
 * Generic over metadata type to allow composition at the agent level.
 * Agents compose unions of the specific parser metadata types they use.
 *
 * @template T - Parser metadata type (or union of metadata types)
 *
 * @example
 * ```typescript
 * // Agent uses only CSV and JSON parsers
 * type MyAgentMetadata = ParseCSVStructureMetadata | ParseJSONStructureMetadata;
 * type MyAgentState = ParserState<MyAgentMetadata>;
 * ```
 */
export interface ParserState<T extends BaseParserStructureMetadata = BaseParserStructureMetadata> {
	/**
	 * Raw input data to be parsed
	 */
	raw: string;
	/**
	 * Metadata about successfully parsed data, including which tool parsed it
	 */
	structureMetadata?: T;
	/**
	 * Parsed data structure (populated after successful parsing)
	 *
	 * Contains the in-memory JavaScript representation of the parsed data:
	 * - JSON: Result of JSON.parse
	 * - CSV: Two-dimensional array from Papa.parse
	 * - YAML: Result from js-yaml load
	 * - XML: JSON representation from fast-xml-parser
	 */
	parsedData?: unknown;
}
