/**
 * Test fixtures for validation error formatting
 */

import {z, ZodError} from 'zod';

import {ERROR_CODES, type SpecError} from '@sigil/src/common/errors';

/**
 * Sample ZodError for testing Zod error formatting
 */
export const SAMPLE_ZOD_ERROR = (() => {
	const schema = z.object({
		name: z.string(),
		age: z.number(),
	});

	const result = schema.safeParse({name: 123, age: 'invalid'});

	if (!result.success) {
		return result.error;
	}

	// Fallback (should never reach)
	return new ZodError([]);
})();

/**
 * Sample SpecError[] for testing spec error formatting
 */
export const SAMPLE_SPEC_ERRORS: SpecError[] = [
	{
		code: ERROR_CODES.MISSING_COMPONENT,
		severity: 'error',
		category: 'spec',
		path: '$.layout.children[0]',
		context: {
			componentId: 'UserCard',
			availableComponents: ['DataTable', 'Chart'],
		},
		suggestion: 'Did you mean "DataTable"?',
	},
	{
		code: ERROR_CODES.INVALID_ACCESSOR,
		severity: 'error',
		category: 'data',
		path: '$.layout.children[1].props.data',
		context: {
			accessor: '$.invalidPath',
			reason: 'JSONPath query returned no results',
		},
	},
];

/**
 * Sample Error instance for testing generic error formatting
 */
export const SAMPLE_ERROR = new Error('Validation failed: output must contain at least one column');

/**
 * Sample unknown error (plain object) for testing fallback formatting
 */
export const SAMPLE_UNKNOWN_ERROR = {
	code: 'CUSTOM_ERROR',
	message: 'Something went wrong',
	details: {field: 'value', nested: {data: 42}},
};

/**
 * Sample unknown error (string) for testing string fallback
 */
export const SAMPLE_STRING_ERROR = 'Simple string error message';

/**
 * Sample unknown error (number) for testing primitive fallback
 */
export const SAMPLE_NUMBER_ERROR = 404;

/**
 * Layer metadata examples for testing
 */
export const LAYER_METADATA = {
	zod: {
		name: 'Zod',
		description: 'Validates that your output matches the expected JSON schema structure',
	},
	spec: {
		name: 'spec-validation',
		description: 'Validates that component IDs exist and data bindings are correct',
	},
	businessRules: {
		name: 'business-rules',
		description: 'Validates business constraints and data quality requirements',
	},
	custom: {
		name: 'custom-validator',
		description: 'Validates custom business logic',
	},
};
