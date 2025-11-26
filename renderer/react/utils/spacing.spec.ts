import {describe, expect, it} from 'vitest';

import {objectToEntries} from '@sigil/renderer/react/common';

import {
	COLUMN_GAP_CLASS_MAP,
	ROW_GAP_CLASS_MAP,
	SPACING_CLASS_MAP,
	getColumnGapClass,
	getRowGapClass,
	getSpacingClass,
} from './spacing';

describe('getSpacingClass', () => {
	it.each(objectToEntries(SPACING_CLASS_MAP))('returns %s for %s', (spacing, expected) => {
		expect(getSpacingClass(spacing)).toBe(expected);
	});
});

describe('getColumnGapClass', () => {
	it.each(objectToEntries(COLUMN_GAP_CLASS_MAP))('returns %s for %s', (spacing, expected) => {
		expect(getColumnGapClass(spacing)).toBe(expected);
	});
});

describe('getRowGapClass', () => {
	it.each(objectToEntries(ROW_GAP_CLASS_MAP))('returns %s for %s', (spacing, expected) => {
		expect(getRowGapClass(spacing)).toBe(expected);
	});
});
