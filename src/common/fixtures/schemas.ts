/**
 * Zod schemas for fixture types
 *
 * Single source of truth for fixture types used in preview tooling.
 * Types are derived from these schemas to ensure runtime validation
 * matches compile-time types.
 */

import {z} from 'zod';

import {SigilLogEntrySchema} from '@sigil/src/common/observability/logger/events';
import {ComponentSpecSchema} from '@sigil/src/lib/generated/schemas';

/**
 * Pattern matching yyyy-MM-dd date directories
 */
export const DATE_DIRECTORY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Metadata about a fixture without the full spec and logs
 */
export const FixtureMetadataSchema = z.object({
	/**
	 * Unique identifier with directory prefix
	 * Format: "logs/filename" or "fixtures/filename" (without .jsonl extension)
	 */
	id: z.string().describe('Unique identifier with directory prefix'),

	/**
	 * Human-readable display name
	 * Defaults to id if not specified
	 */
	displayName: z.string().describe('Human-readable display name'),

	/**
	 * Date extracted from parent directory name
	 * Format: yyyy-MM-dd
	 */
	date: z.string().describe('Date extracted from parent directory name (yyyy-MM-dd)'),

	/**
	 * Unix timestamp in milliseconds from first log entry
	 */
	timestamp: z.number().int().describe('Unix timestamp in milliseconds from first log entry'),
});

export type FixtureMetadata = z.infer<typeof FixtureMetadataSchema>;

/**
 * Complete fixture with spec and logs
 */
export const FixtureSchema = FixtureMetadataSchema.extend({
	/**
	 * Validated ComponentSpec from spec_generated event
	 */
	spec: ComponentSpecSchema,

	/**
	 * All log entries from the JSONL file
	 */
	logs: z.array(SigilLogEntrySchema),
});

export type Fixture = z.infer<typeof FixtureSchema>;
