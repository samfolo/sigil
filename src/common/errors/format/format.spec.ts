/**
 * Tests for error formatting utilities
 */

import {describe, expect, it} from 'vitest';

import type {SpecError} from '@sigil/src/common/errors/types';
import {ERROR_CODES} from '@sigil/src/common/errors/codes';

import {formatError, formatErrorsForModel} from './format';

describe('formatError', () => {
	describe('MISSING_COMPONENT', () => {
		it('should format with valid context', () => {
			const error: SpecError = {
				code: ERROR_CODES.MISSING_COMPONENT,
				severity: 'error',
				category: 'spec',
				path: '$.components.layout',
				context: {
					componentId: 'DataTable',
					availableComponents: ['Button', 'Input', 'Text'],
				},
			};

			expect(formatError(error)).toBe(
				'Missing component; was given "DataTable" but available components are "Button" | "Input" | "Text" at $.components.layout'
			);
		});

		it('should handle missing componentId', () => {
			const error: SpecError = {
				code: ERROR_CODES.MISSING_COMPONENT,
				severity: 'error',
				category: 'spec',
				path: '$.components',
				context: {
					availableComponents: ['Button'],
				},
			};

			expect(formatError(error)).toBe(
				'Missing component; was given "unknown" but available components are "Button" at $.components'
			);
		});

		it('should handle empty availableComponents', () => {
			const error: SpecError = {
				code: ERROR_CODES.MISSING_COMPONENT,
				severity: 'error',
				category: 'spec',
				path: '$.components',
				context: {
					componentId: 'DataTable',
					availableComponents: [],
				},
			};

			expect(formatError(error)).toBe(
				'Missing component; was given "DataTable" but available components are (none available) at $.components'
			);
		});

		it('should handle undefined availableComponents', () => {
			const error: SpecError = {
				code: ERROR_CODES.MISSING_COMPONENT,
				severity: 'error',
				category: 'spec',
				path: '$.components',
				context: {
					componentId: 'DataTable',
				},
			};

			expect(formatError(error)).toBe(
				'Missing component; was given "DataTable" but available components are (none available) at $.components'
			);
		});

		it('should append suggestion when present', () => {
			const error: SpecError = {
				code: ERROR_CODES.MISSING_COMPONENT,
				severity: 'error',
				category: 'spec',
				path: '$.components',
				context: {
					componentId: 'DataTable',
					availableComponents: ['Button'],
				},
				suggestion: 'Check component registry',
			};

			expect(formatError(error)).toBe(
				'Missing component; was given "DataTable" but available components are "Button" at $.components. Check component registry'
			);
		});
	});

	describe('MISSING_ARRAY_PROPERTY', () => {
		it('should format with valid context', () => {
			const error: SpecError = {
				code: ERROR_CODES.MISSING_ARRAY_PROPERTY,
				severity: 'error',
				category: 'data',
				path: '$.data',
				context: {
					attemptedProperties: ['items', 'rows', 'data'],
					objectKeys: ['name', 'value'],
				},
			};

			expect(formatError(error)).toBe(
				'No array property found; checked "items", "rows", "data" but object has keys "name", "value" at $.data'
			);
		});

		it('should handle empty arrays', () => {
			const error: SpecError = {
				code: ERROR_CODES.MISSING_ARRAY_PROPERTY,
				severity: 'error',
				category: 'data',
				path: '$.data',
				context: {
					attemptedProperties: [],
					objectKeys: [],
				},
			};

			expect(formatError(error)).toBe(
				'No array property found; checked (none checked) but object has keys (no keys) at $.data'
			);
		});
	});

	describe('UNKNOWN_LAYOUT_TYPE', () => {
		it('should format with valid context', () => {
			const error: SpecError = {
				code: ERROR_CODES.UNKNOWN_LAYOUT_TYPE,
				severity: 'error',
				category: 'spec',
				path: '$.layout',
				context: {
					layoutType: 'grid',
					validTypes: ['vertical', 'horizontal', 'stack'],
				},
			};

			expect(formatError(error)).toBe(
				'Unknown layout type; was given "grid" but valid types are "vertical" | "horizontal" | "stack" at $.layout'
			);
		});
	});

	describe('UNKNOWN_LAYOUT_CHILD_TYPE', () => {
		it('should format with valid context', () => {
			const error: SpecError = {
				code: ERROR_CODES.UNKNOWN_LAYOUT_CHILD_TYPE,
				severity: 'error',
				category: 'spec',
				path: '$.layout.children[0]',
				context: {
					childType: 'widget',
					validTypes: ['component', 'layout'],
				},
			};

			expect(formatError(error)).toBe(
				'Unknown layout child type; was given "widget" but valid types are "component" | "layout" at $.layout.children[0]'
			);
		});
	});

	describe('INVALID_ACCESSOR', () => {
		it('should format with valid context', () => {
			const error: SpecError = {
				code: ERROR_CODES.INVALID_ACCESSOR,
				severity: 'error',
				category: 'data',
				path: '$.bindings.field',
				context: {
					accessor: '$.user..name',
					reason: 'Double dots not allowed',
				},
			};

			expect(formatError(error)).toBe(
				'Invalid accessor "$.user..name"; Double dots not allowed at $.bindings.field'
			);
		});

		it('should handle missing reason', () => {
			const error: SpecError = {
				code: ERROR_CODES.INVALID_ACCESSOR,
				severity: 'error',
				category: 'data',
				path: '$.bindings',
				context: {
					accessor: '$.invalid',
				},
			};

			expect(formatError(error)).toBe(
				'Invalid accessor "$.invalid" at $.bindings'
			);
		});
	});

	describe('EXPECTED_SINGLE_VALUE', () => {
		it('should format with valid context', () => {
			const error: SpecError = {
				code: ERROR_CODES.EXPECTED_SINGLE_VALUE,
				severity: 'error',
				category: 'data',
				path: '$.bindings.value',
				context: {
					accessor: '$.users[*].name',
					resultCount: 5,
				},
			};

			expect(formatError(error)).toBe(
				'Expected single value but accessor "$.users[*].name" returned 5 items at $.bindings.value'
			);
		});

		it('should handle missing resultCount', () => {
			const error: SpecError = {
				code: ERROR_CODES.EXPECTED_SINGLE_VALUE,
				severity: 'error',
				category: 'data',
				path: '$.bindings',
				context: {
					accessor: '$.test',
				},
			};

			expect(formatError(error)).toBe(
				'Expected single value but accessor "$.test" returned 0 items at $.bindings'
			);
		});
	});

	describe('FIELD_REQUIRED', () => {
		it('should format with availableFields', () => {
			const error: SpecError = {
				code: ERROR_CODES.FIELD_REQUIRED,
				severity: 'error',
				category: 'spec',
				path: '$.component',
				context: {
					operation: 'sort',
					availableFields: ['name', 'age', 'email'],
				},
			};

			expect(formatError(error)).toBe(
				'Field required for operation "sort"; available fields are "name" | "age" | "email" at $.component'
			);
		});

		it('should format without availableFields', () => {
			const error: SpecError = {
				code: ERROR_CODES.FIELD_REQUIRED,
				severity: 'error',
				category: 'spec',
				path: '$.component',
				context: {
					operation: 'filter',
				},
			};

			expect(formatError(error)).toBe(
				'Field required for operation "filter" at $.component'
			);
		});

		it('should not append fields when array is empty', () => {
			const error: SpecError = {
				code: ERROR_CODES.FIELD_REQUIRED,
				severity: 'error',
				category: 'spec',
				path: '$.component',
				context: {
					operation: 'filter',
					availableFields: [],
				},
			};

			expect(formatError(error)).toBe(
				'Field required for operation "filter" at $.component'
			);
		});
	});

	describe('EMPTY_LAYOUT', () => {
		it('should format with valid context', () => {
			const error: SpecError = {
				code: ERROR_CODES.EMPTY_LAYOUT,
				severity: 'warning',
				category: 'spec',
				path: '$.layout',
				context: {
					layoutType: 'vertical',
				},
			};

			expect(formatError(error)).toBe(
				'Empty layout; vertical layout has no children at $.layout'
			);
		});

		it('should handle missing layoutType', () => {
			const error: SpecError = {
				code: ERROR_CODES.EMPTY_LAYOUT,
				severity: 'warning',
				category: 'spec',
				path: '$.layout',
				context: {},
			};

			expect(formatError(error)).toBe(
				'Empty layout; unknown layout has no children at $.layout'
			);
		});
	});

	describe('NOT_ARRAY', () => {
		it('should format with value', () => {
			const error: SpecError = {
				code: ERROR_CODES.NOT_ARRAY,
				severity: 'error',
				category: 'data',
				path: '$.data.items',
				context: {
					actualType: 'object',
					value: {name: 'John', age: 30},
				},
			};

			expect(formatError(error)).toBe(
				'Expected array but got object (value: {"name":"John","age":30}) at $.data.items'
			);
		});

		it('should truncate long values', () => {
			const longValue = 'a'.repeat(200);
			const error: SpecError = {
				code: ERROR_CODES.NOT_ARRAY,
				severity: 'error',
				category: 'data',
				path: '$.data',
				context: {
					actualType: 'string',
					value: longValue,
				},
			};

			const result = formatError(error);
			// JSON.stringify adds quotes around the string ("aaa..."), then we truncate at 100 chars
			// Slice(0, 100) gives us: "aaa... (opening quote + 99 'a's)
			expect(result).toBe(
				`Expected array but got string (value: "${'a'.repeat(99)}...) at $.data`
			);
		});

		it('should handle circular references gracefully', () => {
			const circular: Record<string, unknown> = {};
			circular.self = circular;

			const error: SpecError = {
				code: ERROR_CODES.NOT_ARRAY,
				severity: 'error',
				category: 'data',
				path: '$.data',
				context: {
					actualType: 'object',
					value: circular,
				},
			};

			expect(formatError(error)).toBe(
				'Expected array but got object (value: (unstringifiable)) at $.data'
			);
		});

		it('should work without value', () => {
			const error: SpecError = {
				code: ERROR_CODES.NOT_ARRAY,
				severity: 'error',
				category: 'data',
				path: '$.data',
				context: {
					actualType: 'string',
				},
			};

			expect(formatError(error)).toBe('Expected array but got string at $.data');
		});
	});

	describe('QUERY_ERROR', () => {
		it('should format with dataType', () => {
			const error: SpecError = {
				code: ERROR_CODES.QUERY_ERROR,
				severity: 'error',
				category: 'data',
				path: '$.bindings.data',
				context: {
					jsonPath: '$.users[?(@.age > 18)]',
					reason: 'Invalid filter expression',
					dataType: 'array',
				},
			};

			expect(formatError(error)).toBe(
				'JSONPath query failed for "$.users[?(@.age > 18)]"; Invalid filter expression (attempted on array) at $.bindings.data'
			);
		});

		it('should format without dataType', () => {
			const error: SpecError = {
				code: ERROR_CODES.QUERY_ERROR,
				severity: 'error',
				category: 'data',
				path: '$.bindings',
				context: {
					jsonPath: '$.invalid',
					reason: 'Syntax error',
				},
			};

			expect(formatError(error)).toBe(
				'JSONPath query failed for "$.invalid"; Syntax error at $.bindings'
			);
		});
	});

	describe('TYPE_MISMATCH', () => {
		it('should format with nodeId', () => {
			const error: SpecError = {
				code: ERROR_CODES.TYPE_MISMATCH,
				severity: 'error',
				category: 'spec',
				path: '$.component.props.value',
				context: {
					expected: 'string',
					actual: 'number',
					nodeId: 'comp-123',
				},
			};

			expect(formatError(error)).toBe(
				'Type mismatch; expected "string" but got "number" (node: comp-123) at $.component.props.value'
			);
		});

		it('should format without nodeId', () => {
			const error: SpecError = {
				code: ERROR_CODES.TYPE_MISMATCH,
				severity: 'error',
				category: 'spec',
				path: '$.data',
				context: {
					expected: 'array',
					actual: 'object',
				},
			};

			expect(formatError(error)).toBe(
				'Type mismatch; expected "array" but got "object" at $.data'
			);
		});
	});

	describe('edge cases', () => {
		it('should handle empty path', () => {
			const error: SpecError = {
				code: ERROR_CODES.EMPTY_LAYOUT,
				severity: 'warning',
				category: 'spec',
				path: '',
				context: {
					layoutType: 'stack',
				},
			};

			expect(formatError(error)).toBe(
				'Empty layout; stack layout has no children at (no path)'
			);
		});

		it('should handle unicode in messages', () => {
			const error: SpecError = {
				code: ERROR_CODES.MISSING_COMPONENT,
				severity: 'error',
				category: 'spec',
				path: '$.components',
				context: {
					componentId: 'データテーブル',
					availableComponents: ['ボタン', '入力'],
				},
			};

			expect(formatError(error)).toBe(
				'Missing component; was given "データテーブル" but available components are "ボタン" | "入力" at $.components'
			);
		});

		it('should handle empty string values', () => {
			const error: SpecError = {
				code: ERROR_CODES.INVALID_ACCESSOR,
				severity: 'error',
				category: 'data',
				path: '$.bindings',
				context: {
					accessor: '',
					reason: '',
				},
			};

			expect(formatError(error)).toBe('Invalid accessor "" at $.bindings');
		});
	});
});

