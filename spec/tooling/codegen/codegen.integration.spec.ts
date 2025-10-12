/**
 * Integration tests for the full codegen pipeline
 * Tests the entire flow from JSON Schema to generated Zod schemas
 */

import {readFileSync} from 'fs';
import {resolve} from 'path';

import {describe, it, expect} from 'vitest';

import {generateZodSchemas, assembleGeneratedFile} from './utils';
import type {JsonSchema, Config} from '../lib/types';

describe('codegen integration', () => {
	// Load the actual bundled schema and config
	const specDir = resolve(__dirname, '../..');
	const bundledSchemaPath = resolve(specDir, 'schema/specification.schema.json');
	const configPath = resolve(specDir, 'config.json');

	let bundledSchema: JsonSchema;
	let config: Config;

	try {
		bundledSchema = JSON.parse(readFileSync(bundledSchemaPath, 'utf-8'));
		config = JSON.parse(readFileSync(configPath, 'utf-8'));
	} catch (error) {
		throw new Error(
			`Failed to load spec files. Run \`npm run spec:bundle\` first.\n` +
			`  Expected files:\n` +
			`  - ${bundledSchemaPath}\n` +
			`  - ${configPath}\n` +
			`  Error: ${error instanceof Error ? error.message : String(error)}`
		);
	}

	describe('real schema generation', () => {
		it('should generate schemas from actual bundled schema without errors', () => {
			expect(() => {
				generateZodSchemas({config, bundledSchema});
			}).not.toThrow();
		});

		it('should generate all expected schemas from definitions', () => {
			const definitions = (bundledSchema.definitions || {}) as Record<string, JsonSchema>;
			const definitionCount = Object.keys(definitions).length;

			if (definitionCount === 0) {
				// Skip if no definitions
				return;
			}

			const result = generateZodSchemas({config, bundledSchema});
			expect(result.schemas.length).toBe(definitionCount);
		});

		it('should generate valid-looking TypeScript code', () => {
			const result = generateZodSchemas({config, bundledSchema});
			const file = assembleGeneratedFile(result);

			// Basic structure checks
			expect(file).toContain("import {z} from 'zod';");
			expect(file).toContain('export const');

			// Should not have obvious syntax errors (but "undefined" may appear in enum values)
			expect(file).not.toContain('[object Object]');
			expect(file).not.toMatch(/:\s*undefined[,;]/); // undefined as a value (not string)
		});

		it('should preserve all discriminated unions from config', () => {
			const unions = config.discriminatedUnions || [];

			if (unions.length === 0) {
				// Skip if no unions
				return;
			}

			const result = generateZodSchemas({config, bundledSchema});
			const file = assembleGeneratedFile(result);

			for (const union of unions) {
				expect(file).toContain(`${union.name}Schema`);
				expect(file).toContain(`z.discriminatedUnion("${union.discriminator}"`);
			}
		});

		it('should generate schemas in valid dependency order', () => {
			const result = generateZodSchemas({config, bundledSchema});
			const file = assembleGeneratedFile(result);

			// Extract all schema definitions
			const schemaRegex = /export const (\w+Schema) =/g;
			const schemas: string[] = [];
			let match;

			while ((match = schemaRegex.exec(file)) !== null) {
				schemas.push(match[1]);
			}

			// Extract all references to other schemas
			for (const schema of schemas) {
				// Find the schema definition
				const schemaStart = file.indexOf(`export const ${schema} =`);
				const nextSchemaStart = file.indexOf('export const', schemaStart + 1);
				const schemaEnd = nextSchemaStart === -1 ? file.length : nextSchemaStart;
				const schemaCode = file.slice(schemaStart, schemaEnd);

				// Find references to other schemas (exclude getters)
				const refRegex = /(?<!get\s+)"[^"]+"\s*:\s*(\w+Schema)/g;
				let refMatch;

				while ((refMatch = refRegex.exec(schemaCode)) !== null) {
					const referencedSchema = refMatch[1];

					// Skip self-references (recursive schemas)
					if (referencedSchema === schema) {
						continue;
					}

					// The referenced schema should be defined before this schema
					const referencedIndex = schemas.indexOf(referencedSchema);
					const currentIndex = schemas.indexOf(schema);

					if (referencedIndex !== -1) {
						expect(referencedIndex).toBeLessThan(currentIndex);
					}
				}
			}
		});

		it('should handle recursive schemas correctly', () => {
			const result = generateZodSchemas({config, bundledSchema});
			const file = assembleGeneratedFile(result);

			// If there are z.lazy calls (indicating recursive schemas), check they are formatted correctly
			if (file.includes('z.lazy')) {
				expect(file).toContain('z.lazy(() =>');
				expect(file).toContain(': any');
			}
		});

		it('should generate valid schema exports', () => {
			const result = generateZodSchemas({config, bundledSchema});

			// Each schema should be exported
			for (const schema of result.schemas) {
				expect(schema).toContain('export const');
				expect(schema).toMatch(/Schema\s*[=:]/);
			}
		});

		it('should include descriptions where available', () => {
			const result = generateZodSchemas({config, bundledSchema});
			const file = assembleGeneratedFile(result);

			const definitions = (bundledSchema.definitions || {}) as Record<string, JsonSchema>;

			// Check that at least some schemas with descriptions have JSDoc comments
			let descriptionsFound = 0;
			for (const [_name, schema] of Object.entries(definitions)) {
				if (schema.description && typeof schema.description === 'string') {
					// Check if any part of the description appears in the file
					// (may be split across lines in multi-line comments)
					const firstLine = (schema.description as string).split('\n')[0];
					if (firstLine && file.includes(firstLine)) {
						descriptionsFound++;
					}
				}
			}

			// Should have at least some descriptions
			expect(descriptionsFound).toBeGreaterThan(0);
		});
	});

	describe('edge cases', () => {
		it('should handle empty bundled schema', () => {
			const emptySchema: JsonSchema = {definitions: {}};
			const emptyConfig: Config = {
				version: '1.0.0',
				entryPoint: 'test.json',
				fragments: {},
				discriminatedUnions: [],
			};

			const result = generateZodSchemas({
				config: emptyConfig,
				bundledSchema: emptySchema,
			});

			expect(result.schemas).toEqual([]);
		});

		it('should handle schema with no definitions', () => {
			const schema: JsonSchema = {};
			const config: Config = {
				version: '1.0.0',
				entryPoint: 'test.json',
				fragments: {},
				discriminatedUnions: [],
			};

			const result = generateZodSchemas({config, bundledSchema: schema});

			expect(result.schemas).toEqual([]);
		});

		it('should validate discriminated union variants', () => {
			const testSchema: JsonSchema = {
				definitions: {
					TestUnion: {
						anyOf: [{$ref: '#/definitions/Variant1'}],
					},
					Variant1: {
						type: 'object',
						properties: {
							type: {const: 'variant1'},
						},
					},
				},
			};

			const testConfig: Config = {
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
							{value: 'missing', type: 'MissingVariant'},
						],
					},
				],
			};

			expect(() => {
				generateZodSchemas({config: testConfig, bundledSchema: testSchema});
			}).toThrow(/missing variants/i);
		});

		it('should handle very deeply nested schemas', () => {
			const deepSchema: JsonSchema = {
				definitions: {
					Level1: {
						type: 'object',
						properties: {
							level2: {
								type: 'object',
								properties: {
									level3: {
										type: 'object',
										properties: {
											level4: {
												type: 'object',
												properties: {
													value: {type: 'string'},
												},
											},
										},
									},
								},
							},
						},
					},
				},
			};

			expect(() => {
				generateZodSchemas({
					config: {
						version: '1.0.0',
						entryPoint: 'test.json',
						fragments: {},
						discriminatedUnions: [],
					},
					bundledSchema: deepSchema,
				});
			}).not.toThrow();
		});

		it('should handle schemas with all JSON Schema features', () => {
			const complexSchema: JsonSchema = {
				definitions: {
					Complex: {
						type: 'object',
						description: 'A complex schema with many features',
						properties: {
							string: {type: 'string', description: 'A string'},
							number: {type: 'number'},
							boolean: {type: 'boolean'},
							array: {type: 'array', items: {type: 'string'}},
							enum: {type: 'string', enum: ['a', 'b', 'c']},
							const: {const: 'literal'},
							union: {anyOf: [{type: 'string'}, {type: 'number'}]},
							ref: {$ref: '#/definitions/Simple'},
						},
						required: ['string', 'number'],
						additionalProperties: false,
					},
					Simple: {
						type: 'string',
					},
				},
			};

			const result = generateZodSchemas({
				config: {
					version: '1.0.0',
					entryPoint: 'test.json',
					fragments: {},
					discriminatedUnions: [],
				},
				bundledSchema: complexSchema,
			});

			const file = assembleGeneratedFile(result);

			expect(file).toContain('z.string()');
			expect(file).toContain('z.number()');
			expect(file).toContain('z.boolean()');
			expect(file).toContain('z.array(');
			expect(file).toContain('z.enum([');
			expect(file).toContain('z.literal(');
			expect(file).toContain('z.union([');
			expect(file).toContain('.optional()');
			expect(file).toContain('.strict()');
		});
	});

	describe('generated code validity', () => {
		it('should generate code that can be parsed as TypeScript', () => {
			const result = generateZodSchemas({config, bundledSchema});
			const file = assembleGeneratedFile(result);

			// Basic syntax checks that would fail if TypeScript is invalid
			const brackets = {
				'{': (file.match(/{/g) || []).length,
				'}': (file.match(/}/g) || []).length,
				'[': (file.match(/\[/g) || []).length,
				']': (file.match(/\]/g) || []).length,
				'(': (file.match(/\(/g) || []).length,
				')': (file.match(/\)/g) || []).length,
			};

			// Brackets should be balanced
			expect(brackets['{']).toBe(brackets['}']);
			expect(brackets['[']).toBe(brackets[']']);
			expect(brackets['(']).toBe(brackets[')']);
		});

		it('should not generate duplicate exports', () => {
			const result = generateZodSchemas({config, bundledSchema});
			const file = assembleGeneratedFile(result);

			// Extract all export names
			const exports = file.match(/export (const|type) (\w+)/g) || [];
			const exportNames = exports.map((e) => e.split(' ')[2]);

			// Check for duplicates
			const uniqueNames = new Set(exportNames);
			expect(exportNames.length).toBe(uniqueNames.size);
		});

		it('should have consistent naming conventions', () => {
			const result = generateZodSchemas({config, bundledSchema});
			const file = assembleGeneratedFile(result);

			// All schema exports should end with "Schema"
			const schemaExports = file.match(/export const (\w+)/g) || [];
			for (const exp of schemaExports) {
				const name = exp.match(/export const (\w+)/)?.[1];
				expect(name).toMatch(/Schema$/);
			}
		});
	});
});
