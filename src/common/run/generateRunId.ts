/**
 * Run ID generator
 *
 * Generates unique timestamped identifiers for agent execution runs.
 * Format ensures lexicographic sorting equals chronological sorting.
 */

import {randomBytes} from 'crypto';

/**
 * Generates a unique run identifier
 *
 * Format: YYYYMMDD-HHmmssSSS-xxxx where xxxx is 4-char hex suffix
 *
 * The timestamp-based format ensures that lexicographic sorting of run IDs
 * produces chronological ordering, eliminating the need for date grouping directories.
 *
 * @returns Run identifier string
 *
 * @example
 * ```typescript
 * const runId = generateRunId();
 * // "20251108-143022123-a3f9"
 * ```
 */
export const generateRunId = (): string => {
	const now = new Date();

	const year = now.getFullYear();
	const month = String(now.getMonth() + 1).padStart(2, '0');
	const day = String(now.getDate()).padStart(2, '0');
	const hours = String(now.getHours()).padStart(2, '0');
	const minutes = String(now.getMinutes()).padStart(2, '0');
	const seconds = String(now.getSeconds()).padStart(2, '0');
	const milliseconds = String(now.getMilliseconds()).padStart(3, '0');

	const datePart = `${year}${month}${day}`;
	const timePart = `${hours}${minutes}${seconds}${milliseconds}`;
	const randomSuffix = randomBytes(2).toString('hex');

	return `${datePart}-${timePart}-${randomSuffix}`;
};
