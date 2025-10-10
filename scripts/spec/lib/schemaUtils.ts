/**
 * JSON Schema manipulation utilities
 */

import type { JsonSchema } from './types';

/**
 * Recursively resolve all cross-file $ref to local references
 * This is a pure function with no side effects
 */
export const resolveRefs = (obj: unknown): unknown => {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => resolveRefs(item));
  }

  // If this object has a $ref to another file
  const objWithRef = obj as { $ref?: unknown };
  if (objWithRef.$ref && typeof objWithRef.$ref === 'string' && objWithRef.$ref.startsWith('./')) {
    const [_filePath, jsonPath] = objWithRef.$ref.split('#');

    // Extract the definition name from the JSON path
    // e.g., "/definitions/DataType" -> "DataType"
    const match = jsonPath?.match(/\/definitions\/(.+)$/);
    if (match) {
      const defName = match[1];
      // Return a local reference
      return { $ref: `#/definitions/${defName}` };
    }
  }

  // Recursively process all properties
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    // Skip $id when copying (we'll set a new one for the bundled schema)
    if (key !== '$id' && key !== 'title' && key !== 'description') {
      result[key] = resolveRefs(value);
    } else if (key === 'description' && typeof value === 'string') {
      // Keep description at the definition level
      result[key] = value;
    }
  }

  return result;
};

/**
 * Recursively collect all $ref values from a schema object
 * This is a pure function with no side effects
 */
export const collectRefs = (obj: unknown, refs: Set<string> = new Set()): Set<string> => {
  if (obj === null || typeof obj !== 'object') {
    return refs;
  }

  if (Array.isArray(obj)) {
    obj.forEach(item => collectRefs(item, refs));
    return refs;
  }

  const objWithRef = obj as { $ref?: unknown };
  if (objWithRef.$ref && typeof objWithRef.$ref === 'string') {
    refs.add(objWithRef.$ref);
  }

  for (const value of Object.values(obj)) {
    collectRefs(value, refs);
  }

  return refs;
};

/**
 * Extract definition name from a $ref path
 * Returns null if the ref doesn't match the expected format
 */
export const extractDefinitionName = (ref: string): string | null => {
  if (ref.startsWith('#/definitions/')) {
    return ref.substring('#/definitions/'.length);
  }

  if (ref.includes('#/definitions/')) {
    const match = ref.match(/#\/definitions\/(.+)$/);
    return match ? match[1] : null;
  }

  return null;
};

/**
 * Check if a ref is a local reference (starts with #/)
 */
export const isLocalRef = (ref: string): boolean => {
  return ref.startsWith('#/');
};

/**
 * Check if a ref is a cross-file reference (starts with ./)
 */
export const isCrossFileRef = (ref: string): boolean => {
  return ref.startsWith('./');
};

/**
 * Parse a cross-file reference into file path and JSON path components
 */
export const parseCrossFileRef = (ref: string): { filePath: string; jsonPath: string } | null => {
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
export const mergeDefinitions = (
  schemas: Map<string, JsonSchema>
): { definitions: Record<string, unknown>; conflicts: string[] } => {
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

  return { definitions, conflicts };
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
