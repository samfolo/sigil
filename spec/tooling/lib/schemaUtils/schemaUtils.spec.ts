/**
 * Tests for JSON Schema manipulation utilities
 */

import {describe, it, expect} from 'vitest';

import {resolveRefs, mergeDefinitions} from '../schemaUtils';
import type {JsonSchema} from '../types';

describe('schemaUtils', () => {
  describe('resolveRefs', () => {
    it('should resolve cross-file refs to local refs', () => {
      const input = {
        $ref: './other.schema.json#/definitions/SomeType',
      };

      const result = resolveRefs(input);

      expect(result).toEqual({
        $ref: '#/definitions/SomeType',
      });
    });

    it('should recursively resolve refs in nested objects', () => {
      const input = {
        properties: {
          field1: {
            $ref: './types.schema.json#/definitions/StringType',
          },
          field2: {
            type: 'object',
            properties: {
              nested: {
                $ref: './other.schema.json#/definitions/NestedType',
              },
            },
          },
        },
      };

      const result = resolveRefs(input);

      expect(result).toEqual({
        properties: {
          field1: {
            $ref: '#/definitions/StringType',
          },
          field2: {
            type: 'object',
            properties: {
              nested: {
                $ref: '#/definitions/NestedType',
              },
            },
          },
        },
      });
    });

    it('should preserve title fields in nested properties', () => {
      const input = {
        type: 'object',
        properties: {
          title: {
            type: 'string',
            description: 'Component title',
          },
          description: {
            type: 'string',
            description: 'Component description',
          },
        },
      };

      const result = resolveRefs(input);

      expect(result).toEqual(input);
    });

    it('should strip $id and title at root level when isRoot=true', () => {
      const input = {
        $id: 'sigil://spec/components',
        title: 'Component Config',
        description: 'Schema for components',
        definitions: {
          SomeType: {
            type: 'string',
          },
        },
      };

      const result = resolveRefs(input, true);

      expect(result).toEqual({
        description: 'Schema for components',
        definitions: {
          SomeType: {
            type: 'string',
          },
        },
      });
    });

    it('should preserve title in nested objects even when isRoot=true', () => {
      const input = {
        $id: 'sigil://spec/test',
        title: 'Root Title',
        definitions: {
          Config: {
            type: 'object',
            properties: {
              title: {
                type: 'string',
                description: 'Config title field',
              },
            },
          },
        },
      };

      const result = resolveRefs(input, true);

      expect(result).toEqual({
        definitions: {
          Config: {
            type: 'object',
            properties: {
              title: {
                type: 'string',
                description: 'Config title field',
              },
            },
          },
        },
      });
    });
  });

  describe('mergeDefinitions', () => {
    it('should merge definitions from multiple schemas', () => {
      const schemas = new Map<string, JsonSchema>([
        [
          'schema1.json',
          {
            definitions: {
              Type1: {type: 'string'},
              Type2: {type: 'number'},
            },
          },
        ],
        [
          'schema2.json',
          {
            definitions: {
              Type3: {type: 'boolean'},
            },
          },
        ],
      ]);

      const result = mergeDefinitions(schemas);

      expect(result.conflicts).toHaveLength(0);
      expect(result.definitions).toEqual({
        Type1: {type: 'string'},
        Type2: {type: 'number'},
        Type3: {type: 'boolean'},
      });
    });

    it('should detect definition conflicts', () => {
      const schemas = new Map<string, JsonSchema>([
        [
          'schema1.json',
          {
            definitions: {
              Type1: {type: 'string'},
            },
          },
        ],
        [
          'schema2.json',
          {
            definitions: {
              Type1: {type: 'number'},
            },
          },
        ],
      ]);

      const result = mergeDefinitions(schemas);

      expect(result.conflicts).toHaveLength(1);
      expect(result.conflicts.at(0)).toContain('Type1');
      expect(result.conflicts.at(0)).toContain('schema2.json');
    });

    it('should preserve title fields inside definitions', () => {
      const schemas = new Map<string, JsonSchema>([
        [
          'components.json',
          {
            $id: 'sigil://spec/components',
            title: 'Component Config',
            definitions: {
              DataTableConfig: {
                type: 'object',
                properties: {
                  title: {
                    type: 'string',
                    description: 'Optional title for the component',
                  },
                  description: {
                    type: 'string',
                    description: 'Optional description',
                  },
                },
              },
            },
          },
        ],
      ]);

      const result = mergeDefinitions(schemas);

      expect(result.definitions).toEqual({
        DataTableConfig: {
          type: 'object',
          properties: {
            title: {
              type: 'string',
              description: 'Optional title for the component',
            },
            description: {
              type: 'string',
              description: 'Optional description',
            },
          },
        },
      });
    });
  });
});
