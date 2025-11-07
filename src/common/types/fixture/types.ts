import type {SigilLogEntry} from '@sigil/src/common/observability/logger';
import type {ComponentSpec} from '@sigil/src/lib/generated/types/specification';

/**
 * Pattern matching yyyy-MM-dd date directories
 */
export const DATE_DIRECTORY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

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
