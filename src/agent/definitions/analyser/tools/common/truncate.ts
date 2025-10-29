import type {PrecisionValue} from './types';

const DEFAULT_MAX_LENGTH = 100;
const ELLIPSIS = '...';
const ELLIPSIS_LENGTH = 3;

/**
 * Truncates a string to a maximum length, adding ellipsis if needed
 *
 * Used by parser tools to limit the size of sample values shown to the
 * analyser agent. Values longer than maxLength are truncated with "..."
 * suffix and flagged as inexact.
 *
 * @param value - The string to potentially truncate
 * @param maxLength - Maximum length before truncation (default: 100)
 * @returns Object with the (possibly truncated) value and exactness flag
 *
 * @example
 * ```typescript
 * truncateString('short', 100);
 * // {value: 'short', exact: true}
 *
 * truncateString('a'.repeat(150), 100);
 * // {value: 'aaa...', exact: false} (97 'a' characters followed by '...')
 * ```
 */
export const truncateString = (
	value: string,
	maxLength: number = DEFAULT_MAX_LENGTH
): PrecisionValue<string> => {
	if (value.length <= maxLength) {
		return {
			value,
			exact: true,
		};
	}

	const truncatedValue = value.slice(0, maxLength - ELLIPSIS_LENGTH) + ELLIPSIS;

	return {
		value: truncatedValue,
		exact: false,
	};
};
