import {describe, expect, it} from 'vitest';

import {ParseJSONStructureMetadataDetailsSchema} from './schemas';

describe('ParseJSONStructureMetadataDetailsSchema', () => {
	const SIZE = {bytes: 10, characters: 10, lines: 1};
	const DEPTH = {value: 1, exact: true};
	const METADATA_STRING = {structure: 'string', size: SIZE};
	const METADATA_OBJECT = {structure: 'object', topLevelKeys: [{value: 'name', exact: true}], totalKeyCount: 1, depth: DEPTH, size: SIZE};

	it.each([
		// Success cases
		{description: 'valid success with string metadata', input: {valid: true, metadata: METADATA_STRING}, valid: true},
		{description: 'valid success with object metadata', input: {valid: true, metadata: METADATA_OBJECT}, valid: true},

		// Failure cases
		{description: 'valid failure with error', input: {valid: false, error: 'Parse error'}, valid: true},
		{description: 'failure with empty error (permissive)', input: {valid: false, error: ''}, valid: true},
		{description: 'failure without error', input: {valid: false}, valid: false},

		// Invalid discriminated union
		{description: 'missing valid field', input: {metadata: METADATA_STRING}, valid: false},
		{description: 'success without metadata', input: {valid: true}, valid: false},
	])('$description', ({input, valid}) => {
		const result = ParseJSONStructureMetadataDetailsSchema.safeParse(input);
		expect(result.success).toBe(valid);
	});
});
