/**
 * Test fixtures for codegen tests
 */

import type {JsonSchema, Config, DiscriminatedUnion} from './types';

/**
 * Simple primitive schemas
 */
export const simpleStringSchema: JsonSchema = {
	type: 'string',
	description: 'A simple string field',
};

export const simpleNumberSchema: JsonSchema = {
	type: 'number',
};

export const simpleBooleanSchema: JsonSchema = {
	type: 'boolean',
};

/**
 * Enum schemas
 */
export const stringEnumSchema: JsonSchema = {
	type: 'string',
	enum: ['option1', 'option2', 'option3'],
};

export const mixedEnumSchema: JsonSchema = {
	enum: ['string', 123, true],
};

export const singleValueEnumSchema: JsonSchema = {
	type: 'string',
	enum: ['single'],
};

/**
 * Const (literal) schemas
 */
export const stringConstSchema: JsonSchema = {
	const: 'literal-value',
};

export const numberConstSchema: JsonSchema = {
	const: 42,
};

export const booleanConstSchema: JsonSchema = {
	const: true,
};

export const nullConstSchema: JsonSchema = {
	const: null,
};

/**
 * Array schemas
 */
export const stringArraySchema: JsonSchema = {
	type: 'array',
	items: {type: 'string'},
};

export const arrayWithRefSchema: JsonSchema = {
	type: 'array',
	items: {$ref: '#/definitions/SomeType'},
};

export const arrayWithoutItemsSchema: JsonSchema = {
	type: 'array',
};

/**
 * Object schemas
 */
export const simpleObjectSchema: JsonSchema = {
	type: 'object',
	properties: {
		name: {type: 'string', description: 'User name'},
		age: {type: 'number'},
		active: {type: 'boolean'},
	},
	required: ['name', 'age'],
	additionalProperties: false,
};

export const objectWithOptionalPropsSchema: JsonSchema = {
	type: 'object',
	properties: {
		required: {type: 'string'},
		optional: {type: 'string'},
	},
	required: ['required'],
};

export const emptyObjectSchema: JsonSchema = {
	type: 'object',
	properties: {},
};

export const objectWithAdditionalPropsSchema: JsonSchema = {
	type: 'object',
	additionalProperties: true,
};

export const objectWithTypedAdditionalPropsSchema: JsonSchema = {
	type: 'object',
	additionalProperties: {type: 'string'},
};

/**
 * Reference schemas
 */
export const refSchema: JsonSchema = {
	$ref: '#/definitions/SomeType',
};

export const crossFileRefSchema: JsonSchema = {
	$ref: './other.schema.json#/definitions/SomeType',
};

/**
 * Union schemas
 */
export const anyOfSchema: JsonSchema = {
	anyOf: [{type: 'string'}, {type: 'number'}],
};

export const oneOfSchema: JsonSchema = {
	oneOf: [{const: 'a'}, {const: 'b'}],
};

export const primitiveUnionSchema: JsonSchema = {
	type: ['string', 'number', 'null'],
};

/**
 * Complex nested schemas
 */
export const nestedObjectSchema: JsonSchema = {
	type: 'object',
	properties: {
		user: {
			type: 'object',
			properties: {
				name: {type: 'string'},
				email: {type: 'string'},
			},
			required: ['name'],
		},
		tags: {
			type: 'array',
			items: {type: 'string'},
		},
	},
	required: ['user'],
	additionalProperties: false,
};

/**
 * Edge cases
 */
export const schemaWithoutType: JsonSchema = {
	properties: {
		field: {type: 'string'},
	},
};

export const unknownSchema: JsonSchema = {};

/**
 * Discriminated union test fixtures
 */
export const discriminatedUnionVariant1: JsonSchema = {
	type: 'object',
	properties: {
		type: {const: 'variant1'},
		value: {type: 'string'},
	},
	required: ['type', 'value'],
	additionalProperties: false,
};

export const discriminatedUnionVariant2: JsonSchema = {
	type: 'object',
	properties: {
		type: {const: 'variant2'},
		count: {type: 'number'},
	},
	required: ['type', 'count'],
	additionalProperties: false,
};

