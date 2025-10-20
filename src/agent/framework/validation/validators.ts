/**
 * Helper functions for common validation scenarios
 *
 * Provides utilities for creating validation layers using Zod schemas or custom
 * validation logic. All validators follow the Result pattern for type-safe error
 * handling.
 */

import type {z} from 'zod';

import type {Result} from '@sigil/src/common/errors/result';
import {err, ok} from '@sigil/src/common/errors/result';

import type {ValidationLayer} from './types';

/**
 * Custom validation function that validates output or throws on failure
 *
 * @template Output - Type of agent output being validated
 */
export type CustomValidationFn<Output> = (output: Output) => Promise<void>;

/**
 * Validates output against a Zod schema
 *
 * Layer 2 validation: Explicit Zod schema validation for agent output structure.
 * Use this when you have a Zod schema and want to validate agent output against it.
 *
 * @template Output - Type of validated output (inferred from schema)
 * @param output - Unknown output to validate
 * @param schema - Zod schema to validate against
 * @returns Result containing validated output or ZodError
 *
 * @example
 * ```typescript
 * import {z} from 'zod';
 * import {validateWithZod} from '@sigil/src/agent/framework/validation';
 *
 * const USER_SCHEMA = z.object({
 *   name: z.string(),
 *   age: z.number(),
 * });
 *
 * type User = z.infer<typeof USER_SCHEMA>;
 *
 * const output = {name: 'Alice', age: 30};
 * const result = validateWithZod<User>(output, USER_SCHEMA);
 *
 * if (result.success) {
 *   console.log(result.data); // {name: 'Alice', age: 30}
 * } else {
 *   console.error(result.error); // ZodError with validation issues
 * }
 * ```
 */
export const validateWithZod = <Output>(
	output: unknown,
	schema: z.ZodSchema<Output>
): Result<Output, z.ZodError> => {
	const result = schema.safeParse(output);

	if (result.success) {
		return ok(result.data);
	}

	return err(result.error);
};

/**
 * Creates a validation layer from a custom validation function
 *
 * Wraps a validate-or-throw function in the ValidationLayer interface with proper
 * error handling. The validation function can throw any error type (Error,
 * SpecError[], string, etc.) which will be wrapped in Result<Output, unknown>.
 *
 * Use this when you need custom validation logic beyond schema validation, such as
 * business rules, cross-field validation, or domain-specific constraints.
 *
 * @template Output - Type of agent output being validated
 * @param name - Identifier for this validation layer (used in error messages)
 * @param validateFn - Async function that validates output or throws on failure
 * @returns ValidationLayer that can be used in validation pipeline
 *
 * @example
 * ```typescript
 * import {createCustomValidator} from '@sigil/src/agent/framework/validation';
 * import type {Analysis} from '@sigil/src/common/types/analysisSchema';
 *
 * // Simple validation with Error
 * const BUSINESS_RULES_LAYER = createCustomValidator<Analysis>(
 *   'business-rules',
 *   async (output) => {
 *     if (output.columns.length === 0) {
 *       throw new Error('Analysis must contain at least one column');
 *     }
 *     if (output.title.length > 100) {
 *       throw new Error('Title must be 100 characters or less');
 *     }
 *   }
 * );
 *
 * // Validation with SpecError[]
 * const SPEC_LAYER = createCustomValidator<Analysis>(
 *   'spec-validation',
 *   async (output) => {
 *     const errors = validateSpecStructure(output);
 *     if (errors.length > 0) {
 *       throw errors;
 *     }
 *   }
 * );
 *
 * // Use in validation pipeline
 * const VALIDATION_LAYERS = [
 *   SCHEMA_LAYER,
 *   BUSINESS_RULES_LAYER,
 *   SPEC_LAYER,
 * ];
 * ```
 */
export const createCustomValidator = <Output>(
	name: string,
	validateFn: CustomValidationFn<Output>
): ValidationLayer<Output> => {
	return {
		name,
		validate: async (output: Output): Promise<Result<Output, unknown>> => {
			try {
				await validateFn(output);
				return ok(output);
			} catch (error) {
				return err(error);
			}
		},
	};
};
