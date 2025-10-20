/**
 * Error codes for spec processing failures
 *
 * These error codes identify specific failure scenarios during spec validation
 * and execution. They are designed to be reported to LLMs with sufficient context
 * for automated error analysis and resolution.
 *
 * Codes are organised by priority and category based on frequency and impact.
 */

/**
 * Standard error codes for spec processing failures
 *
 * Each code represents a distinct, actionable error condition that may occur
 * during spec validation or execution.
 */
export const ERROR_CODES = {
	// HIGH Priority: Reference errors
	// Occur when spec references components or properties that don't exist
	MISSING_COMPONENT: 'MISSING_COMPONENT',
	MISSING_ARRAY_PROPERTY: 'MISSING_ARRAY_PROPERTY',
	UNKNOWN_LAYOUT_TYPE: 'UNKNOWN_LAYOUT_TYPE',
	UNKNOWN_LAYOUT_CHILD_TYPE: 'UNKNOWN_LAYOUT_CHILD_TYPE',

	// HIGH Priority: Path/Accessor errors
	// Occur when data accessors or paths are invalid or produce unexpected results
	INVALID_ACCESSOR: 'INVALID_ACCESSOR',
	EXPECTED_SINGLE_VALUE: 'EXPECTED_SINGLE_VALUE',

	// MEDIUM Priority: Requirement errors
	// Occur when required fields or configurations are missing
	FIELD_REQUIRED: 'FIELD_REQUIRED',
	EMPTY_LAYOUT: 'EMPTY_LAYOUT',

	// MEDIUM Priority: Type errors
	// Occur when data types don't match expectations
	NOT_ARRAY: 'NOT_ARRAY',
	QUERY_ERROR: 'QUERY_ERROR',
	TYPE_MISMATCH: 'TYPE_MISMATCH',
} as const;
