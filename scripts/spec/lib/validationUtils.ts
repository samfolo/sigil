/**
 * Validation utilities for spec scripts
 */

import { resolve } from 'path';
import type { Config, JsonSchema } from './types.ts';
import { loadSchema, fileExists } from './fileSystem.ts';
import { collectRefs, extractDefinitionName, isLocalRef, isCrossFileRef, parseCrossFileRef, hasDefinition } from './schemaUtils.ts';
import type { Logger } from './logger.ts';

/**
 * Validate that all fragments exist and are valid JSON
 */
export const validateFragmentsExist = (config: Config, specDir: string, logger: Logger): boolean => {
  logger.info('Validating fragment files...');
  let valid = true;

  for (const [name, fragment] of Object.entries(config.fragments)) {
    const fragmentPath = resolve(specDir, fragment.path);

    if (!fileExists(fragmentPath)) {
      logger.error(`Fragment "${name}" not found: ${fragmentPath}`);
      valid = false;
      continue;
    }

    try {
      const schema = loadSchema(fragmentPath);

      // Check for $schema property
      if (!schema.$schema) {
        logger.warn(`Fragment "${name}" missing $schema property`);
      }

      // Check for $id property
      if (!schema.$id) {
        logger.warn(`Fragment "${name}" missing $id property`);
      }

      logger.success(`Fragment "${name}" is valid JSON`);
    } catch (error) {
      logger.error(`Fragment "${name}" failed to parse: ${error instanceof Error ? error.message : String(error)}`);
      valid = false;
    }
  }

  return valid;
};

/**
 * Validate that all $ref references can be resolved
 */
export const validateReferences = (config: Config, specDir: string, logger: Logger): boolean => {
  logger.info('Validating $ref references...');
  let valid = true;

  // Load all fragments
  const fragments = new Map<string, JsonSchema>();
  for (const [name, fragment] of Object.entries(config.fragments)) {
    const fragmentPath = resolve(specDir, fragment.path);
    try {
      const schema = loadSchema(fragmentPath);
      fragments.set(name, schema);
    } catch {
      // Already reported in validateFragmentsExist
      continue;
    }
  }

  // Check each fragment's references
  for (const [name, _fragment] of Object.entries(config.fragments)) {
    const schema = fragments.get(name);
    if (!schema) {continue;}

    const refs = collectRefs(schema);

    for (const ref of refs) {
      // Skip local references
      if (isLocalRef(ref)) {
        const defName = extractDefinitionName(ref);
        if (defName && !hasDefinition(schema, defName)) {
          logger.error(`Fragment "${name}": Local reference not found: ${ref}`);
          valid = false;
        }
        continue;
      }

      // Check cross-file references
      if (isCrossFileRef(ref)) {
        const parsed = parseCrossFileRef(ref);
        if (!parsed) {
          logger.error(`Fragment "${name}": Invalid cross-file reference: ${ref}`);
          valid = false;
          continue;
        }

        const { filePath, jsonPath } = parsed;
        const fileName = filePath.substring(2); // Remove './'

        // Find the fragment with this filename
        const targetFragment = Object.entries(config.fragments).find(
          ([_, f]) => f.path.endsWith(fileName)
        );

        if (!targetFragment) {
          logger.error(`Fragment "${name}": Referenced file not found: ${filePath}`);
          valid = false;
          continue;
        }

        const [targetName] = targetFragment;
        const targetSchema = fragments.get(targetName);

        if (jsonPath) {
          const defName = extractDefinitionName(`#${jsonPath}`);
          if (defName && targetSchema && !hasDefinition(targetSchema, defName)) {
            logger.error(`Fragment "${name}": Referenced definition not found in "${targetName}": ${defName}`);
            valid = false;
          }
        }
      }
    }
  }

  if (valid) {
    logger.success('All $ref references are valid');
  }

  return valid;
};

/**
 * Validate discriminated unions
 */
export const validateDiscriminatedUnions = (config: Config, specDir: string, logger: Logger): boolean => {
  logger.info('Validating discriminated unions...');
  let valid = true;

  // Load all fragments
  const fragments = new Map<string, JsonSchema>();
  for (const [_name, fragment] of Object.entries(config.fragments)) {
    const fragmentPath = resolve(specDir, fragment.path);
    try {
      const schema = loadSchema(fragmentPath);
      fragments.set(fragment.path.split('/').pop()!, schema);
    } catch {
      // Already reported in validateFragmentsExist
      continue;
    }
  }

  for (const union of config.discriminatedUnions) {
    const schema = fragments.get(union.location);
    if (!schema) {
      logger.error(`Discriminated union "${union.name}": Location not found: ${union.location}`);
      valid = false;
      continue;
    }

    // Check if the union type exists
    if (!hasDefinition(schema, union.name)) {
      logger.error(`Discriminated union "${union.name}": Definition not found in ${union.location}`);
      valid = false;
      continue;
    }

    const unionDef = schema.definitions?.[union.name] as { discriminator?: { propertyName?: string } } | undefined;

    // Check if it has a discriminator
    if (!unionDef?.discriminator) {
      logger.warn(`Discriminated union "${union.name}": Missing discriminator property in schema`);
    } else if (unionDef.discriminator.propertyName !== union.discriminator) {
      logger.error(`Discriminated union "${union.name}": Discriminator mismatch. Config: "${union.discriminator}", Schema: "${unionDef.discriminator.propertyName}"`);
      valid = false;
    }

    // Check all variants exist
    for (const variant of union.variants) {
      if (!hasDefinition(schema, variant.type)) {
        logger.error(`Discriminated union "${union.name}": Variant "${variant.type}" not found in ${union.location}`);
        valid = false;
      }
    }
  }

  if (valid) {
    logger.success(`All ${config.discriminatedUnions.length} discriminated unions are valid`);
  }

  return valid;
};
