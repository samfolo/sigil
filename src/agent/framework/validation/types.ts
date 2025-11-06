/**
 * Multi-layer validation system for agent outputs
 *
 * Provides a composable validation pipeline where each layer can validate agent
 * output using different strategies (schema validation, business rules, etc.).
 * Validation errors are collected and converted to AgentError[] by executeAgent.
 */

import type {Result} from '@sigil/src/common/errors/result';

import type {ValidationLayerMetadata} from './schemas';

/**
 * Single validation layer in the agent output validation pipeline
 *
 * Error type is unknown to support different validator types (ZodError,
 * SpecError[], Error, string). executeAgent converts these to AgentError[].
 *
 * @template Output - Type of agent output being validated
 */
export interface ValidationLayer<Output> {
  /**
   * Layer identifier used in error messages
   */
  name: string;

  /**
   * Human-readable description for LLM error prompts
   */
  description: string;

  /**
   * Validates agent output
   *
   * @param output - The output to validate
   * @param signal - Optional AbortSignal to cancel long-running validation
   * @returns Result with validated output or error
   */
  validate: (output: Output, signal?: AbortSignal) => Promise<Result<Output, unknown>>;
}

/**
 * Validation layers applied sequentially during agent execution
 *
 * @template Output - Type of agent output being validated
 */
export type ValidationLayers<Output> = ValidationLayer<Output>[];

/**
 * Identifying information for a validation layer (name and description only)
 *
 * Used when layer type information is not needed, such as for error formatting
 * or tracking failed validation layers.
 */
export type ValidationLayerIdentity = Pick<ValidationLayerMetadata, 'name' | 'description'>;

/**
 * Successful validation layer execution result
 */
export interface ValidationLayerSuccess extends ValidationLayerMetadata {
  /**
   * Validation succeeded
   */
  success: true;
}

/**
 * Failed validation layer execution result
 */
export interface ValidationLayerFailure extends ValidationLayerMetadata {
  /**
   * Validation failed
   */
  success: false;

  /**
   * Error returned by the validator
   *
   * Can be ZodError, SpecError[], ValidationFailedContext,
   * Error, string, or any other error type returned by the validator.
   */
  error: unknown;
}

/**
 * Result of validation layer execution
 *
 * Discriminated union based on success/failure
 */
export type ValidationLayerResult = ValidationLayerSuccess | ValidationLayerFailure;

/**
 * Callbacks for observing validation layer execution
 *
 * Provides lightweight observability into the validation pipeline without
 * passing large LLM outputs through callbacks. Use these to trace which
 * validation layers execute, which succeed/fail, and capture errors.
 *
 * @example
 * ```typescript
 * const callbacks: ValidationLayerCallbacks = {
 *   onLayerStart: (layer) => {
 *     console.log(`Starting ${layer.type} validation: ${layer.name}`);
 *   },
 *   onLayerComplete: (layer) => {
 *     if (layer.success) {
 *       console.log(`✓ ${layer.name} passed`);
 *     } else {
 *       console.log(`× ${layer.name} failed:`, layer.error);
 *     }
 *   },
 * };
 * ```
 */
export interface ValidationLayerCallbacks {
  /**
   * Called when a validation layer starts execution
   */
  onLayerStart?: (layer: ValidationLayerMetadata) => void;

  /**
   * Called when a validation layer completes execution
   */
  onLayerComplete?: (layer: ValidationLayerResult) => void;
}
