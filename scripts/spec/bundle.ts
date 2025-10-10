#!/usr/bin/env tsx

/**
 * Bundle JSON Schema fragments into a single specification file
 *
 * This script reads all schema fragments from spec/fragments/ and combines them
 * into a single bundled schema at spec/specification.schema.json, resolving all
 * cross-file $ref references.
 */

import { readFileSync, writeFileSync, readdirSync } from 'fs';
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
  definitions?: Record<string, unknown>;
  [key: string]: unknown;
}

/**
 * Load a JSON schema file
 */
const loadSchema = (filePath: string): JsonSchema => {
  const content = readFileSync(filePath, 'utf-8');
  return JSON.parse(content);
};

/**
 * Recursively resolve all cross-file $ref to local references
 */
const resolveRefs = (obj: unknown): unknown => {
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
 * Bundle all schema fragments into a single schema
 */
const bundleSchemas = (): JsonSchema => {
  const bundledDefinitions: Record<string, unknown> = {};

  // Read all fragment files
  const fragmentFiles = readdirSync(fragmentsDir).filter(f => f.endsWith('.schema.json'));

  console.log(`Found ${fragmentFiles.length} fragment files`);

  // Load all fragments and collect all definitions
  for (const file of fragmentFiles) {
    const filePath = resolve(fragmentsDir, file);
    const fragment = loadSchema(filePath);

    console.log(`Processing ${file}...`);

    if (fragment.definitions) {
      const defCount = Object.keys(fragment.definitions).length;
      console.log(`  Found ${defCount} definitions`);

      // Add all definitions from this fragment
      for (const [defName, definition] of Object.entries(fragment.definitions)) {
        if (bundledDefinitions[defName]) {
          console.warn(`  Warning: Definition "${defName}" already exists, skipping duplicate`);
          continue;
        }

        // Resolve any cross-file $refs in this definition
        bundledDefinitions[defName] = resolveRefs(definition);
      }
    }
  }

  // Create the bundled schema
  const bundled: JsonSchema = {
    $ref: '#/definitions/ComponentSpec',
    $schema: 'http://json-schema.org/draft-07/schema#',
    definitions: bundledDefinitions
  };

  return bundled;
};

/**
 * Main execution
 */
const main = () => {
  console.log('🔄 Bundling schema fragments...\n');

  try {
    const bundled = bundleSchemas();

    const outputPath = resolve(specDir, 'specification.schema.json');
    writeFileSync(outputPath, JSON.stringify(bundled, null, 2) + '\n', 'utf-8');

    console.log('\n✅ Schema bundled successfully!');
    console.log(`   Output: ${outputPath}`);
    console.log(`   Total definitions: ${Object.keys(bundled.definitions || {}).length}`);
  } catch (error) {
    console.error('❌ Error bundling schema:', error);
    process.exit(1);
  }
};

main();
