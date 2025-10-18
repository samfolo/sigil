/**
 * Tests for error type predicates
 */

import {describe, expect, it} from 'vitest';

import {ERROR_CODES} from '@sigil/src/common/errors/codes';
import type {SpecError} from '@sigil/src/common/errors/types';

import {isSpecErrorArray} from './predicates';

describe('isSpecErrorArray', () => {
	describe('valid SpecError arrays', () => {
		it('should return true for valid SpecError array with single error', () => {
			const errors: SpecError[] = [
				{
					code: ERROR_CODES.EMPTY_LAYOUT,
					severity: 'error',
					category: 'spec',
					path: '$.layout',
					context: {layoutType: 'vertical'},
				},
			];

			expect(isSpecErrorArray(errors)).toBe(true);
		});

		it('should return true for valid SpecError array with multiple errors', () => {
			const errors: SpecError[] = [
				{
					code: ERROR_CODES.EMPTY_LAYOUT,
					severity: 'error',
					category: 'spec',
					path: '$.layout',
					context: {layoutType: 'vertical'},
				},
				{
					code: ERROR_CODES.MISSING_COMPONENT,
					severity: 'error',
					category: 'spec',
					path: '$.components',
					context: {componentId: 'Button'},
				},
			];

			expect(isSpecErrorArray(errors)).toBe(true);
		});

		it('should return true for array with code property even if not fully valid SpecError', () => {
			const partialErrors = [{code: 'SOME_CODE', otherProp: 'value'}];

			// Type guard only checks for array, length > 0, and 'code' property
			expect(isSpecErrorArray(partialErrors)).toBe(true);
		});
	});

	describe('empty arrays', () => {
		it('should return false for empty array', () => {
			expect(isSpecErrorArray([])).toBe(false);
		});
	});

	describe('non-array values', () => {
		it.each([
			{description: 'null', value: null},
			{description: 'undefined', value: undefined},
			{description: 'string', value: 'error message'},
			{description: 'number', value: 42},
			{description: 'boolean', value: true},
			{description: 'object', value: {code: 'ERROR', message: 'test'}},
			{description: 'Error instance', value: new Error('test')},
		])('should return false for $description', ({value}) => {
			expect(isSpecErrorArray(value)).toBe(false);
		});
	});

	describe('arrays without code property', () => {
		it.each([
			{
				description: 'objects without code',
				value: [{message: 'error 1', severity: 'error'}],
			},
			{
				description: 'strings',
				value: ['error1', 'error2'],
			},
			{
				description: 'numbers',
				value: [1, 2, 3],
			},
			{
				description: 'primitives',
				value: [true, false, null],
			},
			{
				description: 'null as first element',
				value: [null],
			},
			{
				description: 'undefined as first element',
				value: [undefined],
			},
			{
				description: 'empty object as first element',
				value: [{}],
			},
		])('should return false for array of $description', ({value}) => {
			expect(isSpecErrorArray(value)).toBe(false);
		});
	});

	describe('edge cases', () => {
		it('should return true even if subsequent elements lack code property', () => {
			const mixed = [{code: 'ERROR_CODE'}, {message: 'no code here'}];

			// Type guard only checks first element
			expect(isSpecErrorArray(mixed)).toBe(true);
		});

		it.each([
			{description: 'null', value: [{code: null}]},
			{description: 'undefined', value: [{code: undefined}]},
		])(
			'should return true when code property is $description',
			({value}) => {
				// 'code' in object returns true even if value is null/undefined
				expect(isSpecErrorArray(value)).toBe(true);
			}
		);
	});

	describe('type narrowing', () => {
		it('should narrow type to SpecError[] when true', () => {
			const value: unknown = [
				{
					code: ERROR_CODES.EMPTY_LAYOUT,
					severity: 'error',
					category: 'spec',
					path: '$.layout',
					context: {layoutType: 'vertical'},
				},
			];

			if (isSpecErrorArray(value)) {
				// TypeScript should know value is SpecError[]
				const firstError: SpecError = value[0];
				expect(firstError.code).toBe(ERROR_CODES.EMPTY_LAYOUT);
			}
		});
	});
});
