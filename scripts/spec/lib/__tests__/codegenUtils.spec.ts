/**
 * Tests for codegenUtils.ts
 */

import {describe, it, expect} from 'vitest';

import {generateZodSchemas, assembleGeneratedFile, generateIndexFile} from '../codegenUtils';
import type {JsonSchema, Config} from '../types';

import * as fixtures from './fixtures';


describe('codegenUtils', () => {
	describe('generateZodSchemas', () => {
		it('should generate schemas for simple primitive types', () => {
			const bundledSchema: JsonSchema = {
				definitions: {
					StringType: fixtures.simpleStringSchema,
					NumberType: fixtures.simpleNumberSchema,
					BooleanType: fixtures.simpleBooleanSchema,
				},
			};

			const result = generateZodSchemas({
				config: fixtures.emptyConfig,
				bundledSchema,
			});

			expect(result.imports).toContain("import { z } from 'zod';");
			expect(result.schemas.length).toBe(3);

			// Check schemas contain expected content
			const schemasText = result.schemas.join('\n');
			expect(schemasText).toContain('export const StringTypeSchema');
			expect(schemasText).toContain('export const NumberTypeSchema');
			expect(schemasText).toContain('export const BooleanTypeSchema');
		});

		it('should generate schemas in dependency order', () => {
			const bundledSchema: JsonSchema = {
				definitions: fixtures.linearDependencies,
			};

			const result = generateZodSchemas({
				config: fixtures.emptyConfig,
				bundledSchema,
			});

			// TypeA should come before TypeB, TypeB before TypeC
			const schemasText = result.schemas.join('\n');
			const typeAIndex = schemasText.indexOf('TypeASchema');
			const typeBIndex = schemasText.indexOf('TypeBSchema');
			const typeCIndex = schemasText.indexOf('TypeCSchema');

			expect(typeAIndex).toBeLessThan(typeBIndex);
			expect(typeBIndex).toBeLessThan(typeCIndex);
		});

		it('should generate discriminated unions', () => {
			const bundledSchema: JsonSchema = {
				definitions: {
					TestUnion: {
						anyOf: [
							{$ref: '#/definitions/Variant1'},
							{$ref: '#/definitions/Variant2'},
							{$ref: '#/definitions/Variant3'},
						],
					},
					Variant1: fixtures.discriminatedUnionVariant1,
					Variant2: fixtures.discriminatedUnionVariant2,
					Variant3: fixtures.discriminatedUnionVariant3,
				},
			};

			const config: Config = {
				version: '1.0.0',
				entryPoint: 'test.json',
				fragments: {},
				discriminatedUnions: [
					{
						name: 'TestUnion',
						location: 'test.json',
						discriminator: 'type',
						variants: [
							{value: 'variant1', type: 'Variant1'},
							{value: 'variant2', type: 'Variant2'},
							{value: 'variant3', type: 'Variant3'},
						],
					},
				],
			};

			const result = generateZodSchemas({
				config,
				bundledSchema,
			});

			const schemasText = result.schemas.join('\n');
			expect(schemasText).toContain('z.discriminatedUnion("type"');
			expect(schemasText).toContain('Variant1Schema');
			expect(schemasText).toContain('Variant2Schema');
			expect(schemasText).toContain('Variant3Schema');
		});

		it('should throw error for discriminated union with missing variants', () => {
			const bundledSchema: JsonSchema = {
				definitions: {
					TestUnion: {
						anyOf: [{$ref: '#/definitions/Variant1'}],
					},
					...fixtures.definitionsWithMissingVariants,
				},
			};

			expect(() => {
				generateZodSchemas({
					config: fixtures.configWithUnions,
					bundledSchema,
				});
			}).toThrow(/missing variants/i);
		});

		it('should handle recursive schemas with z.lazy', () => {
			const bundledSchema: JsonSchema = {
				definitions: {
					TreeNode: fixtures.recursiveArraySchema,
				},
			};

			const result = generateZodSchemas({
				config: fixtures.emptyConfig,
				bundledSchema,
			});

			const schemasText = result.schemas.join('\n');
			// Should use z.lazy() for recursive schemas
			expect(schemasText).toContain('z.lazy(() =>');
			expect(schemasText).toContain(': any');
		});

		it('should handle self-referencing schemas', () => {
			const bundledSchema: JsonSchema = {
				definitions: {
					SelfReferencing: fixtures.selfReferencingSchema,
				},
			};

			const result = generateZodSchemas({
				config: fixtures.emptyConfig,
				bundledSchema,
			});

			const schemasText = result.schemas.join('\n');
			// Should use z.lazy() for self-referencing schemas
			expect(schemasText).toContain('z.lazy(() =>');
			expect(schemasText).toContain(': any');
		});

		it('should handle complex nested schemas', () => {
			const bundledSchema: JsonSchema = {
				definitions: {
					Nested: fixtures.nestedObjectSchema,
				},
			};

			const result = generateZodSchemas({
				config: fixtures.emptyConfig,
				bundledSchema,
			});

			const schemasText = result.schemas.join('\n');
			expect(schemasText).toContain('z.object({');
			expect(schemasText).toContain('"user"');
			expect(schemasText).toContain('"tags"');
			expect(schemasText).toContain('z.array(z.string())');
		});

		it('should handle empty definitions', () => {
			const bundledSchema: JsonSchema = {
				definitions: {},
			};

			const result = generateZodSchemas({
				config: fixtures.emptyConfig,
				bundledSchema,
			});

			expect(result.schemas.length).toBe(0);
		});

		it('should add JSDoc descriptions for schemas', () => {
			const bundledSchema: JsonSchema = {
				definitions: {
					Documented: {
						...fixtures.simpleStringSchema,
						description: 'This is a documented schema',
					},
				},
			};

			const result = generateZodSchemas({
				config: fixtures.emptyConfig,
				bundledSchema,
			});

			const schemasText = result.schemas.join('\n');
			expect(schemasText).toContain('/** This is a documented schema */');
		});

		it('should format multi-line descriptions correctly', () => {
			const bundledSchema: JsonSchema = {
				definitions: {
					Documented: fixtures.multiLineDescriptionSchema,
				},
			};

			const result = generateZodSchemas({
				config: fixtures.emptyConfig,
				bundledSchema,
			});

			const schemasText = result.schemas.join('\n');
			expect(schemasText).toContain('/**');
			expect(schemasText).toContain(' * This is a multi-line description.');
			expect(schemasText).toContain(' * It spans multiple lines.');
			expect(schemasText).toContain(' */');
		});

		it('should handle schemas with additionalProperties: false', () => {
			const bundledSchema: JsonSchema = {
				definitions: {
					Strict: fixtures.simpleObjectSchema,
				},
			};

			const result = generateZodSchemas({
				config: fixtures.emptyConfig,
				bundledSchema,
			});

			const schemasText = result.schemas.join('\n');
			expect(schemasText).toContain('.strict()');
		});

		it('should handle mixed discriminated and non-discriminated unions', () => {
			const bundledSchema: JsonSchema = {
				definitions: {
					TestUnion: {
						anyOf: [
							{$ref: '#/definitions/Variant1'},
							{$ref: '#/definitions/Variant2'},
						],
					},
					Variant1: fixtures.discriminatedUnionVariant1,
					Variant2: fixtures.discriminatedUnionVariant2,
					RegularType: fixtures.simpleStringSchema,
				},
			};

			const config: Config = {
				version: '1.0.0',
				entryPoint: 'test.json',
				fragments: {},
				discriminatedUnions: [
					{
						name: 'TestUnion',
						location: 'test.json',
						discriminator: 'type',
						variants: [
							{value: 'variant1', type: 'Variant1'},
							{value: 'variant2', type: 'Variant2'},
						],
					},
				],
			};

			const result = generateZodSchemas({
				config,
				bundledSchema,
			});

			const schemasText = result.schemas.join('\n');
			expect(schemasText).toContain('z.discriminatedUnion');
			expect(schemasText).toContain('RegularTypeSchema');
		});
	});

	describe('assembleGeneratedFile', () => {
		it('should assemble complete file with all sections', () => {
			const generated = {
				imports: ["import { z } from 'zod';"],
				schemas: ['export const TestSchema = z.string();'],
			};

			const result = assembleGeneratedFile(generated);

			expect(result).toContain('/**');
			expect(result).toContain('* Generated Zod schemas from JSON Schema specification');
			expect(result).toContain('* DO NOT EDIT MANUALLY');
			expect(result).toContain("import { z } from 'zod';");
			expect(result).toContain('export const TestSchema = z.string();');
		});

		it('should have correct section ordering', () => {
			const generated = {
				imports: ["import { z } from 'zod';"],
				schemas: ['export const Schema1 = z.string();', 'export const Schema2 = z.number();'],
			};

			const result = assembleGeneratedFile(generated);
			const lines = result.split('\n');

			// Find indices of key sections
			const importIndex = lines.findIndex((l) => l.includes("import { z }"));
			const schema1Index = lines.findIndex((l) => l.includes('Schema1'));
			const schema2Index = lines.findIndex((l) => l.includes('Schema2'));

			// Verify order
			expect(importIndex).toBeLessThan(schema1Index);
			expect(schema1Index).toBeLessThan(schema2Index);
		});

		it('should handle empty schemas', () => {
			const generated = {
				imports: ["import { z } from 'zod';"],
				schemas: [],
			};

			const result = assembleGeneratedFile(generated);
			expect(result).toContain('DO NOT EDIT MANUALLY');
			expect(result).toContain("import { z } from 'zod';");
		});

		it('should end with newline', () => {
			const generated = {
				imports: ["import { z } from 'zod';"],
				schemas: ['export const TestSchema = z.string();'],
			};

			const result = assembleGeneratedFile(generated);
			expect(result.endsWith('\n')).toBe(true);
		});
	});

	describe('generateIndexFile', () => {
		it('should generate correct index file content', () => {
			const result = generateIndexFile();

			expect(result).toContain('/**');
			expect(result).toContain('* Generated Zod schemas for runtime validation');
			expect(result).toContain('* DO NOT EDIT MANUALLY');
			expect(result).toContain("export * from './specification';");
		});

		it('should end with newline', () => {
			const result = generateIndexFile();
			expect(result.endsWith('\n')).toBe(true);
		});

		it('should be idempotent', () => {
			const result1 = generateIndexFile();
			const result2 = generateIndexFile();
			expect(result1).toBe(result2);
		});
	});

	describe('integration', () => {
		it('should generate complete valid output for realistic schema', () => {
			const bundledSchema: JsonSchema = {
				definitions: {
					User: {
						type: 'object',
						description: 'A user in the system',
						properties: {
							id: {type: 'string', description: 'User ID'},
							name: {type: 'string', description: 'User name'},
							email: {type: 'string', description: 'User email'},
							role: {$ref: '#/definitions/Role'},
						},
						required: ['id', 'name', 'email', 'role'],
						additionalProperties: false,
					},
					Role: {
						type: 'string',
						enum: ['admin', 'user', 'guest'],
						description: 'User role',
					},
				},
			};

			const generated = generateZodSchemas({
				config: fixtures.emptyConfig,
				bundledSchema,
			});

			const file = assembleGeneratedFile(generated);

			// Should be valid TypeScript-looking code
			expect(file).toContain("import { z } from 'zod';");
			expect(file).toContain('export const RoleSchema');
			expect(file).toContain('export const UserSchema');
			expect(file).toContain('z.enum(["admin", "user", "guest"])');
			expect(file).toContain('"id": z.string().describe("User ID")');
			expect(file).toContain('.strict()');
		});
	});
});
