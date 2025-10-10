#!/usr/bin/env tsx

/**
 * Bundle JSON Schema fragments into a single specification file
 *
 * This script reads all schema fragments from spec/fragments/ and combines them
 * into a single bundled schema at spec/specification.schema.json, resolving all
 * cross-file $ref references.
 */

import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { loadSchema, writeJson, listFiles } from './lib/fileSystem';
import { mergeDefinitions } from './lib/schemaUtils';
import type { JsonSchema } from './lib/types';

// Get the project root directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = resolve(__dirname, '../..');
const specDir = resolve(projectRoot, 'spec');
const fragmentsDir = resolve(specDir, 'fragments');

/**
 * Bundle all schema fragments into a single schema
 */
export const bundleSchemas = (fragmentsDirPath: string): JsonSchema => {
  // Read all fragment files
  const fragmentFiles = listFiles(fragmentsDirPath, /\.schema\.json$/);

  console.log(`Found ${fragmentFiles.length} fragment files`);

  // Load all fragments
  const fragments = new Map<string, JsonSchema>();
  for (const file of fragmentFiles) {
    const filePath = resolve(fragmentsDirPath, file);
    const fragment = loadSchema(filePath);

    console.log(`Processing ${file}...`);

    if (fragment.definitions) {
      const defCount = Object.keys(fragment.definitions).length;
      console.log(`  Found ${defCount} definitions`);
    }

    fragments.set(file, fragment);
  }

  // Merge all definitions
  const { definitions, conflicts } = mergeDefinitions(fragments);

  // Log conflicts as warnings
  for (const conflict of conflicts) {
    console.warn(`  ⚠️  Warning: ${conflict}`);
  }

  // Create the bundled schema
  const bundled: JsonSchema = {
    $ref: '#/definitions/ComponentSpec',
    $schema: 'http://json-schema.org/draft-07/schema#',
    definitions,
  };

  return bundled;
};

/**
 * Main execution
 */
const main = () => {
  console.log('🔄 Bundling schema fragments...\n');

  try {
    const bundled = bundleSchemas(fragmentsDir);

    const outputPath = resolve(specDir, 'specification.schema.json');
    writeJson(outputPath, bundled);

    console.log('\n✅ Schema bundled successfully!');
    console.log(`   Output: ${outputPath}`);
    console.log(`   Total definitions: ${Object.keys(bundled.definitions || {}).length}`);
  } catch (error) {
    console.error('❌ Error bundling schema:', error);
    process.exit(1);
  }
};

main();
