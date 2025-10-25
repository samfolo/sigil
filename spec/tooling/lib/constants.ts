/**
 * Constants used across spec scripts
 */

/**
 * JSON Schema reference patterns and prefixes
 */
export const REF_PATTERNS = {
  /** Prefix for local references within the same schema file */
  LOCAL_PREFIX: '#/',
  /** Prefix for cross-file references to other schema files */
  CROSS_FILE_PREFIX: './',
  /** Path segment for definitions in JSON Schema */
  DEFINITIONS_PATH: '/definitions/',
  /** Full prefix for local definition references */
  LOCAL_DEFINITIONS_PREFIX: '#/definitions/',
} as const;

/**
 * JSON Schema metadata property names
 */
export const SCHEMA_PROPS = {
  /** Schema version identifier */
  SCHEMA: '$schema',
  /** Schema unique identifier */
  ID: '$id',
  /** Reference to another schema or definition */
  REF: '$ref',
  /** Schema definitions container */
  DEFINITIONS: 'definitions',
  /** Schema title */
  TITLE: 'title',
  /** Schema description */
  DESCRIPTION: 'description',
} as const;
