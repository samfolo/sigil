/**
 * Test fixtures for validation layer system
 *
 * Comprehensive test cases covering:
 * - Valid and invalid outputs for Zod validation
 * - Factory functions for creating test validators
 * - Conditional validation scenarios
 */

import {z} from 'zod';

import {err, ok} from '@sigil/src/common/errors/result';

import type {ValidationLayer} from '../types';

/**
 * Default descriptions for test validators
 */
export const DEFAULT_PASSING_VALIDATOR_DESCRIPTION = 'Test validation layer that always passes';
export const DEFAULT_FAILING_VALIDATOR_DESCRIPTION = 'Test validation layer that always fails';
export const DEFAULT_CONDITIONAL_VALIDATOR_DESCRIPTION = 'Test validation layer with conditional logic';

/**
 * Test output interface matching the validation schema
 */
interface TestOutput {
	result: string;
	value: number;
}

/**
 * Simple Zod schema for testing validation
 *
 * Requires an object with:
 * - result: string
 * - value: number
 */
export const ValidOutputSchema = z.object({
	result: z.string(),
	value: z.number(),
});

/**
 * Valid output matching the schema
 *
 * Passes Zod validation successfully.
 */
export const VALID_OUTPUT: TestOutput = {
	result: 'success',
	value: 42,
};

/**
 * Invalid output with wrong types
 *
 * Fails Zod validation due to type mismatches:
 * - result should be string but is number
 * - value should be number but is string
 */
export const INVALID_OUTPUT_WRONG_TYPE = {
	result: 123,
	value: 'wrong',
};

/**
 * Invalid output with missing required field
 *
 * Fails Zod validation due to missing 'value' field.
 */
export const INVALID_OUTPUT_MISSING_FIELD = {
	result: 'success',
};

/**
 * Creates a validation layer that always succeeds
 *
 * Used for testing sequential validation when all validators pass.
 * The validator simply returns the output unchanged.
 *
 * @param name - Identifier for this validation layer
 * @param description - Optional description (defaults to generic message)
 * @returns ValidationLayer that always returns success
 *
 * @example
 * ```typescript
 * const validator = createPassingValidator('test-validator', 'Test validator description');
 * const result = await validator.validate({result: 'test', value: 1});
 * // result = ok({result: 'test', value: 1})
 * ```
 */
export const createPassingValidator = (
	name: string,
	description: string = DEFAULT_PASSING_VALIDATOR_DESCRIPTION
): ValidationLayer<TestOutput> => ({
		name,
		description,
		validate: async (output) => ok(output),
	});

/**
 * Creates a validation layer that always fails
 *
 * Used for testing error handling and fail-fast behaviour.
 * The validator always returns an error with the specified message.
 *
 * @param name - Identifier for this validation layer
 * @param errorMessage - Error message to return on failure
 * @param description - Optional description (defaults to generic message)
 * @returns ValidationLayer that always returns error
 *
 * @example
 * ```typescript
 * const validator = createFailingValidator('strict-validator', 'Validation failed', 'Test validator');
 * const result = await validator.validate({result: 'test', value: 1});
 * // result = err(Error('Validation failed'))
 * ```
 */
export const createFailingValidator = (
	name: string,
	errorMessage: string,
	description: string = DEFAULT_FAILING_VALIDATOR_DESCRIPTION
): ValidationLayer<TestOutput> => ({
		name,
		description,
		validate: async (_output) => err(new Error(errorMessage)),
	});

/**
 * Creates a validation layer with custom predicate logic
 *
 * Used for testing conditional validation scenarios. The validator
 * passes or fails based on the provided predicate function.
 *
 * @param name - Identifier for this validation layer
 * @param predicate - Function that returns true to pass, false to fail
 * @param description - Optional description (defaults to generic message)
 * @returns ValidationLayer that validates based on predicate
 *
 * @example
 * ```typescript
 * // Validator that only accepts values greater than 10
 * const validator = createConditionalValidator(
 *   'min-value-validator',
 *   (output) => output.value > 10,
 *   'Validates minimum value requirement'
 * );
 *
 * const result1 = await validator.validate({result: 'test', value: 15});
 * // result1 = ok({result: 'test', value: 15})
 *
 * const result2 = await validator.validate({result: 'test', value: 5});
 * // result2 = err(Error('Validation failed: min-value-validator'))
 * ```
 */
export const createConditionalValidator = (
	name: string,
	predicate: (output: TestOutput) => boolean,
	description: string = DEFAULT_CONDITIONAL_VALIDATOR_DESCRIPTION
): ValidationLayer<TestOutput> => ({
		name,
		description,
		validate: async (output) => {
			if (predicate(output)) {
				return ok(output);
			}
			return err(new Error(`Validation failed: ${name}`));
		},
	});
