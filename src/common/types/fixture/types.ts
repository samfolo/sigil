import type {SigilLogEntry} from '@sigil/src/common/observability/logger';
import type {ComponentSpec} from '@sigil/src/lib/generated/schemas/specification';

/**
 * Metadata about a fixture without the full spec and logs
 */
export interface FixtureMetadata {
	/**
	 * Unique identifier with directory prefix
	 * Format: "logs/filename" or "fixtures/filename" (without .jsonl extension)
	 */
	id: string;

	/**
	 * Human-readable display name
	 * Defaults to id if not specified
	 */
	displayName: string;

	/**
	 * Date extracted from parent directory name
	 * Format: yyyy-MM-dd
	 */
	date: string;

	/**
	 * Unix timestamp in milliseconds from first log entry
	 */
	timestamp: number;
}

/**
 * Complete fixture with spec and logs
 */
export interface Fixture extends FixtureMetadata {
	/**
	 * Validated ComponentSpec from spec_generated event
	 */
	spec: ComponentSpec;

	/**
	 * All log entries from the JSONL file
	 */
	logs: SigilLogEntry[];
}
