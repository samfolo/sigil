import {describe, expect, it} from 'vitest';

import {ParseXMLStructureMetadataDetailsSchema} from './schemas';

describe('ParseXMLStructureMetadataDetailsSchema', () => {
	const SIZE = {bytes: 100, characters: 100, lines: 5};
	const DEPTH = {value: 2, exact: true};
	const TAG = {value: 'user', exact: true};
	const METADATA = {structure: 'object', rootElement: 'root', topLevelNodeTags: [TAG], depth: DEPTH, size: SIZE};

	it.each([
		// Success cases with XML-specific metadata
		{description: 'valid XML with root element', input: {valid: true, metadata: METADATA}, valid: true},
		{description: 'valid XML fragment', input: {valid: true, metadata: {...METADATA, rootElement: '<<fragment>>'}}, valid: true},
		{description: 'valid XML with empty tags', input: {valid: true, metadata: {...METADATA, topLevelNodeTags: []}}, valid: true},
		{description: 'valid XML with truncated tags', input: {valid: true, metadata: {...METADATA, topLevelNodeTags: [{value: 'tag...', exact: false}]}}, valid: true},

		// Failure case
		{description: 'valid failure with error', input: {valid: false, error: 'Invalid XML'}, valid: true},

		// Invalid XML metadata
		{description: 'missing rootElement', input: {valid: true, metadata: {structure: 'object', topLevelNodeTags: [TAG], depth: DEPTH, size: SIZE}}, valid: false},
		{description: 'missing topLevelNodeTags', input: {valid: true, metadata: {structure: 'object', rootElement: 'root', depth: DEPTH, size: SIZE}}, valid: false},
		{description: 'empty rootElement (permissive)', input: {valid: true, metadata: {...METADATA, rootElement: ''}}, valid: true},
	])('$description', ({input, valid}) => {
		const result = ParseXMLStructureMetadataDetailsSchema.safeParse(input);
		expect(result.success).toBe(valid);
	});
});
