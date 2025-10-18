/**
 * Tests for SpecProcessingError exception class
 */

import {describe, expect, it} from 'vitest';

import {ERROR_CODES} from '@sigil/src/common/errors/codes';
import type {SpecError} from '@sigil/src/common/errors/types';

import {SpecProcessingError} from './exception';
import {formatError, formatErrorsForModel} from './format';

describe('SpecProcessingError', () => {
	describe('constructor', () => {
		it('should set name property to SpecProcessingError', () => {
			const errors: SpecError[] = [
				{
					code: ERROR_CODES.EMPTY_LAYOUT,
					severity: 'error',
					category: 'spec',
					path: '$.layout',
					context: {layoutType: 'vertical'},
				},
			];

			const error = new SpecProcessingError(errors);
			expect(error.name).toBe('SpecProcessingError');
		});

		it('should store errors array', () => {
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

			const error = new SpecProcessingError(errors);
			expect(error.errors).toBe(errors);
			expect(error.errors).toHaveLength(2);
		});

		it('should be instance of Error', () => {
			const errors: SpecError[] = [
				{
					code: ERROR_CODES.EMPTY_LAYOUT,
					severity: 'error',
					category: 'spec',
					path: '$.layout',
					context: {layoutType: 'vertical'},
				},
			];

			const error = new SpecProcessingError(errors);
			expect(error).toBeInstanceOf(Error);
			expect(error).toBeInstanceOf(SpecProcessingError);
		});
	});

	describe('message generation', () => {
		it('should use formatError for single error without custom message', () => {
			const errors: SpecError[] = [
				{
					code: ERROR_CODES.EMPTY_LAYOUT,
					severity: 'error',
					category: 'spec',
					path: '$.layout',
					context: {layoutType: 'vertical'},
				},
			];

			const error = new SpecProcessingError(errors);
			expect(error.message).toBe(formatError(errors[0]));
		});

		it('should use formatErrorsForModel for multiple errors without custom message', () => {
			const errors: SpecError[] = [
				{
					code: ERROR_CODES.EMPTY_LAYOUT,
					severity: 'error',
					category: 'spec',
					path: '$.layout1',
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

			const error = new SpecProcessingError(errors);
			expect(error.message).toBe(
				`Failed to build render tree:\n\n${formatErrorsForModel(errors)}`
			);
		});

		it('should use custom message when provided for single error', () => {
			const errors: SpecError[] = [
				{
					code: ERROR_CODES.EMPTY_LAYOUT,
					severity: 'error',
					category: 'spec',
					path: '$.layout',
					context: {layoutType: 'vertical'},
				},
			];

			const customMessage = 'Custom error message';
			const error = new SpecProcessingError(errors, customMessage);
			expect(error.message).toBe(customMessage);
		});

		it('should use custom message when provided for multiple errors', () => {
			const errors: SpecError[] = [
				{
					code: ERROR_CODES.EMPTY_LAYOUT,
					severity: 'error',
					category: 'spec',
					path: '$.layout1',
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

			const customMessage = 'Custom error message for multiple errors';
			const error = new SpecProcessingError(errors, customMessage);
			expect(error.message).toBe(customMessage);
		});
	});

	describe('edge cases', () => {
		it('should handle empty errors array', () => {
			const errors: SpecError[] = [];

			const error = new SpecProcessingError(errors);
			expect(error.errors).toHaveLength(0);
			// With empty array, formatErrorsForModel returns empty string
			expect(error.message).toBe('Failed to build render tree:\n\n');
		});

		it('should handle error with suggestion', () => {
			const errors: SpecError[] = [
				{
					code: ERROR_CODES.MISSING_COMPONENT,
					severity: 'error',
					category: 'spec',
					path: '$.components',
					context: {componentId: 'Button'},
					suggestion: 'Check component registry',
				},
			];

			const error = new SpecProcessingError(errors);
			// Should include suggestion from formatError
			expect(error.message).toContain('Check component registry');
		});

		it('should preserve error stack trace', () => {
			const errors: SpecError[] = [
				{
					code: ERROR_CODES.EMPTY_LAYOUT,
					severity: 'error',
					category: 'spec',
					path: '$.layout',
					context: {layoutType: 'vertical'},
				},
			];

			const error = new SpecProcessingError(errors);
			expect(error.stack).toBeDefined();
			expect(error.stack).toContain('SpecProcessingError');
		});
	});
});
