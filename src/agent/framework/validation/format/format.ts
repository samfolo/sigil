/**
 * Validation error formatting for LLM consumption
 *
 * Provides utilities to format validation errors from different sources
 * (ZodError, SpecError[], Error, unknown) into human-readable text suitable
 * for including in error prompts sent to language models.
 */

import {ZodError} from 'zod';

import {
	formatSpecErrorsForModel,
	formatZodErrorsForModel,
	isSpecErrorArray,
	safeStringify,
} from '@sigil/src/common/errors';

/**
 * Formats validation errors for inclusion in error prompts
 *
 * Dispatches to appropriate formatter based on error type and prepends
 * layer context to help the language model understand which validation
 * layer failed and why.
 *
 * The format follows this structure:
 * ```
 * The following errors occurred during <layerName>:
 * <layerDescription>
 *
 * <formatted error content>
 * ```
 *
 * ## Extensibility
 *
 * To add support for new error types, add a type guard check before the
 * fallback `safeStringify` call:
 *
 * ```typescript
 * // Add new type guard
 * if (isCustomErrorType(error)) {
 *   formattedError = formatCustomError(error);
 * }
 * // Existing fallback
 * else {
 *   formattedError = safeStringify(error);
 * }
 * ```
 *
 * @param error - Error from validation layer (ZodError, SpecError[], Error, or unknown)
 * @param layerName - Name of the validation layer that failed
 * @param layerDescription - Human-readable description of what the layer validates
 * @returns Formatted error string ready for inclusion in error prompt
 *
 * @example
 * ```typescript
 * import {ZodError} from 'zod';
 * import {formatValidationErrorForPrompt} from '@sigil/src/agent/framework/validation';
 *
 * // Format ZodError
 * const zodError = new ZodError([...]);
 * const formatted = formatValidationErrorForPrompt(
 *   zodError,
 *   'Zod',
 *   'Validates that your output matches the expected JSON schema structure'
 * );
 * // Output:
 * // The following errors occurred during Zod:
 * // Validates that your output matches the expected JSON schema structure
 * //
 * // ## Errors (2)
 * // ✖ Invalid input: expected string, received number
 * //   → at name
 * // ...
 *
 * // Format SpecError[]
 * const specErrors: SpecError[] = [...];
 * const formatted = formatValidationErrorForPrompt(
 *   specErrors,
 *   'spec-validation',
 *   'Validates that component IDs exist and data bindings are correct'
 * );
 *
 * // Format generic Error
 * const error = new Error('Custom validation failed');
 * const formatted = formatValidationErrorForPrompt(
 *   error,
 *   'business-rules',
 *   'Validates business constraints and data quality requirements'
 * );
 * // Output:
 * // The following errors occurred during business-rules:
 * // Validates business constraints and data quality requirements
 * //
 * // Custom validation failed
 * ```
 */
export const formatValidationErrorForPrompt = (
	error: unknown,
	layerName: string,
	layerDescription: string
): string => {
	let formattedError: string;

	// Dispatch to appropriate formatter based on error type
	if (error instanceof ZodError) {
		formattedError = formatZodErrorsForModel(error);
	} else if (isSpecErrorArray(error)) {
		formattedError = formatSpecErrorsForModel(error);
	} else if (error instanceof Error) {
		formattedError = error.message;
	} else {
		formattedError = safeStringify(error);
	}

	// Prepend layer context for LLM
	return `The following errors occurred during ${layerName}:\n${layerDescription}\n\n${formattedError}`;
};
