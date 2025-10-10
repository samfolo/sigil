#!/usr/bin/env tsx

/**
 * Bundle JSON Schema fragments into a single specification file
 *
 * This script reads all schema fragments from spec/fragments/ and combines them
 * into a single bundled schema at spec/specification.schema.json, resolving all
 * cross-file $ref references.
 */

import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

// Get the project root directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = resolve(__dirname, '../..');
const specDir = resolve(projectRoot, 'spec');
const fragmentsDir = resolve(specDir, 'fragments');

interface JsonSchema {
  $schema?: string;
  $id?: string;
  $ref?: string;
  definitions?: Record<string, any>;
  [key: string]: any;
}

interface FragmentCache {
  [key: string]: JsonSchema;
}

/**
 * Load a JSON schema file
 */
function loadSchema(filePath: string): JsonSchema {
  const content = readFileSync(filePath, 'utf-8');
  return JSON.parse(content);
}

/**
 * Resolve a relative file reference to an absolute path
 */
function resolveFragmentPath(fromPath: string, ref: string): string {
  // Extract file path from reference (e.g., "./primitives.schema.json#/definitions/DataType" -> "./primitives.schema.json")
  const [filePath] = ref.split('#');

  if (!filePath.startsWith('./')) {
    return filePath; // Not a relative file reference
  }

  // Resolve relative to the fragment directory
  return resolve(fragmentsDir, filePath.substring(2));
}

/**
 * Recursively resolve all $ref in a schema object
 */
function resolveRefs(
  obj: any,
  cache: FragmentCache,
  definitions: Record<string, any>,
  currentFile: string
): any {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => resolveRefs(item, cache, definitions, currentFile));
  }

  // If this object has a $ref
  if (obj.$ref && typeof obj.$ref === 'string') {
    const ref = obj.$ref;

    // If it's a cross-file reference (starts with ./)
    if (ref.startsWith('./')) {
      const [filePath, jsonPath] = ref.split('#');
      const absolutePath = resolveFragmentPath(currentFile, ref);

      // Load the referenced fragment if not already cached
      if (!cache[absolutePath]) {
        cache[absolutePath] = loadSchema(absolutePath);
      }

      const fragment = cache[absolutePath];

      // Extract the definition name from the JSON path
      // e.g., "/definitions/DataType" -> "DataType"
      const match = jsonPath?.match(/\/definitions\/(.+)$/);
      if (match && fragment.definitions) {
        const defName = match[1];
        const definition = fragment.definitions[defName];

        if (definition) {
          // Add the definition to the bundled definitions
          if (!definitions[defName]) {
            definitions[defName] = resolveRefs(definition, cache, definitions, absolutePath);
          }

          // Return a local reference
          return { $ref: `#/definitions/${defName}` };
        }
      }
    }

    // For local references (#/definitions/...), keep them as-is
    if (ref.startsWith('#/')) {
      return obj;
    }
  }

  // Recursively process all properties
  const result: any = {};
  for (const [key, value] of Object.entries(obj)) {
    if (key === 'definitions') {
      // Handle definitions specially - merge them
      result[key] = value;
    } else if (key !== '$id') {
      // Skip $id when resolving (we'll set a new one for the bundled schema)
      result[key] = resolveRefs(value, cache, definitions, currentFile);
    }
  }

  return result;
}

/**
 * Bundle all schema fragments into a single schema
 */
function bundleSchemas(): JsonSchema {
  const cache: FragmentCache = {};
  const bundledDefinitions: Record<string, any> = {};

  // Load the core schema (entry point)
  const coreSchemaPath = resolve(fragmentsDir, 'core.schema.json');
  const coreSchema = loadSchema(coreSchemaPath);
  cache[coreSchemaPath] = coreSchema;

  // Resolve all refs starting from the core schema
  const resolvedCore = resolveRefs(coreSchema, cache, bundledDefinitions, coreSchemaPath);

  // Merge all fragment definitions into bundled definitions
  for (const [path, fragment] of Object.entries(cache)) {
    if (fragment.definitions) {
      for (const [defName, definition] of Object.entries(fragment.definitions)) {
        if (!bundledDefinitions[defName]) {
          bundledDefinitions[defName] = resolveRefs(definition, cache, bundledDefinitions, path);
        }
      }
    }
  }

  // Create the bundled schema
  const bundled: JsonSchema = {
    $ref: resolvedCore.$ref || '#/definitions/ComponentSpec',
    $schema: 'http://json-schema.org/draft-07/schema#',
    definitions: bundledDefinitions
  };

  return bundled;
}

/**
 * Main execution
 */
function main() {
  console.log('🔄 Bundling schema fragments...');

  try {
    const bundled = bundleSchemas();

    const outputPath = resolve(specDir, 'specification.schema.json');
    writeFileSync(outputPath, JSON.stringify(bundled, null, 2) + '\n', 'utf-8');

    console.log('✅ Schema bundled successfully!');
    console.log(`   Output: ${outputPath}`);
    console.log(`   Definitions: ${Object.keys(bundled.definitions || {}).length}`);
  } catch (error) {
    console.error('❌ Error bundling schema:', error);
    process.exit(1);
  }
}

main();
