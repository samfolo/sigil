/**
 * Context type definitions for spec errors
 *
 * Each error code has a corresponding context type that provides
 * structured information about the specific error condition.
 */

/**
 * Context for MISSING_COMPONENT error
 */
export interface MissingComponentContext {
  componentId?: string;
  availableComponents?: string[];
}

/**
 * Context for MISSING_ARRAY_PROPERTY error
 */
export interface MissingArrayPropertyContext {
  attemptedProperties?: string[];
  objectKeys?: string[];
}

/**
 * Context for UNKNOWN_LAYOUT_TYPE error
 */
export interface UnknownLayoutTypeContext {
  layoutType?: string;
  validTypes?: string[];
}

/**
 * Context for UNKNOWN_LAYOUT_CHILD_TYPE error
 */
export interface UnknownLayoutChildTypeContext {
  childType?: string;
  validTypes?: string[];
}

/**
 * Context for INVALID_ACCESSOR error
 */
export interface InvalidAccessorContext {
  accessor?: string;
  reason?: string;
}

/**
 * Context for EXPECTED_SINGLE_VALUE error
 */
export interface ExpectedSingleValueContext {
  accessor?: string;
  resultCount?: number;
}

/**
 * Context for FIELD_REQUIRED error
 */
export interface FieldRequiredContext {
  operation?: string;
  availableFields?: string[];
}

/**
 * Context for EMPTY_LAYOUT error
 */
export interface EmptyLayoutContext {
  layoutType?: string;
}

/**
 * Context for NOT_ARRAY error
 */
export interface NotArrayContext {
  actualType?: string;
  value?: unknown;
}

/**
 * Context for QUERY_ERROR error
 */
export interface QueryErrorContext {
  jsonPath?: string;
  reason?: string;
  dataType?: string;
}

/**
 * Context for TYPE_MISMATCH error
 */
export interface TypeMismatchContext {
  expected?: string;
  actual?: string;
  nodeId?: string;
}
