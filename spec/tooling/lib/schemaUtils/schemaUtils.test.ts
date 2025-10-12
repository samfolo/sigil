import {describe, it, expect} from 'vitest';

import {
  resolveRefs,
  collectRefs,
  extractDefinitionName,
  isLocalRef,
  isCrossFileRef,
  parseCrossFileRef,
  mergeDefinitions,
  hasDefinition,
  getDefinition,
} from './schemaUtils';
import type {JsonSchema} from '../types';

describe('schemaUtils', () => {
  describe('resolveRefs', () => {
    it('should resolve cross-file refs to local refs', () => {
      const input = {
        $ref: './other.json#/definitions/Type',
      };

      const result = resolveRefs(input);
      expect(result).toEqual({
        $ref: '#/definitions/Type',
      });
    });

    it('should leave local refs unchanged', () => {
      const input = {
        $ref: '#/definitions/Type',
      };

      const result = resolveRefs(input);
      expect(result).toEqual({
        $ref: '#/definitions/Type',
      });
    });

    it('should recursively resolve refs in nested objects', () => {
      const input = {
        properties: {
          field: {
            $ref: './other.json#/definitions/Type',
          },
        },
      };

      const result = resolveRefs(input);
      expect(result).toEqual({
        properties: {
          field: {
            $ref: '#/definitions/Type',
          },
        },
      });
    });

    it('should recursively resolve refs in arrays', () => {
      const input = {
        items: [
          {$ref: './other.json#/definitions/Type1'},
          {$ref: './other.json#/definitions/Type2'},
        ],
      };

      const result = resolveRefs(input);
      expect(result).toEqual({
        items: [
          {$ref: '#/definitions/Type1'},
          {$ref: '#/definitions/Type2'},
        ],
      });
    });

    it('should preserve descriptions', () => {
      const input = {
        description: 'Test description',
        type: 'string',
      };

      const result = resolveRefs(input);
      expect(result).toEqual({
        description: 'Test description',
        type: 'string',
      });
    });

    it('should only remove $id and title when isRoot=true', () => {
      const input = {
        $id: 'test-id',
        title: 'Test Title',
        type: 'string',
      };

      // Without isRoot=true, $id and title should be preserved
      const resultDefault = resolveRefs(input);
      expect(resultDefault).toEqual(input);

      // With isRoot=true, $id and title should be removed
      const resultRoot = resolveRefs(input, true);
      expect(resultRoot).toEqual({
        type: 'string',
      });
    });

    it('should handle null and primitives', () => {
      expect(resolveRefs(null)).toBe(null);
      expect(resolveRefs('string')).toBe('string');
      expect(resolveRefs(123)).toBe(123);
      expect(resolveRefs(true)).toBe(true);
    });
  });

  describe('collectRefs', () => {
    it('should collect all $ref values', () => {
      const input = {
        properties: {
          field1: {$ref: '#/definitions/Type1'},
          field2: {$ref: './other.json#/definitions/Type2'},
        },
      };

      const refs = collectRefs(input);
      expect(refs).toEqual(new Set([
        '#/definitions/Type1',
        './other.json#/definitions/Type2',
      ]));
    });

    it('should collect refs from nested structures', () => {
      const input = {
        items: [
          {$ref: '#/definitions/Type1'},
          {
            properties: {
              nested: {$ref: '#/definitions/Type2'},
            },
          },
        ],
      };

      const refs = collectRefs(input);
      expect(refs).toEqual(new Set([
        '#/definitions/Type1',
        '#/definitions/Type2',
      ]));
    });

    it('should return empty set for objects without refs', () => {
      const input = {
        type: 'string',
        properties: {},
      };

      const refs = collectRefs(input);
      expect(refs.size).toBe(0);
    });

    it('should handle null and primitives', () => {
      expect(collectRefs(null).size).toBe(0);
      expect(collectRefs('string').size).toBe(0);
      expect(collectRefs(123).size).toBe(0);
    });
  });

  describe('extractDefinitionName', () => {
    it('should extract name from local ref', () => {
      expect(extractDefinitionName('#/definitions/Type')).toBe('Type');
    });

    it('should extract name from cross-file ref', () => {
      expect(extractDefinitionName('./other.json#/definitions/Type')).toBe('Type');
    });

    it('should return null for invalid refs', () => {
      expect(extractDefinitionName('#/invalid')).toBeNull();
      expect(extractDefinitionName('not-a-ref')).toBeNull();
    });
  });

  describe('isLocalRef', () => {
    it('should identify local refs', () => {
      expect(isLocalRef('#/definitions/Type')).toBe(true);
      expect(isLocalRef('#/')).toBe(true);
    });

    it('should reject non-local refs', () => {
      expect(isLocalRef('./other.json#/definitions/Type')).toBe(false);
      expect(isLocalRef('not-a-ref')).toBe(false);
    });
  });

  describe('isCrossFileRef', () => {
    it('should identify cross-file refs', () => {
      expect(isCrossFileRef('./other.json#/definitions/Type')).toBe(true);
      expect(isCrossFileRef('./file.json')).toBe(true);
    });

    it('should reject non-cross-file refs', () => {
      expect(isCrossFileRef('#/definitions/Type')).toBe(false);
      expect(isCrossFileRef('not-a-ref')).toBe(false);
    });
  });

  describe('parseCrossFileRef', () => {
    it('should parse cross-file ref with json path', () => {
      const result = parseCrossFileRef('./other.json#/definitions/Type');
      expect(result).toEqual({
        filePath: './other.json',
        jsonPath: '/definitions/Type',
      });
    });

    it('should parse cross-file ref without json path', () => {
      const result = parseCrossFileRef('./other.json');
      expect(result).toEqual({
        filePath: './other.json',
        jsonPath: '',
      });
    });

    it('should return null for non-cross-file refs', () => {
      expect(parseCrossFileRef('#/definitions/Type')).toBeNull();
    });
  });

  describe('mergeDefinitions', () => {
    it('should merge definitions from multiple schemas', () => {
      const schemas = new Map<string, JsonSchema>([
        ['schema1', {
          definitions: {
            Type1: {type: 'string'},
          },
        }],
        ['schema2', {
          definitions: {
            Type2: {type: 'number'},
          },
        }],
      ]);

      const {definitions, conflicts} = mergeDefinitions(schemas);
      expect(definitions).toHaveProperty('Type1');
      expect(definitions).toHaveProperty('Type2');
      expect(conflicts).toHaveLength(0);
    });

    it('should detect definition conflicts', () => {
      const schemas = new Map<string, JsonSchema>([
        ['schema1', {
          definitions: {
            Type1: {type: 'string'},
          },
        }],
        ['schema2', {
          definitions: {
            Type1: {type: 'number'},
          },
        }],
      ]);

      const {definitions, conflicts} = mergeDefinitions(schemas);
      expect(definitions).toHaveProperty('Type1');
      expect(Object.keys(definitions)).toHaveLength(1);
      expect(conflicts).toHaveLength(1);
      expect(conflicts[0]).toContain('Type1');
    });

    it('should resolve cross-file refs during merge', () => {
      const schemas = new Map<string, JsonSchema>([
        ['schema1', {
          definitions: {
            Type1: {
              type: 'object',
              properties: {
                field: {$ref: './other.json#/definitions/Type2'},
              },
            },
          },
        }],
      ]);

      const {definitions} = mergeDefinitions(schemas);
      const type1 = definitions.Type1 as {properties?: {field?: {$ref?: string}}};
      expect(type1.properties?.field?.$ref).toBe('#/definitions/Type2');
    });

    it('should skip schemas without definitions', () => {
      const schemas = new Map<string, JsonSchema>([
        ['schema1', {type: 'string'}],
        ['schema2', {
          definitions: {
            Type1: {type: 'string'},
          },
        }],
      ]);

      const {definitions, conflicts} = mergeDefinitions(schemas);
      expect(Object.keys(definitions)).toHaveLength(1);
      expect(conflicts).toHaveLength(0);
    });
  });

  describe('hasDefinition', () => {
    const schema: JsonSchema = {
      definitions: {
        Type1: {type: 'string'},
      },
    };

    it('should return true for existing definitions', () => {
      expect(hasDefinition(schema, 'Type1')).toBe(true);
    });

    it('should return false for non-existing definitions', () => {
      expect(hasDefinition(schema, 'Type2')).toBe(false);
    });

    it('should return false for schema without definitions', () => {
      expect(hasDefinition({}, 'Type1')).toBe(false);
    });
  });

  describe('getDefinition', () => {
    const schema: JsonSchema = {
      definitions: {
        Type1: {type: 'string', description: 'A string type'},
      },
    };

    it('should return definition for existing types', () => {
      const def = getDefinition(schema, 'Type1');
      expect(def).toEqual({type: 'string', description: 'A string type'});
    });

    it('should return null for non-existing definitions', () => {
      expect(getDefinition(schema, 'Type2')).toBeNull();
    });

    it('should return null for schema without definitions', () => {
      expect(getDefinition({}, 'Type1')).toBeNull();
    });
  });
});
