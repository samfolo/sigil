/**
 * Multi-layer validation system for agent outputs
 *
 * Provides a composable validation pipeline where each layer can validate agent
 * output using different strategies (schema validation, business rules, etc.).
 * Validation errors are collected and converted to AgentError[] by executeAgent.
 */

import type {Result} from '@sigil/src/common/errors/result';

/**
 * Single validation layer in the agent output validation pipeline
 *
 * Each layer validates agent output and returns either the validated output or
 * an error. The error type is intentionally unknown to support different validator
 * types (ZodError, SpecError[], Error, string, etc.). The executeAgent loop
 * converts these to standardised AgentError[] with proper context.
 *
 * @example
 * ```typescript
 * // Schema validation layer using Zod
 * const SCHEMA_LAYER: ValidationLayer<Analysis> = {
 *   name: 'zod',
 *   validate: async (output) => {
 *     const result = ANALYSIS_SCHEMA.safeParse(output);
 *     return result.success
 *       ? ok(result.data)
 *       : err(result.error);
 *   },
 * };
 *
 * // Custom business logic validation
 * const BUSINESS_RULES_LAYER: ValidationLayer<Analysis> = {
 *   name: 'business-rules',
 *   validate: async (output) => {
 *     if (output.columns.length === 0) {
 *       return err('Analysis must contain at least one column');
 *     }
 *     return ok(output);
 *   },
 * };
 *
 * // Spec validation using domain-specific validator
 * const SPEC_LAYER: ValidationLayer<Analysis> = {
 *   name: 'spec-validation',
 *   validate: async (output) => {
 *     const result = await validateSpec(output, context);
 *     return isOk(result) ? ok(output) : err(result.error);
 *   },
 * };
 * ```
 *
 * @template Output - Type of agent output being validated
 */
export interface ValidationLayer<Output> {
	/**
	 * Identifier for this validation layer
	 *
	 * Used in error messages and debugging to identify which validation failed.
	 * Examples: 'zod', 'custom-rules', 'spec-validation'
	 */
	name: string;

	/**
	 * Validation function for agent output
	 *
	 * @param output - Agent output to validate
	 * @returns Result containing validated output or error of any type
	 *
	 * The error type is unknown because different validators produce different
	 * error formats. The executeAgent loop handles conversion to AgentError[].
	 */
	validate: (output: Output) => Promise<Result<Output, unknown>>;
}

/**
 * Collection of validation layers applied sequentially
 *
 * Validation layers are applied in order during agent execution. If any layer
 * fails, the agent receives feedback and retries. All layers must pass for
 * execution to succeed.
 *
 * @example
 * ```typescript
 * const VALIDATION_LAYERS: ValidationLayers<Analysis> = [
 *   SCHEMA_LAYER,        // Validates JSON structure
 *   BUSINESS_RULES_LAYER, // Validates business constraints
 *   SPEC_LAYER,          // Validates domain-specific requirements
 * ];
 * ```
 *
 * @template Output - Type of agent output being validated
 */
export type ValidationLayers<Output> = ValidationLayer<Output>[];
