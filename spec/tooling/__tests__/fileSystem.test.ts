import {resolve} from 'path';

import {describe, it, expect} from 'vitest';

import {
  loadJson,
  loadSchema,
  loadConfig,
  fileExists,
} from '../lib/utils/fileSystem';

const FIXTURES_DIR = resolve(__dirname, 'fixtures');

describe('fileSystem', () => {
  describe('loadJson', () => {
    it('should load and parse valid JSON file', () => {
      const filePath = resolve(FIXTURES_DIR, 'testSchema.schema.json');
      const data = loadJson(filePath);
      expect(data).toHaveProperty('$schema');
      expect(data).toHaveProperty('definitions');
    });

    it('should throw error for non-existent file', () => {
      const filePath = resolve(FIXTURES_DIR, 'nonexistent.json');
      expect(() => loadJson(filePath)).toThrow();
    });
  });

  describe('loadSchema', () => {
    it('should load JSON schema file', () => {
      const filePath = resolve(FIXTURES_DIR, 'testSchema.schema.json');
      const schema = loadSchema(filePath);
      expect(schema).toHaveProperty('$schema');
      expect(schema).toHaveProperty('$id', 'test-schema');
      expect(schema.definitions).toBeDefined();
    });
  });

  describe('loadConfig', () => {
    it('should load and validate valid config', () => {
      const filePath = resolve(FIXTURES_DIR, 'testConfig.json');
      const config = loadConfig(filePath);
      expect(config.version).toBe('1.0.0');
      expect(config.entryPoint).toBe('testSchema.json');
      expect(config.fragments).toHaveProperty('test');
      expect(config.discriminatedUnions).toEqual([]);
    });

    it('should throw error for invalid config structure', () => {
      // Create a temporary invalid config in memory and test
      const filePath = resolve(FIXTURES_DIR, 'testSchema.schema.json'); // Using schema as invalid config
      expect(() => loadConfig(filePath)).toThrow(/Invalid config.json structure/);
    });
  });

  describe('fileExists', () => {
    it('should return true for existing file', () => {
      const filePath = resolve(FIXTURES_DIR, 'testSchema.schema.json');
      expect(fileExists(filePath)).toBe(true);
    });

    it('should return false for non-existent file', () => {
      const filePath = resolve(FIXTURES_DIR, 'nonexistent.json');
      expect(fileExists(filePath)).toBe(false);
    });
  });
});
