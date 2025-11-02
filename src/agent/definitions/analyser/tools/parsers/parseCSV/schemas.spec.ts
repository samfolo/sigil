import {describe, expect, it} from 'vitest';

import {ParseCSVStructureMetadataDetailsSchema} from './schemas';

describe('ParseCSVStructureMetadataDetailsSchema', () => {
	const SIZE = {bytes: 50, characters: 50, lines: 3};
	const COL = {index: 0, content: {value: 'name', exact: true}};
	const METADATA = {structure: 'array', rowCount: 3, columnCount: 2, columns: [COL, {index: 1, content: {value: 'age', exact: true}}], size: SIZE};

	it.each([
		// Success cases with CSV-specific metadata
		{description: 'valid CSV with columns', input: {valid: true, metadata: METADATA}, valid: true},
		{description: 'valid CSV with empty columns', input: {valid: true, metadata: {...METADATA, rowCount: 0, columns: []}}, valid: true},
		{description: 'valid CSV with truncated columns', input: {valid: true, metadata: {...METADATA, columns: [{index: 0, content: {value: 'col...', exact: false}}]}}, valid: true},

		// Failure case
		{description: 'valid failure with error', input: {valid: false, error: 'Invalid CSV'}, valid: true},

		// Invalid CSV metadata
		{description: 'negative rowCount', input: {valid: true, metadata: {...METADATA, rowCount: -1}}, valid: false},
		{description: 'float rowCount', input: {valid: true, metadata: {...METADATA, rowCount: 1.5}}, valid: false},
		{description: 'negative columnCount', input: {valid: true, metadata: {...METADATA, columnCount: -1}}, valid: false},
		{description: 'missing columns', input: {valid: true, metadata: {structure: 'array', rowCount: 3, columnCount: 2, size: SIZE}}, valid: false},
		{description: 'missing rowCount', input: {valid: true, metadata: {structure: 'array', columnCount: 2, columns: [COL], size: SIZE}}, valid: false},
	])('$description', ({input, valid}) => {
		const result = ParseCSVStructureMetadataDetailsSchema.safeParse(input);
		expect(result.success).toBe(valid);
	});
});
