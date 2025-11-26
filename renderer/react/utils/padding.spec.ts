import {describe, expect, it} from 'vitest';

import {getPaddingStyle} from './padding';

describe('getPaddingStyle', () => {
	it('returns uniform padding for number input', () => {
		expect(getPaddingStyle(16)).toEqual({padding: '16px'});
	});

	it('returns individual sides for object input with all sides', () => {
		expect(getPaddingStyle({top: 8, right: 16, bottom: 8, left: 16})).toEqual({
			paddingTop: '8px',
			paddingRight: '16px',
			paddingBottom: '8px',
			paddingLeft: '16px',
		});
	});

	it('handles partial object input', () => {
		expect(getPaddingStyle({top: 8, left: 16})).toEqual({
			paddingTop: '8px',
			paddingLeft: '16px',
		});
	});

	it('handles zero values', () => {
		expect(getPaddingStyle({top: 0, right: 0, bottom: 0, left: 0})).toEqual({
			paddingTop: '0px',
			paddingRight: '0px',
			paddingBottom: '0px',
			paddingLeft: '0px',
		});
	});

	it('returns empty object for undefined', () => {
		expect(getPaddingStyle(undefined)).toEqual({});
	});

	it('returns uniform padding for zero', () => {
		expect(getPaddingStyle(0)).toEqual({padding: '0px'});
	});
});
