import {describe, expect, it} from 'vitest';

import {objectToEntries} from '@sigil/renderer/react/common';

import {ALIGNMENT_CLASS_MAP, getAlignmentClass} from './alignment';

describe('getAlignmentClass', () => {
	it.each(objectToEntries(ALIGNMENT_CLASS_MAP))('returns %s for %s', (alignment, expected) => {
		expect(getAlignmentClass(alignment)).toBe(expected);
	});

	it('returns undefined for undefined input', () => {
		expect(getAlignmentClass(undefined)).toBeUndefined();
	});
});
