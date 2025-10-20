import type {z} from 'zod';

import type {Result, ValidationFailedContext} from '@sigil/src/common/errors';
import {err, isErr} from '@sigil/src/common/errors';

import type {
	ValidationLayer,
	ValidationLayerCallbacks,
	ValidationLayerFailure,
	ValidationLayerSuccess,
} from './types';
import {deepFreeze, validateWithZod} from './validators';

/**
 * Orchestrates sequential validation through multiple layers with observability.
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
 * Mutation protection: After Zod validation succeeds, the output is deep frozen
 * to prevent validators from mutating the input. Any mutation attempt will be
 * caught and returned as a structured error identifying the offending validator.
 *
 * executeAgent uses this for retry logic: validation failures trigger retries
 * with error context until success or max attempts reached.
 *
 * @template Output - The expected output type after validation
 * @param output - The raw output to validate (typically from LLM)
 * @param schema - Zod schema for Layer 2 type validation
 * @param customValidators - Additional validation layers to run sequentially
 * @param callbacks - Optional callbacks for observing validation execution
 * @returns Result containing validated output or first error encountered
 *
 * @example
 * ```typescript
 * const result = await validateLayers(
 *   modelOutput,
 *   mySchema,
 *   [customValidator1, customValidator2],
 *   {
 *     onLayerStart: (layer) => console.log(`Starting ${layer.name}`),
 *     onLayerComplete: (layer) => {
 *       if (layer.success) {
 *         console.log(`✓ ${layer.name} passed`);
 *       } else {
 *         console.log(`× ${layer.name} failed:`, layer.error);
 *       }
 *     },
 *   }
 * );
 *
 * if (isErr(result)) {
 *   // result.error could be ZodError, SpecError[], or structured error object
 *   // executeAgent will convert to AgentError with VALIDATION_FAILED code
 * }
 * ```
 */
export const validateLayers = async <Output>(
	output: unknown,
	schema: z.ZodSchema<Output>,
	customValidators: ValidationLayer<Output>[],
	callbacks?: ValidationLayerCallbacks
): Promise<Result<Output, unknown>> => {
	// Layer 2: Zod schema validation
	callbacks?.onLayerStart?.({
		name: 'Zod',
		type: 'zod',
	});

	const zodResult = validateWithZod(output, schema);

	if (isErr(zodResult)) {
		const failure: ValidationLayerFailure = {
			name: 'Zod',
			type: 'zod',
			success: false,
			error: zodResult.error,
		};
		callbacks?.onLayerComplete?.(failure);
		return zodResult;
	}

	const success: ValidationLayerSuccess = {
		name: 'Zod',
		type: 'zod',
		success: true,
	};
	callbacks?.onLayerComplete?.(success);

	// Deep freeze the validated output to prevent mutations
	const frozenOutput = deepFreeze(zodResult.data);

	// Layer 3+: Custom validators (sequential, fail-fast)
	for (const validator of customValidators) {
		callbacks?.onLayerStart?.({
			name: validator.name,
			type: 'custom',
		});

		try {
			const validationResult = await validator.validate(frozenOutput);

			if (isErr(validationResult)) {
				const failure: ValidationLayerFailure = {
					name: validator.name,
					type: 'custom',
					success: false,
					error: validationResult.error,
				};
				callbacks?.onLayerComplete?.(failure);
				return validationResult;
			}

			const success: ValidationLayerSuccess = {
				name: validator.name,
				type: 'custom',
				success: true,
			};
			callbacks?.onLayerComplete?.(success);
		} catch (error) {
			// Check if this is a mutation error
			if (
				error instanceof TypeError &&
				(error.message.includes('read only') ||
					error.message.includes('Cannot assign') ||
					error.message.includes('Cannot add') ||
					error.message.includes('Cannot delete'))
			) {
				const mutationError: ValidationFailedContext = {
					validatorName: validator.name,
					reason:
						'Validator attempted to mutate input. Validators must not modify the input object.',
				};

				const failure: ValidationLayerFailure = {
					name: validator.name,
					type: 'custom',
					success: false,
					error: mutationError,
				};
				callbacks?.onLayerComplete?.(failure);

				return err(mutationError);
			}

			// Other errors
			const failure: ValidationLayerFailure = {
				name: validator.name,
				type: 'custom',
				success: false,
				error,
			};
			callbacks?.onLayerComplete?.(failure);

			return err(error);
		}
	}

	return zodResult;
};
