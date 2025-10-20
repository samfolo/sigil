import type {z} from 'zod';

import type {Result} from '@sigil/src/common/errors';
import {err, isErr} from '@sigil/src/common/errors';

import type {ValidationLayer} from './types';
import {validateWithZod} from './validators';

/**
 * Orchestrates sequential validation through multiple layers.
 *
 * Validation flow:
 * 1. Layer 1 (SDK): Structured output validation (handled by SDK before this)
 * 2. Layer 2 (Zod): Schema validation for type safety
 * 3. Layer 3+ (Custom): Domain-specific validation layers
 *
 * Fail-fast strategy: Returns the first error encountered, stopping validation
 * immediately. Unlike functions that may accumulate errors within a processing
 * phase (e.g., buildRenderTree collecting binding errors), validateLayers stops
 * at the first failing layer across the validation pipeline.
 *
 * executeAgent uses this for retry logic: validation failures trigger retries
 * with error context until success or max attempts reached.
 *
 * @template Output - The expected output type after validation
 * @param output - The raw output to validate (typically from LLM)
 * @param schema - Zod schema for Layer 2 type validation
 * @param customValidators - Additional validation layers to run sequentially
 * @returns Result containing validated output or first error encountered
 *
 * @example
 * ```typescript
 * const result = await validateLayers(
 *   modelOutput,
 *   mySchema,
 *   [
 *     customValidator1,
 *     customValidator2,
 *   ]
 * );
 *
 * if (isErr(result)) {
 *   // result.error could be ZodError, Error, SpecError[], etc.
 *   // executeAgent will convert to AgentError with VALIDATION_FAILED code
 * }
 * ```
 */
export const validateLayers = async <Output>(
	output: unknown,
	schema: z.ZodSchema<Output>,
	customValidators: ValidationLayer<Output>[]
): Promise<Result<Output, unknown>> => {
	// Layer 2: Zod schema validation
	const zodResult = validateWithZod(output, schema);

	if (isErr(zodResult)) {
		return zodResult;
	}

	const validatedOutput = zodResult.data;

	// Layer 3+: Custom validators (sequential, fail-fast)
	for (const validator of customValidators) {
		try {
			const validationResult = await validator.validate(validatedOutput);

			if (isErr(validationResult)) {
				return validationResult;
			}
		} catch (error) {
			return err(error);
		}
	}

	return zodResult;
};
