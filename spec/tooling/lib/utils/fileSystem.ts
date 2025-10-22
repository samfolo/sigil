/**
 * File system utilities for spec scripts
 */

import {readFileSync, writeFileSync, readdirSync, existsSync} from 'fs';

import {ConfigSchema} from '../types';
import type {JsonSchema, Config} from '../types';

/**
 * Load and parse a JSON file
 */
export const loadJson = <T = unknown>(filePath: string): T => {
  try {
    const content = readFileSync(filePath, 'utf-8');
    return JSON.parse(content) as T;
  } catch (error) {
    throw new Error(
      `Failed to load JSON from ${filePath}: ${error instanceof Error ? error.message : String(error)}`
    );
  }
};

/**
 * Load and validate a JSON Schema file
 */
export const loadSchema = (filePath: string): JsonSchema => loadJson<JsonSchema>(filePath);

/**
 * Load and validate the config.json file
 */
export const loadConfig = (filePath: string): Config => {
  const data = loadJson(filePath);
  const result = ConfigSchema.safeParse(data);

  if (!result.success) {
    const errors = result.error.issues
      .map(err => {
        const path = err.path.length > 0 ? err.path.join('.') : 'root';
        return `  - ${path}: ${err.message}`;
      })
      .join('\n');
    throw new Error(`Invalid config.json structure:\n${errors}`);
  }

  return result.data;
};

/**
 * Write JSON to a file with pretty formatting
 */
export const writeJson = (filePath: string, data: unknown): void => {
  try {
    const content = JSON.stringify(data, null, 2) + '\n';
    writeFileSync(filePath, content, 'utf-8');
  } catch (error) {
    throw new Error(
      `Failed to write JSON to ${filePath}: ${error instanceof Error ? error.message : String(error)}`
    );
  }
};

/**
 * List files in a directory matching a pattern
 */
export const listFiles = (dirPath: string, pattern?: RegExp): string[] => {
  try {
    const files = readdirSync(dirPath);
    return pattern ? files.filter(f => pattern.test(f)) : files;
  } catch (error) {
    throw new Error(
      `Failed to read directory ${dirPath}: ${error instanceof Error ? error.message : String(error)}`
    );
  }
};

/**
 * Check if a file exists
 */
export const fileExists = (filePath: string): boolean => existsSync(filePath);
