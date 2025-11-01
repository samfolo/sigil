import {describe, expect, it} from 'vitest';

import {StructureMetadataSchema} from './schemas';

describe('StructureMetadataSchema', () => {
	const SIZE = {bytes: 10, characters: 10, lines: 1};
	const DEPTH = {value: 1, exact: true};
	const DEPTH_INEXACT = {value: 5, exact: false};
	const KEY = {value: 'key', exact: true};

	it.each([
		// Primitives
		{description: 'string primitive', input: {structure: 'string', size: SIZE}, valid: true},
		{description: 'number primitive', input: {structure: 'number', size: SIZE}, valid: true},
		{description: 'boolean primitive', input: {structure: 'boolean', size: SIZE}, valid: true},
		{description: 'null primitive', input: {structure: 'null', size: SIZE}, valid: true},
		{description: 'primitive without size', input: {structure: 'string'}, valid: false},
		{description: 'primitive with extra fields (permissive)', input: {structure: 'string', depth: DEPTH, size: SIZE}, valid: true},

		// Arrays
		{description: 'array with all fields', input: {structure: 'array', elementCount: 3, depth: DEPTH, size: SIZE}, valid: true},
		{description: 'empty array', input: {structure: 'array', elementCount: 0, depth: DEPTH, size: SIZE}, valid: true},
		{description: 'array with inexact depth', input: {structure: 'array', elementCount: 100, depth: DEPTH_INEXACT, size: SIZE}, valid: true},
		{description: 'array without depth', input: {structure: 'array', elementCount: 3, size: SIZE}, valid: false},
		{description: 'array with negative elementCount', input: {structure: 'array', elementCount: -1, depth: DEPTH, size: SIZE}, valid: false},
		{description: 'array with float elementCount', input: {structure: 'array', elementCount: 1.5, depth: DEPTH, size: SIZE}, valid: false},

		// Objects
		{description: 'object with all fields', input: {structure: 'object', topLevelKeys: [KEY], totalKeyCount: 1, depth: DEPTH, size: SIZE}, valid: true},
		{description: 'empty object', input: {structure: 'object', topLevelKeys: [], totalKeyCount: 0, depth: DEPTH, size: SIZE}, valid: true},
		{description: 'object with truncated keys', input: {structure: 'object', topLevelKeys: [{value: 'k...', exact: false}], totalKeyCount: 50, depth: DEPTH_INEXACT, size: SIZE}, valid: true},
		{description: 'object without depth', input: {structure: 'object', topLevelKeys: [KEY], totalKeyCount: 1, size: SIZE}, valid: false},
		{description: 'object with negative totalKeyCount', input: {structure: 'object', topLevelKeys: [], totalKeyCount: -1, depth: DEPTH, size: SIZE}, valid: false},
		{description: 'object with float totalKeyCount', input: {structure: 'object', topLevelKeys: [], totalKeyCount: 2.5, depth: DEPTH, size: SIZE}, valid: false},

		// Discriminated union
		{description: 'unknown structure type', input: {structure: 'unknown', size: SIZE}, valid: false},
		{description: 'missing structure field', input: {size: SIZE}, valid: false},
	])('$description', ({input, valid}) => {
		const result = StructureMetadataSchema.safeParse(input);
		expect(result.success).toBe(valid);
	});
});