describe('formatErrorsForModel', () => {
	it('should return empty string for empty array', () => {
		expect(formatErrorsForModel([])).toBe('');
	});

	it('should format single error', () => {
		const errors: SpecError[] = [
			{
				code: ERROR_CODES.EMPTY_LAYOUT,
				severity: 'error',
				category: 'spec',
				path: '$.layout',
				context: {
					layoutType: 'vertical',
				},
			},
		];

		expect(formatErrorsForModel(errors)).toBe(
			`## Errors (1)\n- Empty layout; vertical layout has no children at $.layout`
		);
	});

	it('should format multiple errors of same severity', () => {
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
				context: {componentId: 'Button', availableComponents: []},
			},
		];

		expect(formatErrorsForModel(errors)).toBe(
			`## Errors (2)\n- Empty layout; vertical layout has no children at $.layout1\n- Missing component; was given "Button" but available components are (none available) at $.components`
		);
	});

	it('should group by severity correctly', () => {
		const errors: SpecError[] = [
			{
				code: ERROR_CODES.EMPTY_LAYOUT,
				severity: 'warning',
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
			{
				code: ERROR_CODES.TYPE_MISMATCH,
				severity: 'error',
				category: 'spec',
				path: '$.data',
				context: {expected: 'string', actual: 'number'},
			},
		];

		expect(formatErrorsForModel(errors)).toBe(
			`## Errors (2)\n- Missing component; was given "Button" but available components are (none available) at $.components\n- Type mismatch; expected "string" but got "number" at $.data\n\n## Warnings (1)\n- Empty layout; vertical layout has no children at $.layout1`
		);
	});

	it('should order sections with errors first', () => {
		const errors: SpecError[] = [
			{
				code: ERROR_CODES.EMPTY_LAYOUT,
				severity: 'warning',
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

		const result = formatErrorsForModel(errors);
		const errorIndex = result.indexOf('## Errors');
		const warningIndex = result.indexOf('## Warnings');
		expect(errorIndex).toBeLessThan(warningIndex);
	});

	it('should separate sections with empty line', () => {
		const errors: SpecError[] = [
			{
				code: ERROR_CODES.MISSING_COMPONENT,
				severity: 'error',
				category: 'spec',
				path: '$.components',
				context: {componentId: 'Button'},
			},
			{
				code: ERROR_CODES.EMPTY_LAYOUT,
				severity: 'warning',
				category: 'spec',
				path: '$.layout',
				context: {layoutType: 'vertical'},
			},
		];

		expect(formatErrorsForModel(errors)).toBe(
			`## Errors (1)\n- Missing component; was given "Button" but available components are (none available) at $.components\n\n## Warnings (1)\n- Empty layout; vertical layout has no children at $.layout`
		);
	});

	it('should handle only warnings', () => {
		const errors: SpecError[] = [
			{
				code: ERROR_CODES.EMPTY_LAYOUT,
				severity: 'warning',
				category: 'spec',
				path: '$.layout',
				context: {layoutType: 'vertical'},
			},
		];

		expect(formatErrorsForModel(errors)).toBe(
			`## Warnings (1)\n- Empty layout; vertical layout has no children at $.layout`
		);
	});

	it('should handle only errors', () => {
		const errors: SpecError[] = [
			{
				code: ERROR_CODES.MISSING_COMPONENT,
				severity: 'error',
				category: 'spec',
				path: '$.components',
				context: {componentId: 'Button'},
			},
		];

		expect(formatErrorsForModel(errors)).toBe(
			`## Errors (1)\n- Missing component; was given "Button" but available components are (none available) at $.components`
		);
	});

	it('should include all error details in list items', () => {
		const errors: SpecError[] = [
			{
				code: ERROR_CODES.INVALID_ACCESSOR,
				severity: 'error',
				category: 'data',
				path: '$.bindings.field',
				context: {
					accessor: '$.invalid',
					reason: 'Syntax error',
				},
				suggestion: 'Use valid JSONPath syntax',
			},
		];

		expect(formatErrorsForModel(errors)).toBe(
			`## Errors (1)\n- Invalid accessor "$.invalid"; Syntax error at $.bindings.field. Use valid JSONPath syntax`
		);
	});
});
