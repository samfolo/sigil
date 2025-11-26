import {describe, expect, it} from 'vitest';

import {getColumnGapClass, getRowGapClass, getSpacingClass} from './spacing';

describe('getSpacingClass', () => {
	it('returns gap-2 for tight', () => {
		expect(getSpacingClass('tight')).toBe('gap-2');
	});

	it('returns gap-4 for normal', () => {
		expect(getSpacingClass('normal')).toBe('gap-4');
	});

	it('returns gap-6 for relaxed', () => {
		expect(getSpacingClass('relaxed')).toBe('gap-6');
	});
});

describe('getColumnGapClass', () => {
	it('returns gap-x-2 for tight', () => {
		expect(getColumnGapClass('tight')).toBe('gap-x-2');
	});

	it('returns gap-x-4 for normal', () => {
		expect(getColumnGapClass('normal')).toBe('gap-x-4');
	});

	it('returns gap-x-6 for relaxed', () => {
		expect(getColumnGapClass('relaxed')).toBe('gap-x-6');
	});
});

describe('getRowGapClass', () => {
	it('returns gap-y-2 for tight', () => {
		expect(getRowGapClass('tight')).toBe('gap-y-2');
	});

	it('returns gap-y-4 for normal', () => {
		expect(getRowGapClass('normal')).toBe('gap-y-4');
	});

	it('returns gap-y-6 for relaxed', () => {
		expect(getRowGapClass('relaxed')).toBe('gap-y-6');
	});
});
