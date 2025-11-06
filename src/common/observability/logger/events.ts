/**
 * Combined Sigil log event schemas
 *
 * Unifies framework-level events (agent execution) and application-level events
 * (preprocessing, pipeline orchestration) into a single discriminated union.
 *
 * Use for type-safe log parsing, display components, and downstream observability tooling.
 */

import {z} from 'zod';

import type {ApplicationLogEvent} from './applicationEvents';
import {ApplicationLogEventSchema} from './applicationEvents';
import type {FrameworkLogEvent} from './frameworkEvents';
import {FrameworkLogEventSchema} from './frameworkEvents';

/**
 * Base Pino log fields present in all log entries
 *
 * Pino automatically includes these fields in every log entry along with
 * custom fields added by createSigilLogger (agent, traceId).
 */
export const PinoLogBaseSchema = z.object({
	/**
	 * Pino log level
	 *
	 * - 10: trace
	 * - 20: debug
	 * - 30: info
	 * - 40: warn
	 * - 50: error
	 * - 60: fatal
	 */
	level: z.number().int().min(10).max(60).describe('Pino log level'),

	/**
	 * Unix timestamp in milliseconds
	 */
	time: z.number().int().positive().describe('Unix timestamp in milliseconds'),

	/**
	 * Process ID
	 */
	pid: z.number().int().positive().optional().describe('Process ID'),

	/**
	 * Machine hostname
	 */
	hostname: z.string().optional().describe('Machine hostname'),

	/**
	 * Agent name
	 */
	agent: z.string().describe('Agent name (e.g., "Analyser", "GenerateSigilIR", "DataProcessingPipeline")'),

	/**
	 * Unique execution identifier
	 */
	traceId: z.string().describe('Unique execution identifier (format: "agent_<uuid>")'),

	/**
	 * Human-readable message
	 */
	msg: z.string().describe('Human-readable message'),
});

export type PinoLogBase = z.infer<typeof PinoLogBaseSchema>;

/**
 * Discriminated union of all Sigil log events
 *
 * Combines framework-level events (agent execution) with application-level events
 * (preprocessing, pipeline orchestration, errors).
 *
 * Use the `event` field to narrow the type in switch statements or type guards.
 */
export const SigilLogEntrySchema = z.union([FrameworkLogEventSchema, ApplicationLogEventSchema]);

export type SigilLogEntry = FrameworkLogEvent | ApplicationLogEvent;

/**
 * Type guard to check if an unknown object is a SigilLogEntry
 *
 * @param obj - Object to validate
 * @returns True if obj is a valid SigilLogEntry
 *
 * @example
 * ```typescript
 * const rawLog = JSON.parse(logLine);
 * if (isSigilLogEntry(rawLog)) {
 *   // TypeScript knows rawLog is SigilLogEntry
 *   switch (rawLog.event) {
 *     case 'tool_call':
 *       console.log(rawLog.toolName);
 *       break;
 *     // ... handle other events
 *   }
 * }
 * ```
 */
export const isSigilLogEntry = (obj: unknown): obj is SigilLogEntry => {
	const result = SigilLogEntrySchema.safeParse(obj);
	return result.success;
};
