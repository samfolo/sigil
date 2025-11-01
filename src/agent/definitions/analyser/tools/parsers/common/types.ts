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
export interface ParserState<Metadata extends BaseParserStructureMetadata = BaseParserStructureMetadata> {
	/**
	 * Raw input data to be parsed
	 */
	raw: string;
	/**
	 * Metadata about successfully parsed data, including which tool parsed it
	 */
	structureMetadata?: Metadata;
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

/**
 * Indicates failure to parse or validate data
 *
 * Shared failure type used by all parsers
 */
export interface ParserFailure {
	/**
	 * Indicates parsing or validation failure
	 */
	valid: false;

	/**
	 * Error message describing the failure
	 */
	error: string;
}

/**
 * Generic parser structure metadata details
 *
 * Discriminated union on the `valid` field:
 * - `{valid: false}` indicates parsing or validation failure
 * - `{valid: true}` indicates successful parse with metadata
 *
 * @template Metadata - Metadata type specific to the parser
 */
export type ParserStructureMetadataDetails<Metadata> =
	| ParserFailure
	| {
			valid: true;
			metadata: Metadata;
	  };

/**
 * Generic parser result including parsed data
 *
 * Used as the return type for parser implementations.
 * Includes parsedData which is stored separately in state.run.parsedData
 *
 * @template Data - Parsed data type (e.g., unknown[][] for CSV, unknown for JSON/YAML/XML)
 * @template Metadata - Metadata type specific to the parser
 */
export type ParserResult<Data, Metadata> =
	| ParserFailure
	| {
			valid: true;
			parsedData: Data;
			metadata: Metadata;
	  };
