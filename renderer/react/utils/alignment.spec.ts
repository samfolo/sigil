import {describe, expect, it} from 'vitest';

import {getAlignmentClass} from './alignment';

describe('getAlignmentClass', () => {
	it('returns items-start for start', () => {
		expect(getAlignmentClass('start')).toBe('items-start');
	});

	it('returns items-center for center', () => {
		expect(getAlignmentClass('center')).toBe('items-center');
	});

	it('returns items-end for end', () => {
		expect(getAlignmentClass('end')).toBe('items-end');
	});

	it('returns items-stretch for stretch', () => {
		expect(getAlignmentClass('stretch')).toBe('items-stretch');
	});

	it('returns undefined for undefined input', () => {
		expect(getAlignmentClass(undefined)).toBeUndefined();
	});
});
