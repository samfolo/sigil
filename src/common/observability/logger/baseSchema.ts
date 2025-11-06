/**
 * Base Pino log schema
 *
 * Defines the base fields that Pino automatically adds to all log entries,
 * plus custom fields added by createSigilLogger (agent, traceId).
 *
 * Extracted to separate file to avoid circular dependencies between
 * events.ts, frameworkEvents.ts, and applicationEvents.ts.
 */

import {z} from 'zod';

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
