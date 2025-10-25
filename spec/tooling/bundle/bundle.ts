/**
 * Bundle JSON Schema fragments into a single specification file
 *
 * This module provides the core bundling functionality for combining schema fragments.
 */

import {resolve} from 'path';

import {mergeDefinitions} from '../lib/schemaUtils';
import type {JsonSchema} from '../lib/types';
import {listFiles, loadSchema} from '../lib/utils/fileSystem';

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
  const {definitions, conflicts} = mergeDefinitions(fragments);

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
