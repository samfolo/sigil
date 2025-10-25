#!/usr/bin/env tsx

/**
 * Generate Zod schemas from JSON Schema specification
 *
 * This script reads the bundled JSON Schema and config.json, then generates
 * TypeScript code with Zod schemas and inferred types. Discriminated unions
 * are handled specially using the metadata from config.json.
 */

import {resolve, dirname} from 'path';
import {fileURLToPath} from 'url';

import {runCodegen} from './codegen';

// Get the spec and project directories
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const specDir = resolve(__dirname, '../..');
const projectRoot = resolve(specDir, '..');

/**
 * Main execution
 */
const main = () => {
  try {
    runCodegen(specDir, projectRoot);
  } catch (error) {
    console.error('\n× Error generating Zod schemas:', error);
    if (error instanceof Error) {
      console.error(error.stack);
    }
    process.exit(1);
  }
};

main();