export const discriminatedUnionVariant3: JsonSchema = {
	type: 'object',
	properties: {
		type: {const: 'variant3'},
		enabled: {type: 'boolean'},
	},
	required: ['type', 'enabled'],
	additionalProperties: false,
};

export const discriminatedUnionDefinition: DiscriminatedUnion = {
	name: 'TestUnion',
	location: 'test.schema.json',
	discriminator: 'type',
	variants: [
		{value: 'variant1', type: 'Variant1'},
		{value: 'variant2', type: 'Variant2'},
		{value: 'variant3', type: 'Variant3'},
	],
};

/**
 * Config fixtures
 */
export const emptyConfig: Config = {
	version: '1.0.0',
	entryPoint: 'spec/specification.schema.json',
	fragments: {},
	discriminatedUnions: [],
};

export const configWithUnions: Config = {
	version: '1.0.0',
	entryPoint: 'spec/specification.schema.json',
	fragments: {},
	discriminatedUnions: [
		{
			name: 'TestUnion',
			location: 'test.schema.json',
			discriminator: 'type',
			variants: [
				{value: 'variant1', type: 'Variant1'},
				{value: 'variant2', type: 'Variant2'},
				{value: 'variant3', type: 'Variant3'},
			],
		},
		{
			name: 'DirectionUnion',
			location: 'test.schema.json',
			discriminator: 'direction',
			variants: [
				{value: 'horizontal', type: 'Horizontal'},
				{value: 'vertical', type: 'Vertical'},
			],
		},
	],
};

/**
 * Dependency graph test fixtures
 */
export const independentDefinitions: Record<string, JsonSchema> = {
	TypeA: {type: 'string'},
	TypeB: {type: 'number'},
	TypeC: {type: 'boolean'},
};

export const linearDependencies: Record<string, JsonSchema> = {
	TypeA: {type: 'string'},
	TypeB: {$ref: '#/definitions/TypeA'},
	TypeC: {
		type: 'object',
		properties: {
			b: {$ref: '#/definitions/TypeB'},
		},
	},
};

export const complexDependencies: Record<string, JsonSchema> = {
	Base: {type: 'string'},
	Left: {$ref: '#/definitions/Base'},
	Right: {$ref: '#/definitions/Base'},
	Combined: {
		type: 'object',
		properties: {
			left: {$ref: '#/definitions/Left'},
			right: {$ref: '#/definitions/Right'},
		},
	},
};

export const circularDependencies: Record<string, JsonSchema> = {
	Node: {
		type: 'object',
		properties: {
			value: {type: 'string'},
			children: {
				type: 'array',
				items: {$ref: '#/definitions/Node'},
			},
		},
	},
};

export const mutualCircularDependencies: Record<string, JsonSchema> = {
	TypeA: {
		type: 'object',
		properties: {
			b: {$ref: '#/definitions/TypeB'},
		},
	},
	TypeB: {
		type: 'object',
		properties: {
			a: {$ref: '#/definitions/TypeA'},
		},
	},
};

/**
 * Recursive schema fixtures
 */
export const selfReferencingSchema: JsonSchema = {
	type: 'object',
	properties: {
		value: {type: 'string'},
		next: {$ref: '#/definitions/SelfReferencing'},
	},
	additionalProperties: false,
};

export const recursiveArraySchema: JsonSchema = {
	type: 'object',
	properties: {
		name: {type: 'string'},
		children: {
			type: 'array',
			items: {$ref: '#/definitions/TreeNode'},
		},
	},
	required: ['name'],
	additionalProperties: false,
};

/**
 * Multi-line description fixtures
 */
export const multiLineDescriptionSchema: JsonSchema = {
	type: 'string',
	description: 'This is a multi-line description.\nIt spans multiple lines.\nAnd should be formatted correctly.',
};

/**
 * Invalid/edge case fixtures for error testing
 */
export const invalidRefSchema: JsonSchema = {
	$ref: 'invalid-ref-format',
};

export const definitionsWithMissingVariants: Record<string, JsonSchema> = {
	Variant1: discriminatedUnionVariant1,
	// Variant2 and Variant3 missing - these are the type names that should exist
};
