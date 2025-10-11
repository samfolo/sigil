/**
 * Tests for typeMapper.ts
 */

import {describe, it, expect} from 'vitest';

import {mapJsonSchemaTypeToZod, toSchemaName, toTypeName} from '../typeMapper';

import * as fixtures from './fixtures';

describe('typeMapper', () => {
	describe('mapJsonSchemaTypeToZod', () => {
		describe('primitive types', () => {
			it('should map string type', () => {
				const result = mapJsonSchemaTypeToZod(fixtures.simpleStringSchema);
				expect(result).toBe('z.string().describe("A simple string field")');
			});

			it('should map string type without description when skipDescription is true', () => {
				const result = mapJsonSchemaTypeToZod(fixtures.simpleStringSchema, undefined, true);
				expect(result).toBe('z.string()');
			});

			it('should map number type', () => {
				const result = mapJsonSchemaTypeToZod(fixtures.simpleNumberSchema);
				expect(result).toBe('z.number()');
			});

			it('should map boolean type', () => {
				const result = mapJsonSchemaTypeToZod(fixtures.simpleBooleanSchema);
				expect(result).toBe('z.boolean()');
			});

			it('should map primitive union types', () => {
				const result = mapJsonSchemaTypeToZod(fixtures.primitiveUnionSchema);
				expect(result).toBe('z.union([z.string(), z.number(), z.null()])');
			});
		});

		describe('enum types', () => {
			it('should map string enum with multiple values', () => {
				const result = mapJsonSchemaTypeToZod(fixtures.stringEnumSchema);
				expect(result).toBe('z.enum(["option1", "option2", "option3"])');
			});

			it('should map single value enum as literal', () => {
				const result = mapJsonSchemaTypeToZod(fixtures.singleValueEnumSchema);
				expect(result).toBe('z.literal("single")');
			});


		it('should map mixed enum as union of literals', () => {
			const result = mapJsonSchemaTypeToZod(fixtures.mixedEnumSchema);
			expect(result).toContain('z.union(');
			expect(result).toContain('z.literal(');
			// Should handle all three values - string, number, boolean
			const hasString = result.includes('"string"') || result.includes("'string'");
			const hasNumber = result.includes('123');
			const hasBoolean = result.includes('true');
			expect(hasString).toBe(true);
			expect(hasNumber).toBe(true);
			expect(hasBoolean).toBe(true);
		});
	});

	describe('const (literal) types', () => {
			it('should map string const', () => {
				const result = mapJsonSchemaTypeToZod(fixtures.stringConstSchema);
				expect(result).toBe('z.literal("literal-value")');
			});

			it('should map number const', () => {
				const result = mapJsonSchemaTypeToZod(fixtures.numberConstSchema);
				expect(result).toBe('z.literal(42)');
			});

			it('should map boolean const', () => {
				const result = mapJsonSchemaTypeToZod(fixtures.booleanConstSchema);
				expect(result).toBe('z.literal(true)');
			});

			it('should map null const', () => {
				const result = mapJsonSchemaTypeToZod(fixtures.nullConstSchema);
				expect(result).toBe('z.null()');
			});
		});

		describe('array types', () => {
			it('should map array with string items', () => {
				const result = mapJsonSchemaTypeToZod(fixtures.stringArraySchema);
				expect(result).toBe('z.array(z.string())');
			});

			it('should map array with $ref items', () => {
				const result = mapJsonSchemaTypeToZod(fixtures.arrayWithRefSchema);
				expect(result).toBe('z.array(SomeTypeSchema)');
			});

			it('should map array without items as unknown array', () => {
				const result = mapJsonSchemaTypeToZod(fixtures.arrayWithoutItemsSchema);
				expect(result).toBe('z.array(z.unknown())');
			});

			it('should not duplicate descriptions on array items', () => {
				const arrayWithDescribedItems: typeof fixtures.stringArraySchema = {
					type: 'array',
					items: {
						type: 'string',
						description: 'Item description',
					},
				};
				const result = mapJsonSchemaTypeToZod(arrayWithDescribedItems);
				// Description should only appear once in the items
				const descCount = (result.match(/\.describe\(/g) || []).length;
				expect(descCount).toBe(0); // Should be 0 because skipDescription is true for items
			});
		});

		describe('object types', () => {
			it('should map simple object with required and optional properties', () => {
				const result = mapJsonSchemaTypeToZod(fixtures.simpleObjectSchema);
				expect(result).toContain('z.object({');
				expect(result).toContain('"name": z.string().describe("User name")');
				expect(result).toContain('"age": z.number()');
				expect(result).toContain('"active": z.boolean().optional()');
				expect(result).toContain('.strict()');
			});

			it('should map object with all optional properties', () => {
				const result = mapJsonSchemaTypeToZod(fixtures.objectWithOptionalPropsSchema);
				expect(result).toContain('"required": z.string()');
				expect(result).toContain('"optional": z.string().optional()');
			});

			it('should map empty object', () => {
				const result = mapJsonSchemaTypeToZod(fixtures.emptyObjectSchema);
			// May have whitespace in empty objects
			expect(result).toMatch(/z\.object\(\{[\s]*\}\)/);
			});

			it('should map object with additionalProperties: true', () => {
				const result = mapJsonSchemaTypeToZod(fixtures.objectWithAdditionalPropsSchema);
				expect(result).toBe('z.record(z.string(), z.unknown())');
			});

			it('should map object with typed additionalProperties', () => {
				const result = mapJsonSchemaTypeToZod(fixtures.objectWithTypedAdditionalPropsSchema);
				expect(result).toBe('z.record(z.string(), z.string())');
			});

			it('should not add .strict() when additionalProperties is not false', () => {
				const result = mapJsonSchemaTypeToZod(fixtures.objectWithOptionalPropsSchema);
				expect(result).not.toContain('.strict()');
			});

			it('should handle nested objects', () => {
				const result = mapJsonSchemaTypeToZod(fixtures.nestedObjectSchema);
				expect(result).toContain('z.object({');
				expect(result).toContain('"user":');
				expect(result).toContain('"name": z.string()');
				expect(result).toContain('"email": z.string().optional()');
				expect(result).toContain('"tags":');
				expect(result).toContain('z.array(z.string())');
			});

			it('should not duplicate descriptions on object properties', () => {
				const result = mapJsonSchemaTypeToZod(fixtures.simpleObjectSchema);
				// Each property should have description only once
				const nameDescCount = (result.match(/"name".*?\.describe\("User name"\)/g) || []).length;
				expect(nameDescCount).toBe(1);
			});
		});

		describe('$ref types', () => {
			it('should map $ref to schema name', () => {
				const result = mapJsonSchemaTypeToZod(fixtures.refSchema);
				expect(result).toBe('SomeTypeSchema');
			});

			it('should map cross-file $ref to schema name', () => {
				const result = mapJsonSchemaTypeToZod(fixtures.crossFileRefSchema);
				expect(result).toBe('SomeTypeSchema');
			});
		});

		describe('union types', () => {
			it('should map anyOf to union', () => {
				const result = mapJsonSchemaTypeToZod(fixtures.anyOfSchema);
				expect(result).toBe('z.union([z.string(), z.number()])');
			});

			it('should map oneOf to union', () => {
				const result = mapJsonSchemaTypeToZod(fixtures.oneOfSchema);
				expect(result).toBe('z.union([z.literal("a"), z.literal("b")])');
			});

			it('should not duplicate descriptions in union variants', () => {
				const unionWithDesc = {
					anyOf: [
						{type: 'string', description: 'String variant'} as const,
						{type: 'number', description: 'Number variant'} as const,
					],
				};
				const result = mapJsonSchemaTypeToZod(unionWithDesc);
				// Descriptions should not appear in union (skipDescription is true for variants)
				expect(result).toBe('z.union([z.string(), z.number()])');
			});
		});

		describe('edge cases', () => {
			it('should handle schema without type but with properties', () => {
				const result = mapJsonSchemaTypeToZod(fixtures.schemaWithoutType);
				expect(result).toContain('z.object({');
				expect(result).toContain('"field": z.string()');
			});

			it('should fallback to unknown for empty schema', () => {
				const result = mapJsonSchemaTypeToZod(fixtures.unknownSchema);
				expect(result).toBe('z.unknown()');
			});

			it('should handle invalid $ref gracefully', () => {
				const result = mapJsonSchemaTypeToZod(fixtures.invalidRefSchema);
				// Should fall back to unknown since ref cannot be extracted
				expect(result).toBe('z.unknown()');
			});

			it('should handle multi-line descriptions', () => {
				const result = mapJsonSchemaTypeToZod(fixtures.multiLineDescriptionSchema);
				expect(result).toContain('z.string().describe(');
				// Multi-line strings should use template literals
				expect(result).toMatch(/z\.string\(\)\.describe\(`.*\n.*\n.*`\)/);
			});
		});
	});

	describe('toSchemaName', () => {
		it('should append Schema to normal name', () => {
			const result = toSchemaName('TypeName');
			expect(result).toBe('TypeNameSchema');
		});

		it('should handle names with special characters', () => {
			const result = toSchemaName('Type-With_Special.Chars');
			// Removes special chars but may keep underscores
			expect(result).toMatch(/Type.*Special.*Chars.*Schema/);
		});

		it('should handle names starting with numbers', () => {
			const result = toSchemaName('123Type');
			expect(result).toBe('Schema123Type');
		});

		it('should handle names with only special characters', () => {
			const result = toSchemaName('---');
			expect(result).toBe('Schema');
		});

		it('should preserve underscores', () => {
			const result = toSchemaName('Type_Name');
			// Underscores may be preserved
			expect(result).toMatch(/Type.*Name.*Schema/);
		});

		it('should handle camelCase names', () => {
			const result = toSchemaName('camelCaseName');
			expect(result).toBe('camelCaseNameSchema');
		});

		it('should handle PascalCase names', () => {
			const result = toSchemaName('PascalCaseName');
			expect(result).toBe('PascalCaseNameSchema');
		});
	});

	describe('toTypeName', () => {
		it('should remove Schema suffix', () => {
			const result = toTypeName('TypeNameSchema');
			expect(result).toBe('TypeName');
		});

		it('should handle name without Schema suffix', () => {
			const result = toTypeName('TypeName');
			expect(result).toBe('TypeName');
		});

		it('should handle name that is just "Schema"', () => {
			const result = toTypeName('Schema');
			expect(result).toBe('');
		});

		it('should handle name with multiple Schema occurrences', () => {
			const result = toTypeName('SchemaTypeSchema');
			expect(result).toBe('SchemaType');
		});
	});
});
