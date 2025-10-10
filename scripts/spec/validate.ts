#!/usr/bin/env tsx

/**
 * Validate JSON Schema fragments
 *
 * This script validates:
 * 1. All fragments are valid JSON
 * 2. All $ref references can be resolved
 * 3. Schema structure matches config.json
 * 4. All discriminated unions are properly defined
 */

import { readFileSync, readdirSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

// Get the project root directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = resolve(__dirname, '../..');
const specDir = resolve(projectRoot, 'spec');
const fragmentsDir = resolve(specDir, 'fragments');
const configPath = resolve(specDir, 'config.json');

interface JsonSchema {
  $schema?: string;
  $id?: string;
  $ref?: string;
  definitions?: Record<string, any>;
  [key: string]: any;
}

interface Config {
  version: string;
  entryPoint: string;
  fragments: Record<string, {
    path: string;
    description: string;
    dependencies: string[];
  }>;
  discriminatedUnions: Array<{
    name: string;
    location: string;
    discriminator: string;
    variants: Array<{
      value: string;
      type: string;
    }>;
  }>;
}

let errorCount = 0;

function error(message: string) {
  console.error(`❌ ${message}`);
  errorCount++;
}

function warn(message: string) {
  console.warn(`⚠️  ${message}`);
}

function success(message: string) {
  console.log(`✅ ${message}`);
}

function info(message: string) {
  console.log(`ℹ️  ${message}`);
}

/**
 * Load and parse JSON file
 */
function loadJson<T>(filePath: string, label: string): T | null {
  try {
    const content = readFileSync(filePath, 'utf-8');
    return JSON.parse(content) as T;
  } catch (err) {
    error(`Failed to parse ${label}: ${filePath}`);
    if (err instanceof Error) {
      console.error(`   ${err.message}`);
    }
    return null;
  }
}

/**
 * Validate that all fragments exist and are valid JSON
 */
function validateFragmentsExist(config: Config): boolean {
  info('Validating fragment files...');
  let valid = true;

  for (const [name, fragment] of Object.entries(config.fragments)) {
    const fragmentPath = resolve(specDir, fragment.path);

    if (!existsSync(fragmentPath)) {
      error(`Fragment "${name}" not found: ${fragmentPath}`);
      valid = false;
      continue;
    }

    const schema = loadJson<JsonSchema>(fragmentPath, `fragment "${name}"`);
    if (!schema) {
      valid = false;
      continue;
    }

    // Check for $schema property
    if (!schema.$schema) {
      warn(`Fragment "${name}" missing $schema property`);
    }

    // Check for $id property
    if (!schema.$id) {
      warn(`Fragment "${name}" missing $id property`);
    }

    success(`Fragment "${name}" is valid JSON`);
  }

  return valid;
}

/**
 * Collect all $ref values from a schema object
 */
function collectRefs(obj: any, refs: Set<string> = new Set()): Set<string> {
  if (obj === null || typeof obj !== 'object') {
    return refs;
  }

  if (Array.isArray(obj)) {
    obj.forEach(item => collectRefs(item, refs));
    return refs;
  }

  if (obj.$ref && typeof obj.$ref === 'string') {
    refs.add(obj.$ref);
  }

  for (const value of Object.values(obj)) {
    collectRefs(value, refs);
  }

  return refs;
}

/**
 * Validate that all $ref references can be resolved
 */
function validateReferences(config: Config): boolean {
  info('Validating $ref references...');
  let valid = true;

  // Load all fragments
  const fragments = new Map<string, JsonSchema>();
  for (const [name, fragment] of Object.entries(config.fragments)) {
    const fragmentPath = resolve(specDir, fragment.path);
    const schema = loadJson<JsonSchema>(fragmentPath, `fragment "${name}"`);
    if (schema) {
      fragments.set(name, schema);
    }
  }

  // Check each fragment's references
  for (const [name, fragment] of Object.entries(config.fragments)) {
    const schema = fragments.get(name);
    if (!schema) continue;

    const refs = collectRefs(schema);

    for (const ref of refs) {
      // Skip local references
      if (ref.startsWith('#/')) {
        const match = ref.match(/^#\/definitions\/(.+)$/);
        if (match) {
          const defName = match[1];
          if (!schema.definitions?.[defName]) {
            error(`Fragment "${name}": Local reference not found: ${ref}`);
            valid = false;
          }
        }
        continue;
      }

      // Check cross-file references
      if (ref.startsWith('./')) {
        const [filePath, jsonPath] = ref.split('#');
        const fileName = filePath.substring(2); // Remove './'

        // Find the fragment with this filename
        const targetFragment = Object.entries(config.fragments).find(
          ([_, f]) => f.path.endsWith(fileName)
        );

        if (!targetFragment) {
          error(`Fragment "${name}": Referenced file not found: ${filePath}`);
          valid = false;
          continue;
        }

        const [targetName] = targetFragment;
        const targetSchema = fragments.get(targetName);

        if (jsonPath) {
          const match = jsonPath.match(/^\/definitions\/(.+)$/);
          if (match) {
            const defName = match[1];
            if (!targetSchema?.definitions?.[defName]) {
              error(`Fragment "${name}": Referenced definition not found in "${targetName}": ${defName}`);
              valid = false;
            }
          }
        }
      }
    }
  }

  if (valid) {
    success('All $ref references are valid');
  }

  return valid;
}

/**
 * Validate discriminated unions
 */
function validateDiscriminatedUnions(config: Config): boolean {
  info('Validating discriminated unions...');
  let valid = true;

  // Load all fragments
  const fragments = new Map<string, JsonSchema>();
  for (const [name, fragment] of Object.entries(config.fragments)) {
    const fragmentPath = resolve(specDir, fragment.path);
    const schema = loadJson<JsonSchema>(fragmentPath, `fragment "${name}"`);
    if (schema) {
      fragments.set(fragment.path.split('/').pop()!, schema);
    }
  }

  for (const union of config.discriminatedUnions) {
    const schema = fragments.get(union.location);
    if (!schema) {
      error(`Discriminated union "${union.name}": Location not found: ${union.location}`);
      valid = false;
      continue;
    }

    // Check if the union type exists
    const unionDef = schema.definitions?.[union.name];
    if (!unionDef) {
      error(`Discriminated union "${union.name}": Definition not found in ${union.location}`);
      valid = false;
      continue;
    }

    // Check if it has a discriminator
    if (!unionDef.discriminator) {
      warn(`Discriminated union "${union.name}": Missing discriminator property in schema`);
    } else if (unionDef.discriminator.propertyName !== union.discriminator) {
      error(`Discriminated union "${union.name}": Discriminator mismatch. Config: "${union.discriminator}", Schema: "${unionDef.discriminator.propertyName}"`);
      valid = false;
    }

    // Check all variants exist
    for (const variant of union.variants) {
      const variantDef = schema.definitions?.[variant.type];
      if (!variantDef) {
        error(`Discriminated union "${union.name}": Variant "${variant.type}" not found in ${union.location}`);
        valid = false;
      }
    }
  }

  if (valid) {
    success(`All ${config.discriminatedUnions.length} discriminated unions are valid`);
  }

  return valid;
}

/**
 * Main validation
 */
function main() {
  console.log('🔍 Validating Sigil specification...\n');

  // Load config
  const config = loadJson<Config>(configPath, 'config.json');
  if (!config) {
    process.exit(1);
  }

  success('config.json is valid JSON\n');

  // Run validations
  const fragmentsValid = validateFragmentsExist(config);
  console.log('');

  const referencesValid = validateReferences(config);
  console.log('');

  const unionsValid = validateDiscriminatedUnions(config);
  console.log('');

  // Summary
  if (errorCount === 0) {
    console.log('✅ All validations passed!');
    process.exit(0);
  } else {
    console.log(`❌ Validation failed with ${errorCount} error(s)`);
    process.exit(1);
  }
}

main();
