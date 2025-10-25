/**
 * Type mapping utilities for converting JSON Schema types to Zod schema code
 */

import {extractDefinitionName} from '../schemaUtils';
import type {JsonSchema} from '../types';

/**
 * Maps a JSON Schema type to its Zod equivalent code string
 */
export const mapJsonSchemaTypeToZod = (
  schema: JsonSchema,
  definitionName?: string,
  skipDescription = false
): string => {
  // Handle $ref references
  if (schema.$ref && typeof schema.$ref === 'string') {
    const refName = extractDefinitionName(schema.$ref);
    if (refName) {
      return `${refName}Schema`;
    }
  }

  // Handle const (literal values)
  if (schema.const !== undefined) {
    return mapConstToZod(schema.const);
  }

  // Handle enum
  if (schema.enum && Array.isArray(schema.enum)) {
    return mapEnumToZod(schema.enum);
  }

  // Handle anyOf (could be discriminated union or regular union)
  if (schema.anyOf && Array.isArray(schema.anyOf)) {
    // Note: discriminated unions will be handled separately using config.json
    // This handles non-discriminated unions
    const variants = schema.anyOf.map((variant) => mapJsonSchemaTypeToZod(variant as JsonSchema, undefined, true));
    return `z.union([${variants.join(', ')}])`;
  }

  // Handle oneOf (similar to anyOf)
  if (schema.oneOf && Array.isArray(schema.oneOf)) {
    const variants = schema.oneOf.map((variant) => mapJsonSchemaTypeToZod(variant as JsonSchema, undefined, true));
    return `z.union([${variants.join(', ')}])`;
  }

  // Handle array type
  if (schema.type === 'array') {
    if (schema.items) {
      const itemSchema = mapJsonSchemaTypeToZod(schema.items as JsonSchema, undefined, true);
      return `z.array(${itemSchema})`;
    }
    return 'z.array(z.unknown())';
  }

  // Handle object type
  if (schema.type === 'object' || schema.properties || schema.additionalProperties !== undefined) {
    return mapObjectToZod(schema);
  }

  // Handle primitive types
  if (schema.type) {
    return mapPrimitiveTypeToZod(schema.type as string | string[], schema, skipDescription);
  }

  // Fallback to unknown
  return 'z.unknown()';
};

/**
 * Maps primitive JSON Schema types to Zod
 */
const mapPrimitiveTypeToZod = (type: string | string[], schema: JsonSchema, skipDescription = false): string => {
  // Handle union of primitive types (e.g., ["string", "number", "null"])
  if (Array.isArray(type)) {
    const types = type.map((t) => {
      if (t === 'null') {
        return 'z.null()';
      }
      return mapSinglePrimitiveType(t);
    });
    return `z.union([${types.join(', ')}])`;
  }

  // Handle single type
  const baseSchema = mapSinglePrimitiveType(type);

  // Add description if present and not skipped
  if (!skipDescription && schema.description && typeof schema.description === 'string') {
    const escapedDesc = escapeString(schema.description);
    return `${baseSchema}.describe(${escapedDesc})`;
  }

  return baseSchema;
};

/**
 * Maps a single primitive type to Zod
 */
const mapSinglePrimitiveType = (type: string): string => {
  switch (type) {
    case 'string':
      return 'z.string()';
    case 'number':
    case 'integer':
      return 'z.number()';
    case 'boolean':
      return 'z.boolean()';
    case 'null':
      return 'z.null()';
    case 'array':
      return 'z.array(z.unknown())';
    case 'object':
      return 'z.object({})';
    default:
      return 'z.unknown()';
  }
};

/**
 * Maps an object schema to Zod
 */
const mapObjectToZod = (schema: JsonSchema): string => {
  const properties = schema.properties as Record<string, JsonSchema> | undefined;
  const required = (schema.required as string[]) || [];
  const additionalProperties = schema.additionalProperties;

  // Handle empty objects or additionalProperties without properties
  if (!properties && additionalProperties) {
    if (additionalProperties === true) {
      return 'z.record(z.string(), z.unknown())';
    }
    if (typeof additionalProperties === 'object') {
      const valueSchema = mapJsonSchemaTypeToZod(additionalProperties as JsonSchema);
      return `z.record(z.string(), ${valueSchema})`;
    }
  }

  if (!properties) {
    return 'z.object({})';
  }

  // Build object properties
  const propEntries: string[] = [];
  for (const [key, propSchema] of Object.entries(properties)) {
    const isRequired = required.includes(key);
    // Skip description at this level - it will be added below
    let zodSchema = mapJsonSchemaTypeToZod(propSchema, undefined, true);

    // Add .optional() if not required
    if (!isRequired) {
      zodSchema = `${zodSchema}.optional()`;
    }

    // Add description if present (only once, here)
    if (propSchema.description && typeof propSchema.description === 'string') {
      const escapedDesc = escapeString(propSchema.description);
      zodSchema = `${zodSchema}.describe(${escapedDesc})`;
    }

    propEntries.push(`  ${JSON.stringify(key)}: ${zodSchema}`);
  }

  let objectSchema = `z.object({\n${propEntries.join(',\n')}\n})`;

  // Add .strict() if additionalProperties is false
  if (additionalProperties === false) {
    objectSchema = `${objectSchema}.strict()`;
  }

  return objectSchema;
};

/**
 * Maps a const value to Zod literal
 */
const mapConstToZod = (value: unknown): string => {
  if (typeof value === 'string') {
    return `z.literal(${JSON.stringify(value)})`;
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    return `z.literal(${value})`;
  }
  if (value === null) {
    return 'z.null()';
  }
  return 'z.unknown()';
};

/**
 * Maps an enum to Zod
 */
const mapEnumToZod = (values: unknown[]): string => {
  // Filter to only string values (Zod enum requires strings)
  const stringValues = values.filter((v) => typeof v === 'string') as string[];

  // If we have mixed types or all non-strings, use union of literals
  if (stringValues.length !== values.length) {
    const literals = values.map((v) => mapConstToZod(v));
    return `z.union([${literals.join(', ')}])`;
  }

  // All strings from here on
  if (stringValues.length === 1) {
    return `z.literal(${JSON.stringify(stringValues[0])})`;
  }

  // Multiple strings - use z.enum for better type inference
  const enumValues = stringValues.map((v) => JSON.stringify(v)).join(', ');
  return `z.enum([${enumValues}])`;
};


/**
 * Escapes a string for use in generated code
 */
const escapeString = (str: string): string => {
  // Use template literal for multi-line strings
  if (str.includes('\n')) {
    // Escape in order: backslashes first, then backticks, then dollar signs
    return '`' + str.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$/g, '\\$') + '`';
  }
  return JSON.stringify(str);
};

/**
 * Converts a definition name to a valid TypeScript identifier
 */
export const toSchemaName = (name: string): string => {
  // Remove non-alphanumeric characters except underscores
  const cleaned = name.replace(/[^a-zA-Z0-9_]/g, '');
  // Ensure it starts with a letter
  return cleaned.match(/^[0-9]/) ? `Schema${cleaned}` : `${cleaned}Schema`;
};

/**
 * Converts a schema name to a type name
 */
export const toTypeName = (schemaName: string): string => {
  if (schemaName.endsWith('Schema')) {
    return schemaName.slice(0, -6); // Remove 'Schema' suffix
  }
  return schemaName;
};
