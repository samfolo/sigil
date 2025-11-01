import type {SizeMetrics} from './schemas';

/**
 * Calculates size metrics for raw data string
 *
 * Computes bytes (UTF-8), characters, and line count. Used by parser tools
 * to report data size to the analyser agent for sampling decisions.
 *
 * @param rawData - The raw data string to measure
 * @returns Size metrics in bytes, characters, and lines
 *
 * @example
 * ```typescript
 * calculateSize('hello\nworld');
 * // {bytes: 11, characters: 11, lines: 2}
 *
 * calculateSize('');
 * // {bytes: 0, characters: 0, lines: 0}
 * ```
 */
export const calculateSize = (rawData: string): SizeMetrics => {
	if (rawData.length === 0) {
		return {
			bytes: 0,
			characters: 0,
			lines: 0,
		};
	}

	return {
		bytes: Buffer.byteLength(rawData, 'utf-8'),
		characters: rawData.length,
		lines: rawData.split(/\r\n|\r|\n/).length,
	};
};
