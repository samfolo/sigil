/**
 * Tests for dependencyAnalyser.ts
 */

import {describe, it, expect} from 'vitest';

import {extractDependencies, buildDependencyGraph, topologicalSort} from '../dependencyAnalyser';
import * as fixtures from '../fixtures';
import type {JsonSchema} from '../types';



describe('dependencyAnalyser', () => {
  describe('extractDependencies', () => {
    it('should extract direct $ref dependency', () => {
      const deps = extractDependencies(fixtures.refSchema);
      expect(deps.has('SomeType')).toBe(true);
      expect(deps.size).toBe(1);
    });

    it('should extract dependencies from array items', () => {
      const deps = extractDependencies(fixtures.arrayWithRefSchema);
      expect(deps.has('SomeType')).toBe(true);
      expect(deps.size).toBe(1);
    });

    it('should extract dependencies from object properties', () => {
      const schema: JsonSchema = {
        type: 'object',
        properties: {
          field1: {$ref: '#/definitions/Type1'},
          field2: {$ref: '#/definitions/Type2'},
        },
      };
      const deps = extractDependencies(schema);
      expect(deps.has('Type1')).toBe(true);
      expect(deps.has('Type2')).toBe(true);
      expect(deps.size).toBe(2);
    });

    it('should extract dependencies from nested structures', () => {
      const schema: JsonSchema = {
        type: 'object',
        properties: {
          nested: {
            type: 'object',
            properties: {
              deep: {$ref: '#/definitions/DeepType'},
            },
          },
        },
      };
      const deps = extractDependencies(schema);
      expect(deps.has('DeepType')).toBe(true);
    });

    it('should extract dependencies from unions', () => {
      const schema: JsonSchema = {
        anyOf: [{$ref: '#/definitions/Type1'}, {$ref: '#/definitions/Type2'}],
      };
      const deps = extractDependencies(schema);
      expect(deps.has('Type1')).toBe(true);
      expect(deps.has('Type2')).toBe(true);
      expect(deps.size).toBe(2);
    });

    it('should extract dependencies from oneOf', () => {
      const schema: JsonSchema = {
        oneOf: [{$ref: '#/definitions/Type1'}, {$ref: '#/definitions/Type2'}],
      };
      const deps = extractDependencies(schema);
      expect(deps.has('Type1')).toBe(true);
      expect(deps.has('Type2')).toBe(true);
    });

    it('should handle schemas with no dependencies', () => {
      const deps = extractDependencies(fixtures.simpleStringSchema);
      expect(deps.size).toBe(0);
    });

    it('should handle empty schemas', () => {
      const deps = extractDependencies({});
      expect(deps.size).toBe(0);
    });

    it('should extract multiple dependencies from complex schema', () => {
      const schema: JsonSchema = {
        type: 'object',
        properties: {
          single: {$ref: '#/definitions/Type1'},
          array: {
            type: 'array',
            items: {$ref: '#/definitions/Type2'},
          },
          union: {
            anyOf: [{$ref: '#/definitions/Type3'}, {$ref: '#/definitions/Type4'}],
          },
        },
      };
      const deps = extractDependencies(schema);
      expect(deps.has('Type1')).toBe(true);
      expect(deps.has('Type2')).toBe(true);
      expect(deps.has('Type3')).toBe(true);
      expect(deps.has('Type4')).toBe(true);
      expect(deps.size).toBe(4);
    });

    it('should handle cross-file refs', () => {
      const deps = extractDependencies(fixtures.crossFileRefSchema);
      expect(deps.has('SomeType')).toBe(true);
    });

    it('should ignore invalid refs', () => {
      const deps = extractDependencies(fixtures.invalidRefSchema);
      expect(deps.size).toBe(0);
    });

    it('should deduplicate repeated references', () => {
      const schema: JsonSchema = {
        type: 'object',
        properties: {
          field1: {$ref: '#/definitions/SameType'},
          field2: {$ref: '#/definitions/SameType'},
          field3: {$ref: '#/definitions/SameType'},
        },
      };
      const deps = extractDependencies(schema);
      expect(deps.has('SameType')).toBe(true);
      expect(deps.size).toBe(1);
    });
  });

  describe('buildDependencyGraph', () => {
    it('should build graph for independent definitions', () => {
      const graph = buildDependencyGraph(fixtures.independentDefinitions);
      expect(graph.size).toBe(3);
      expect(graph.get('TypeA')?.size).toBe(0);
      expect(graph.get('TypeB')?.size).toBe(0);
      expect(graph.get('TypeC')?.size).toBe(0);
    });

    it('should build graph for linear dependencies', () => {
      const graph = buildDependencyGraph(fixtures.linearDependencies);
      expect(graph.size).toBe(3);
      expect(graph.get('TypeA')?.size).toBe(0);
      expect(graph.get('TypeB')?.has('TypeA')).toBe(true);
      expect(graph.get('TypeC')?.has('TypeB')).toBe(true);
    });

    it('should build graph for complex dependencies', () => {
      const graph = buildDependencyGraph(fixtures.complexDependencies);
      expect(graph.size).toBe(4);
      expect(graph.get('Base')?.size).toBe(0);
      expect(graph.get('Left')?.has('Base')).toBe(true);
      expect(graph.get('Right')?.has('Base')).toBe(true);
      expect(graph.get('Combined')?.has('Left')).toBe(true);
      expect(graph.get('Combined')?.has('Right')).toBe(true);
    });

    it('should build graph for circular dependencies', () => {
      const graph = buildDependencyGraph(fixtures.circularDependencies);
      expect(graph.size).toBe(1);
      expect(graph.get('Node')?.has('Node')).toBe(true); // Self-reference
    });

    it('should build graph for mutual circular dependencies', () => {
      const graph = buildDependencyGraph(fixtures.mutualCircularDependencies);
      expect(graph.size).toBe(2);
      expect(graph.get('TypeA')?.has('TypeB')).toBe(true);
      expect(graph.get('TypeB')?.has('TypeA')).toBe(true);
    });

    it('should handle empty definitions', () => {
      const graph = buildDependencyGraph({});
      expect(graph.size).toBe(0);
    });
  });

  describe('topologicalSort', () => {
    it('should sort independent definitions in any stable order', () => {
      const graph = buildDependencyGraph(fixtures.independentDefinitions);
      const names = Object.keys(fixtures.independentDefinitions);
      const sorted = topologicalSort(names, graph);

      expect(sorted.length).toBe(3);
      expect(sorted).toContain('TypeA');
      expect(sorted).toContain('TypeB');
      expect(sorted).toContain('TypeC');
    });

    it('should sort linear dependencies correctly', () => {
      const graph = buildDependencyGraph(fixtures.linearDependencies);
      const names = Object.keys(fixtures.linearDependencies);
      const sorted = topologicalSort(names, graph);

      expect(sorted).toEqual(['TypeA', 'TypeB', 'TypeC']);
    });

    it('should sort complex dependencies correctly', () => {
      const graph = buildDependencyGraph(fixtures.complexDependencies);
      const names = Object.keys(fixtures.complexDependencies);
      const sorted = topologicalSort(names, graph);

      // Base must come first
      expect(sorted[0]).toBe('Base');
      // Left and Right must come before Combined
      const leftIndex = sorted.indexOf('Left');
      const rightIndex = sorted.indexOf('Right');
      const combinedIndex = sorted.indexOf('Combined');
      expect(leftIndex).toBeLessThan(combinedIndex);
      expect(rightIndex).toBeLessThan(combinedIndex);
    });

    it('should handle circular dependencies without infinite loop', () => {
      const graph = buildDependencyGraph(fixtures.circularDependencies);
      const names = Object.keys(fixtures.circularDependencies);
      const sorted = topologicalSort(names, graph);

      expect(sorted.length).toBe(1);
      expect(sorted).toContain('Node');
    });

    it('should handle mutual circular dependencies', () => {
      const graph = buildDependencyGraph(fixtures.mutualCircularDependencies);
      const names = Object.keys(fixtures.mutualCircularDependencies);
      const sorted = topologicalSort(names, graph);

      expect(sorted.length).toBe(2);
      expect(sorted).toContain('TypeA');
      expect(sorted).toContain('TypeB');
    });

    it('should handle empty list', () => {
      const graph = buildDependencyGraph({});
      const sorted = topologicalSort([], graph);
      expect(sorted).toEqual([]);
    });

    it('should only include specified names', () => {
      const graph = buildDependencyGraph(fixtures.linearDependencies);
      // Only sort subset
      const sorted = topologicalSort(['TypeA', 'TypeC'], graph);

      expect(sorted.length).toBe(2);
      expect(sorted).toContain('TypeA');
      expect(sorted).toContain('TypeC');
      expect(sorted).not.toContain('TypeB');
    });

    it('should handle diamond dependency pattern', () => {
      const definitions = {
        Base: {type: 'string'},
        Left: {$ref: '#/definitions/Base'},
        Right: {$ref: '#/definitions/Base'},
        Top: {
          type: 'object',
          properties: {
            left: {$ref: '#/definitions/Left'},
            right: {$ref: '#/definitions/Right'},
          },
        },
      };
      const graph = buildDependencyGraph(definitions);
      const sorted = topologicalSort(Object.keys(definitions), graph);

      // Base must come first
      expect(sorted[0]).toBe('Base');
      // Left and Right must come before Top
      const leftIndex = sorted.indexOf('Left');
      const rightIndex = sorted.indexOf('Right');
      const topIndex = sorted.indexOf('Top');
      expect(leftIndex).toBeLessThan(topIndex);
      expect(rightIndex).toBeLessThan(topIndex);
    });

    it('should maintain stable order for items at same dependency level', () => {
      const definitions = {
        A: {type: 'string'},
        B: {type: 'string'},
        C: {type: 'string'},
      };
      const graph = buildDependencyGraph(definitions);
      const sorted1 = topologicalSort(['A', 'B', 'C'], graph);
      const sorted2 = topologicalSort(['A', 'B', 'C'], graph);

      // Should produce same order when called multiple times
      expect(sorted1).toEqual(sorted2);
    });
  });

  describe('integration', () => {
    it('should correctly analyse and sort real-world recursive schema', () => {
      const definitions = {
        TreeNode: fixtures.recursiveArraySchema,
      };
      const graph = buildDependencyGraph(definitions);
      const sorted = topologicalSort(Object.keys(definitions), graph);

      expect(sorted).toEqual(['TreeNode']);
      expect(graph.get('TreeNode')?.has('TreeNode')).toBe(true);
    });

    it('should handle mixed dependency patterns', () => {
      const definitions = {
        Primitive: {type: 'string'},
        Container: {
          type: 'object',
          properties: {
            value: {$ref: '#/definitions/Primitive'},
          },
        },
        Recursive: {
          type: 'object',
          properties: {
            next: {$ref: '#/definitions/Recursive'},
            container: {$ref: '#/definitions/Container'},
          },
        },
      };
      const graph = buildDependencyGraph(definitions);
      const sorted = topologicalSort(Object.keys(definitions), graph);

      // Primitive has no deps, should be first
      expect(sorted[0]).toBe('Primitive');
      // Container depends on Primitive
      expect(sorted[1]).toBe('Container');
      // Recursive depends on both (and itself)
      expect(sorted[2]).toBe('Recursive');
    });
  });
});
