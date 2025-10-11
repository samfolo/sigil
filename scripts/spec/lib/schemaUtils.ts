/**
 * JSON Schema manipulation utilities
 */

import {REF_PATTERNS} from './constants';
import type {JsonSchema} from './types';

/**
 * Recursively resolve all cross-file $ref to local references
 * This is a pure function with no side effects
 *
 * @param obj - The object to process
 * @param isRoot - Whether this is the root level of a fragment (where $id and title should be stripped)
 */
export const resolveRefs = (obj: unknown, isRoot = false): unknown => {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => resolveRefs(item, false));
  }

  // If this object has a $ref to another file
  const objWithRef = obj as {$ref?: unknown };
  if (objWithRef.$ref && typeof objWithRef.$ref === 'string' && objWithRef.$ref.startsWith(REF_PATTERNS.CROSS_FILE_PREFIX)) {
    const [_filePath, jsonPath] = objWithRef.$ref.split('#');

    // Extract the definition name from the JSON path
    // e.g., "/definitions/DataType" -> "DataType"
    const match = jsonPath?.match(/\/definitions\/(.+)$/);
    if (match) {
      const defName = match[1];
      // Return a local reference
      return {$ref: `${REF_PATTERNS.LOCAL_DEFINITIONS_PREFIX}${defName}`};
    }
  }

  // Recursively process all properties
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    // Only skip $id and title at the root level of fragments (schema metadata)
    // Preserve them in nested properties where they are actual data fields
    if (isRoot && (key === '$id' || key === 'title')) {
      continue;
    } else if (key === 'description' && typeof value === 'string') {
      result[key] = value;
    } else {
      result[key] = resolveRefs(value, false);
    }
  }

  return result;
};

/**
 * Generic schema tree traversal utility
 * Recursively visits all objects in a schema tree and calls a visitor function
 *
 * @param obj - The object to traverse
 * @param visitor - Function called for each non-primitive object encountered
 */
export const traverseSchema = (obj: unknown, visitor: (obj: Record<string, unknown>) => void): void => {
  if (!obj || typeof obj !== 'object') {
    return;
  }

  if (Array.isArray(obj)) {
    obj.forEach(item => traverseSchema(item, visitor));
    return;
  }

  const record = obj as Record<string, unknown>;
  visitor(record);

  // Recursively traverse all values
  Object.values(record).forEach(value => traverseSchema(value, visitor));
};

/**
 * Recursively collect all $ref values from a schema object
 * This is a pure function with no side effects
 */
export const collectRefs = (obj: unknown): Set<string> => {
  const refs = new Set<string>();

  traverseSchema(obj, (record) => {
    if (record.$ref && typeof record.$ref === 'string') {
      refs.add(record.$ref);
    }
  });

  return refs;
};

/**
 * Extract definition name from a local $ref path (#/definitions/Name)
 * Returns null if the ref doesn't match the expected format
 */
export const extractLocalDefinitionName = (ref: string): string | null => {
  if (ref.startsWith(REF_PATTERNS.LOCAL_DEFINITIONS_PREFIX)) {
    return ref.substring(REF_PATTERNS.LOCAL_DEFINITIONS_PREFIX.length);
  }
  return null;
};

/**
 * Extract definition name from a cross-file $ref path (./file.json#/definitions/Name)
 * Returns null if the ref doesn't match the expected format
 */
export const extractCrossFileDefinitionName = (ref: string): string | null => {
  const match = ref.match(/\.\/[^#]+#\/definitions\/(.+)$/);
  return match ? match[1] : null;
};

/**
 * Extract definition name from any $ref path (local or cross-file)
 * Returns null if the ref doesn't match the expected format
 */
export const extractDefinitionName = (ref: string): string | null => {
  // Try local ref first
  const localName = extractLocalDefinitionName(ref);
  if (localName) {
    return localName;
  }

  // Try cross-file ref
  return extractCrossFileDefinitionName(ref);
};

/**
 * Check if a ref is a local reference (starts with #/)
 */
export const isLocalRef = (ref: string): boolean => {
  return ref.startsWith(REF_PATTERNS.LOCAL_PREFIX);
};

/**
 * Check if a ref is a cross-file reference (starts with ./)
 */
export const isCrossFileRef = (ref: string): boolean => {
  return ref.startsWith(REF_PATTERNS.CROSS_FILE_PREFIX);
};

/**
 * Parse a cross-file reference into file path and JSON path components
 */
interface CrossFileRefParts {
  filePath: string;
  jsonPath: string;
}

export const parseCrossFileRef = (ref: string): CrossFileRefParts | null => {
  if (!isCrossFileRef(ref)) {
    return null;
  }

  const parts = ref.split('#');
  return {
    filePath: parts[0],
    jsonPath: parts[1] || '',
  };
};

/**
 * Merge definitions from multiple schemas into a single definitions object
 * Returns a map of definition names to their schemas and a list of conflicts
 */
interface MergeDefinitionsResult {
  definitions: Record<string, unknown>;
  conflicts: string[];
}

export const mergeDefinitions = (
  schemas: Map<string, JsonSchema>
): MergeDefinitionsResult => {
  const definitions: Record<string, unknown> = {};
  const conflicts: string[] = [];

  for (const [fragmentName, schema] of schemas.entries()) {
    if (!schema.definitions) {
      continue;
    }

    for (const [defName, definition] of Object.entries(schema.definitions)) {
      if (definitions[defName]) {
        conflicts.push(`Definition "${defName}" from "${fragmentName}" conflicts with existing definition`);
        continue;
      }

      definitions[defName] = resolveRefs(definition);
    }
  }

  return {definitions, conflicts};
};

/**
 * Validate that a definition exists in a schema
 */
export const hasDefinition = (schema: JsonSchema, definitionName: string): boolean => {
  return Boolean(schema.definitions && definitionName in schema.definitions);
};

/**
 * Get a definition from a schema by name
 */
export const getDefinition = (schema: JsonSchema, definitionName: string): unknown | null => {
  if (!schema.definitions || !(definitionName in schema.definitions)) {
    return null;
  }
  return schema.definitions[definitionName];
};
