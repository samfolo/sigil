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

import type {ValidationLayer, ValidationLayerIdentity} from './types';

/**
 * Metadata for the built-in Zod validation layer
 *
 * Used by validateLayers to provide consistent layer identity and description
 * across validation callbacks and error formatting.
 */
export const ZOD_LAYER_METADATA: ValidationLayerIdentity = {
	name: 'Zod',
	description: 'Validates that your output matches the expected JSON schema structure',
};

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
 * @param description - Human-readable explanation of what this layer validates
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
 *   'Validates business constraints and data quality requirements',
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
 *   'Validates that component IDs exist and data bindings are correct',
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
	description: string,
	validateFn: CustomValidationFn<Output>
): ValidationLayer<Output> => ({
		name,
		description,
		validate: async (output: Output): Promise<Result<Output, unknown>> => {
			try {
				await validateFn(output);
				return ok(output);
			} catch (error) {
				return err(error);
			}
		},
	});

/**
 * Recursively freezes an object and all nested objects
 *
 * Prevents validation layers from mutating input by making all properties
 * read-only. Any attempt to modify the frozen object will throw a TypeError.
 *
 * **Limitations:**
 * - Circular references cause stack overflow
 * - Special objects (Map, Set, Date, RegExp, typed arrays) remain mutable
 * - Symbol properties are not frozen
 *
 * @template T - Type of object to freeze
 * @param obj - Object to freeze recursively
 * @returns The same object, now frozen
 */
export const deepFreeze = <T>(obj: T): T => {
	// Freeze the object itself
	Object.freeze(obj);

	// Recursively freeze all nested objects
	Object.getOwnPropertyNames(obj).forEach((prop) => {
		const value = (obj as Record<string, unknown>)[prop];
		if (value && typeof value === 'object' && !Object.isFrozen(value)) {
			deepFreeze(value);
		}
	});

	return obj;
};
