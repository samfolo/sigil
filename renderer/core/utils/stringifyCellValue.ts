/**
 * Cell value serialisation utility
 *
 * Handles conversion of complex data types to display strings.
 * Respects format strings from FieldMetadata with graceful fallbacks.
 */

import {DateTime} from 'luxon';

import {MAX_DISPLAY_LENGTH} from '../constants';

/**
 * Converts a raw cell value to a display string
 *
 * Respects format hints from FieldMetadata:
 * - If format is provided and dataType suggests date → try Luxon formatting
 * - If format is provided and dataType suggests number → apply number formatting (future)
 * - Falls back to sensible defaults if formatting fails
 *
 * Handles various data types with appropriate serialisation:
 * - null/undefined → empty string
 * - string → as-is (or formatted if it's a date string)
 * - number/boolean → String conversion
 * - Date → formatted via Luxon if format provided, else ISO
 * - ISO date strings → formatted via Luxon if format provided
 * - Array → JSON with truncation
 * - Object → JSON with truncation
 * - Circular references → safe error message
 *
 * @param value - Raw value from data source
 * @param format - Optional format string from FieldMetadata
 * @param dataType - Optional data type hint from FieldMetadata
 * @returns Display string suitable for rendering
 */
export const stringifyCellValue = (value: unknown, format?: string, dataType?: string): string => {
	// Handle null/undefined
	if (value === null || value === undefined) {
		return '';
	}

	// Handle Date objects using Luxon
	if (value instanceof Date) {
		return formatDate(DateTime.fromJSDate(value), format);
	}

	// Handle strings
	if (typeof value === 'string') {
		// Try to parse as date if dataType hints at it or format is provided
		if (dataType === 'date' || format) {
			const dateTime = DateTime.fromISO(value);
			if (dateTime.isValid) {
				return formatDate(dateTime, format);
			}
		}
		return value;
	}

	// Handle numbers
	if (typeof value === 'number') {
		// TODO: Implement number formatting (numeral.js or similar)
		// For now, just convert to string
		return String(value);
	}

	// Handle booleans
	if (typeof value === 'boolean') {
		return String(value);
	}

	// Handle arrays
	if (Array.isArray(value)) {
		return stringifyComplexValue(value);
	}

	// Handle objects (including circular references)
	if (typeof value === 'object') {
		return stringifyComplexValue(value);
	}

	// Fallback for any other types (functions, symbols, etc.)
	return String(value);
};

/**
 * Formats a DateTime using Luxon
 *
 * Tries the provided format string, falls back to locale default if invalid
 *
 * Supports:
 * - Luxon format tokens (e.g., 'DD/MM/YYYY', 'yyyy-MM-dd HH:mm:ss')
 * - Luxon preset constants (e.g., 'iso8601', 'DATE_SHORT', 'DATETIME_MED')
 * - Falls back to locale string if format is invalid
 *
 * @param dateTime - Luxon DateTime object
 * @param format - Optional format string
 * @returns Formatted date string
 */
const formatDate = (dateTime: DateTime, format?: string): string => {
	if (!dateTime.isValid) {
		return String(dateTime);
	}

	// No format specified, use sensible default
	if (!format) {
		return dateTime.toLocaleString(DateTime.DATETIME_SHORT);
	}

	// Try common preset mappings from spec
	const presetMap: Record<string, ReturnType<typeof DateTime.DATETIME_SHORT>> = {
		iso8601: DateTime.DATETIME_SHORT,
		DATE_SHORT: DateTime.DATE_SHORT,
		DATE_MED: DateTime.DATE_MED,
		DATE_FULL: DateTime.DATE_FULL,
		DATETIME_SHORT: DateTime.DATETIME_SHORT,
		DATETIME_MED: DateTime.DATETIME_MED,
		DATETIME_FULL: DateTime.DATETIME_FULL,
	};

	if (format in presetMap) {
		return dateTime.toLocaleString(presetMap[format]);
	}

	// Try custom format string
	try {
		const formatted = dateTime.toFormat(format);
		// Check if format was valid (Luxon returns the original string if invalid)
		if (formatted && formatted !== format) {
			return formatted;
		}
	} catch {
		// Format string was invalid, fall through to default
	}

	// Fallback to locale string
	return dateTime.toLocaleString(DateTime.DATETIME_SHORT);
};

/**
 * Stringifies complex values (objects/arrays) with truncation and error handling
 *
 * Uses JSON.stringify with error handling for circular references.
 * Truncates long strings to prevent UI overflow.
 *
 * @param value - Complex value to stringify
 * @returns JSON string, truncated if necessary
 */
const stringifyComplexValue = (value: unknown): string => {
	try {
		const json = JSON.stringify(value);

		// Truncate long values
		if (json.length > MAX_DISPLAY_LENGTH) {
			return `${json.slice(0, MAX_DISPLAY_LENGTH)}...`;
		}

		return json;
	} catch (error) {
		// Handle circular references or other serialisation errors
		if (error instanceof Error && error.message.includes('circular')) {
			return '[Circular Reference]';
		}
		return '[Complex Object]';
	}
};
