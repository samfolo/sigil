/**
 * Run ID generator
 *
 * Generates unique timestamped identifiers for agent execution runs.
 * Format ensures lexicographic sorting equals chronological sorting.
 */

import {randomBytes} from 'crypto';

/**
 * Padding length for date and time components (2 digits)
 */
const DATE_TIME_PADDING_LENGTH = 2;

/**
 * Padding length for milliseconds (3 digits)
 */
const MILLISECOND_PADDING_LENGTH = 3;

/**
 * Byte length for random suffix (2 bytes → 4 hex characters)
 */
const RANDOM_SUFFIX_BYTE_LENGTH = 2;

/**
 * Generates a unique run identifier
 *
 * Format: yyyyMMdd-HHmmssSSS-xxxx where xxxx is 4-char hex suffix
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
	const month = String(now.getMonth() + 1).padStart(DATE_TIME_PADDING_LENGTH, '0');
	const day = String(now.getDate()).padStart(DATE_TIME_PADDING_LENGTH, '0');
	const hours = String(now.getHours()).padStart(DATE_TIME_PADDING_LENGTH, '0');
	const minutes = String(now.getMinutes()).padStart(DATE_TIME_PADDING_LENGTH, '0');
	const seconds = String(now.getSeconds()).padStart(DATE_TIME_PADDING_LENGTH, '0');
	const milliseconds = String(now.getMilliseconds()).padStart(MILLISECOND_PADDING_LENGTH, '0');

	const datePart = `${year}${month}${day}`;
	const timePart = `${hours}${minutes}${seconds}${milliseconds}`;
	const randomSuffix = randomBytes(RANDOM_SUFFIX_BYTE_LENGTH).toString('hex');

	return `${datePart}-${timePart}-${randomSuffix}`;
};
