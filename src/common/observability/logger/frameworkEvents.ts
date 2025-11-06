/**
 * Zod schemas for framework-level agent execution log events
 *
 * Defines core framework events emitted during agent execution: attempt lifecycle,
 * validation layers, tool execution, and final success/failure outcomes.
 *
 * These events are reusable across any agent execution.
 */

import {z} from 'zod';

import {TokenMetricsSchema} from '@sigil/src/agent/framework';

import {PinoLogBaseSchema} from './events';

/**
 * Attempt start event
 *
 * Fired when an execution attempt begins. Includes attempt number and iteration
 * context (iteration is 0 at attempt start, increments as tools are called).
 */
export const AttemptStartEventSchema = PinoLogBaseSchema.extend({
	event: z.literal('attempt_start'),
	data: z.object({
		attempt: z.number().int().positive().describe('Current attempt number (1-indexed)'),
		maxAttempts: z.number().int().positive().describe('Maximum attempts allowed'),
		iteration: z.number().int().nonnegative().describe('Current iteration (0 at attempt start)'),
		maxIterations: z.number().int().positive().describe('Maximum iterations per attempt'),
	}),
});

export type AttemptStartEvent = z.infer<typeof AttemptStartEventSchema>;

/**
 * Attempt complete event
 *
 * Fired when an execution attempt completes (success or failure).
 */
export const AttemptCompleteEventSchema = PinoLogBaseSchema.extend({
	event: z.literal('attempt_complete'),
	data: z.object({
		attempt: z.number().int().positive().describe('Attempt number that completed'),
		maxAttempts: z.number().int().positive().describe('Maximum attempts allowed'),
		iteration: z.number().int().nonnegative().describe('Final iteration count'),
		maxIterations: z.number().int().positive().describe('Maximum iterations per attempt'),
		success: z.boolean().describe('Whether the attempt succeeded validation'),
	}),
});

export type AttemptCompleteEvent = z.infer<typeof AttemptCompleteEventSchema>;

/**
 * Tool call event
 *
 * Fired before a tool is executed. Includes tool name and input parameters.
 */
export const ToolCallEventSchema = PinoLogBaseSchema.extend({
	event: z.literal('tool_call'),
	data: z.object({
		attempt: z.number().int().positive().describe('Current attempt number'),
		iteration: z.number().int().positive().describe('Current iteration number'),
		toolName: z.string().describe('Name of the tool being called'),
		toolInput: z.unknown().describe('Input provided to the tool by the model'),
	}),
});

export type ToolCallEvent = z.infer<typeof ToolCallEventSchema>;

/**
 * Tool result event
 *
 * Fired after a tool execution completes (success or error).
 */
export const ToolResultEventSchema = PinoLogBaseSchema.extend({
	event: z.literal('tool_result'),
	data: z.object({
		attempt: z.number().int().positive().describe('Current attempt number'),
		iteration: z.number().int().positive().describe('Current iteration number'),
		toolName: z.string().describe('Name of the tool that was called'),
		toolResult: z.string().describe('Result from the tool (or error message if execution failed)'),
	}),
});

export type ToolResultEvent = z.infer<typeof ToolResultEventSchema>;

/**
 * Validation layer start event
 *
 * Fired when a validation layer begins execution.
 */
export const ValidationLayerStartEventSchema = PinoLogBaseSchema.extend({
	event: z.literal('validation_layer_start'),
	data: z.object({
		attempt: z.number().int().positive().describe('Current attempt number'),
		iteration: z.number().int().nonnegative().describe('Current iteration number'),
		layerName: z.string().describe('Name of the validation layer'),
		layerType: z.enum(['zod', 'custom']).describe('Type of validation layer'),
	}),
});

export type ValidationLayerStartEvent = z.infer<typeof ValidationLayerStartEventSchema>;

/**
 * Validation layer complete event
 *
 * Fired when a validation layer completes execution (success or failure).
 */
export const ValidationLayerCompleteEventSchema = PinoLogBaseSchema.extend({
	event: z.literal('validation_layer_complete'),
	data: z.object({
		attempt: z.number().int().positive().describe('Current attempt number'),
		iteration: z.number().int().nonnegative().describe('Current iteration number'),
		layerName: z.string().describe('Name of the validation layer'),
		layerType: z.enum(['zod', 'custom']).describe('Type of validation layer'),
		success: z.boolean().describe('Whether validation succeeded'),
	}),
});

export type ValidationLayerCompleteEvent = z.infer<typeof ValidationLayerCompleteEventSchema>;

/**
 * Validation failure event
 *
 * Fired when output validation fails. Includes validation errors.
 */
export const ValidationFailureEventSchema = PinoLogBaseSchema.extend({
	event: z.literal('validation_failure'),
	data: z.object({
		attempt: z.number().int().positive().describe('Attempt number where validation failed'),
		iteration: z.number().int().nonnegative().describe('Iteration number (0 for submit tool failures)'),
		errors: z.unknown().describe('Validation errors from the output schema'),
	}),
});

export type ValidationFailureEvent = z.infer<typeof ValidationFailureEventSchema>;

/**
 * Success event
 *
 * Fired when agent execution succeeds. Includes validated output and execution metadata.
 */
export const SuccessEventSchema = PinoLogBaseSchema.extend({
	event: z.literal('success'),
	data: z.object({
		output: z.unknown().optional().describe('The validated output from the agent'),
		tokens: TokenMetricsSchema.optional().describe('Token usage statistics'),
		latency: z.number().optional().describe('Total execution latency in milliseconds'),
	}),
});

export type SuccessEvent = z.infer<typeof SuccessEventSchema>;

/**
 * Failure event
 *
 * Fired when agent execution fails after all attempts exhausted.
 */
export const FailureEventSchema = PinoLogBaseSchema.extend({
	event: z.literal('failure'),
	data: z.object({
		errors: z.unknown().array().describe('Array of errors that occurred during execution'),
		tokens: TokenMetricsSchema.optional().describe('Token usage statistics'),
		latency: z.number().optional().describe('Total execution latency in milliseconds'),
	}),
});

export type FailureEvent = z.infer<typeof FailureEventSchema>;

/**
 * Discriminated union of framework-level log events
 *
 * Events emitted by the agent execution framework during attempt lifecycle,
 * validation, tool execution, and final outcomes.
 *
 * Use the `event` field to narrow the type in switch statements or type guards.
 */
export const FrameworkLogEventSchema = z.discriminatedUnion('event', [
	AttemptStartEventSchema,
	AttemptCompleteEventSchema,
	ToolCallEventSchema,
	ToolResultEventSchema,
	ValidationLayerStartEventSchema,
	ValidationLayerCompleteEventSchema,
	ValidationFailureEventSchema,
	SuccessEventSchema,
	FailureEventSchema,
]);

export type FrameworkLogEvent = z.infer<typeof FrameworkLogEventSchema>;
