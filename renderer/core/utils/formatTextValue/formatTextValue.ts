/**
 * Format values according to TextFormat specifications
 *
 * Uses Intl APIs for locale-aware formatting of numbers, currencies, percentages,
 * units, and dates. Uses luxon for date manipulation. Falls back to stringifyValue()
 * on format failure.
 */

import {parse as parseISO8601Duration} from 'iso8601-duration';
import {DateTime, Duration} from 'luxon';

import type {Result} from '@sigil/src/common/errors/result';
import {err, isErr, ok} from '@sigil/src/common/errors/result';
import type {
	CurrencyFormatOptions,
	DecimalFormatOptions,
	PercentFormatOptions,
	TextFormat,
} from '@sigil/src/lib/generated/types/specification';

import {formatElapsedTime} from './formatElapsedTime';

// ============================================================================
// Types
// ============================================================================

/**
 * Options for formatTextValue
 */
export interface FormatTextValueOptions {
	/**
	 * Current time for relative date calculations. Defaults to DateTime.now().
	 */
	now?: DateTime;
}

/**
 * Intl.NumberFormat currency display options
 */
type IntlCurrencyDisplay = 'symbol' | 'narrowSymbol' | 'code' | 'name';

/**
 * Unit display style
 */
type UnitDisplay = 'short' | 'narrow' | 'long';

/**
 * Date/time display mode
 */
type DateTimeDisplay = 'date' | 'time' | 'datetime';

/**
 * Date/time format style
 */
type DateTimeStyle = 'full' | 'long' | 'medium' | 'short';

/**
 * Relative time unit for Intl.RelativeTimeFormat
 */
type RelativeTimeUnit = 'year' | 'month' | 'week' | 'day' | 'hour' | 'minute' | 'second';

// ============================================================================
// Format Constants
// ============================================================================

/**
 * Luxon format tokens for ISO-style date output
 * Uses unambiguous formats to avoid locale-specific interpretation
 */
const DATE_FORMAT_ISO_SHORT = 'yyyy-MM-dd';
const DATE_FORMAT_ISO_LONG = 'd MMMM yyyy';
const DATE_FORMAT_ISO_FULL = 'EEEE, d MMMM yyyy';

const TIME_FORMAT_SHORT = 'HH:mm';
const TIME_FORMAT_MEDIUM = 'HH:mm:ss';
const TIME_FORMAT_LONG = 'HH:mm:ss ZZZZ';

// ============================================================================
// Main Function
// ============================================================================

/**
 * Formats a value according to the specified TextFormat
 *
 * @param value - The value to format
 * @param format - TextFormat specification (or undefined for plain string conversion)
 * @param options - Optional configuration
 * @returns Formatted string, or stringifyValue() on format failure
 */
export const formatTextValue = (
	value: unknown,
	format: TextFormat | undefined,
	options: FormatTextValueOptions = {}
): string => {
	if (format === undefined) {
		return stringifyValue(value);
	}

	try {
		switch (format.type) {
			case 'decimal':
				return formatDecimal(value, format.options);

			case 'currency':
				return formatCurrency(value, format.currency, format.options);

			case 'percent':
				return formatPercent(value, format.options);

			case 'unit':
				return formatUnit(value, format.unit, format.display);

			case 'relative':
				return formatRelativeDate(value, options.now ?? DateTime.now());

			case 'absolute':
				return formatAbsoluteDate(value, format.display, format.style);

			case 'elapsed':
				return formatElapsed(value, format.style);

			default: {
				const _exhaustive: never = format;
				return stringifyValue(_exhaustive);
			}
		}
	} catch {
		return stringifyValue(value);
	}
};

// ============================================================================
// Format Handlers
// ============================================================================

/**
 * Format as decimal number
 */
const formatDecimal = (value: unknown, options?: DecimalFormatOptions): string => {
	const numResult = toNumber(value);
	if (isErr(numResult)) {
		return stringifyValue(value);
	}

	return new Intl.NumberFormat(undefined, {
		style: 'decimal',
		minimumFractionDigits: options?.minimum_fraction_digits,
		maximumFractionDigits: options?.maximum_fraction_digits,
		useGrouping: options?.use_grouping,
	}).format(numResult.data);
};

/**
 * Format as currency
 */
const formatCurrency = (
	value: unknown,
	currency: string,
	options?: CurrencyFormatOptions
): string => {
	const numResult = toNumber(value);
	if (isErr(numResult)) {
		return stringifyValue(value);
	}

	return new Intl.NumberFormat(undefined, {
		style: 'currency',
		currency,
		minimumFractionDigits: options?.minimum_fraction_digits,
		maximumFractionDigits: options?.maximum_fraction_digits,
		currencyDisplay: mapCurrencyDisplay(options?.display),
	}).format(numResult.data);
};

/**
 * Map schema currency display to Intl currencyDisplay
 */
const mapCurrencyDisplay = (
	display: CurrencyFormatOptions['display']
): IntlCurrencyDisplay | undefined => {
	if (display === 'narrow_symbol') {
		return 'narrowSymbol';
	}
	return display;
};

/**
 * Format as percentage
 */
const formatPercent = (value: unknown, options?: PercentFormatOptions): string => {
	const numResult = toNumber(value);
	if (isErr(numResult)) {
		return stringifyValue(value);
	}

	return new Intl.NumberFormat(undefined, {
		style: 'percent',
		minimumFractionDigits: options?.minimum_fraction_digits,
		maximumFractionDigits: options?.maximum_fraction_digits,
	}).format(numResult.data);
};

/**
 * Format with unit
 */
const formatUnit = (
	value: unknown,
	unit: string,
	display: UnitDisplay = 'short'
): string => {
	const numResult = toNumber(value);
	if (isErr(numResult)) {
		return stringifyValue(value);
	}

	return new Intl.NumberFormat(undefined, {
		style: 'unit',
		unit,
		unitDisplay: display,
	}).format(numResult.data);
};

/**
 * Format as relative date (e.g., '2 days ago', 'in 3 hours')
 */
const formatRelativeDate = (value: unknown, now: DateTime): string => {
	const dateResult = toDateTime(value);
	if (isErr(dateResult)) {
		return stringifyValue(value);
	}

	const diff = dateResult.data.diff(now, ['years', 'months', 'weeks', 'days', 'hours', 'minutes', 'seconds']);
	const rtf = new Intl.RelativeTimeFormat(undefined, {numeric: 'auto'});

	// Find the largest non-zero unit
	const unitValue = selectRelativeTimeUnit(diff);
	if (unitValue === null) {
		return rtf.format(0, 'second');
	}

	return rtf.format(Math.round(unitValue.value), unitValue.unit);
};

/**
 * Select the most appropriate unit for relative time display
 */
interface RelativeTimeValue {
	value: number;
	unit: RelativeTimeUnit;
}

const selectRelativeTimeUnit = (diff: Duration): RelativeTimeValue | null => {
	const units: Array<{key: keyof Duration; unit: RelativeTimeUnit}> = [
		{key: 'years', unit: 'year'},
		{key: 'months', unit: 'month'},
		{key: 'weeks', unit: 'week'},
		{key: 'days', unit: 'day'},
		{key: 'hours', unit: 'hour'},
		{key: 'minutes', unit: 'minute'},
		{key: 'seconds', unit: 'second'},
	];

	for (const {key, unit} of units) {
		const value = diff.get(key);
		if (Math.abs(value) >= 1) {
			return {value, unit};
		}
	}

	return null;
};

/**
 * Format as absolute date/time
 *
 * Defaults to ISO 8601 format (yyyy-MM-dd) for unambiguous date representation.
 */
const formatAbsoluteDate = (
	value: unknown,
	display: DateTimeDisplay = 'datetime',
	style: DateTimeStyle = 'medium'
): string => {
	const dateResult = toDateTime(value);
	if (isErr(dateResult)) {
		return stringifyValue(value);
	}

	const dt = dateResult.data;

	// Use ISO format for unambiguous date representation
	switch (display) {
		case 'date':
			return formatDateISO(dt, style);
		case 'time':
			return formatTimeISO(dt, style);
		case 'datetime':
			return `${formatDateISO(dt, style)} ${formatTimeISO(dt, style)}`;
	}
};

/**
 * Format date portion in ISO-inspired format
 */
const formatDateISO = (dt: DateTime, style: DateTimeStyle): string => {
	switch (style) {
		case 'short':
		case 'medium':
			return dt.toFormat(DATE_FORMAT_ISO_SHORT);
		case 'long':
			return dt.toFormat(DATE_FORMAT_ISO_LONG);
		case 'full':
			return dt.toFormat(DATE_FORMAT_ISO_FULL);
	}
};

/**
 * Format time portion
 */
const formatTimeISO = (dt: DateTime, style: DateTimeStyle): string => {
	switch (style) {
		case 'short':
			return dt.toFormat(TIME_FORMAT_SHORT);
		case 'medium':
			return dt.toFormat(TIME_FORMAT_MEDIUM);
		case 'long':
		case 'full':
			return dt.toFormat(TIME_FORMAT_LONG);
	}
};

/**
 * Format as elapsed duration
 */
const formatElapsed = (
	value: unknown,
	style: 'compact' | 'expanded' = 'compact'
): string => {
	// Try to parse as ISO 8601 duration string
	if (typeof value === 'string') {
		const duration = parseISO8601Duration(value);
		return formatElapsedTime(duration, style);
	}

	// If it's a number, assume milliseconds and convert to duration
	if (typeof value === 'number') {
		const luxonDuration = Duration.fromMillis(value).shiftTo('hours', 'minutes', 'seconds');
		return formatElapsedTime(
			{
				hours: Math.floor(luxonDuration.hours),
				minutes: Math.floor(luxonDuration.minutes),
				seconds: Math.floor(luxonDuration.seconds),
			},
			style
		);
	}

	return stringifyValue(value);
};

// ============================================================================
// Conversion Utilities
// ============================================================================

/**
 * Convert value to number
 */
const toNumber = (value: unknown): Result<number, string> => {
	if (typeof value === 'number' && !Number.isNaN(value)) {
		return ok(value);
	}

	if (typeof value === 'string') {
		const parsed = parseFloat(value);
		if (!Number.isNaN(parsed)) {
			return ok(parsed);
		}
	}

	return err('Value cannot be converted to number');
};

/**
 * Convert value to luxon DateTime
 */
const toDateTime = (value: unknown): Result<DateTime, string> => {
	if (value instanceof Date && !Number.isNaN(value.getTime())) {
		return ok(DateTime.fromJSDate(value));
	}

	if (typeof value === 'string') {
		const dt = DateTime.fromISO(value);
		if (dt.isValid) {
			return ok(dt);
		}
		// Try parsing as other common formats
		const dtRFC = DateTime.fromRFC2822(value);
		if (dtRFC.isValid) {
			return ok(dtRFC);
		}
	}

	if (typeof value === 'number') {
		const dt = DateTime.fromMillis(value);
		if (dt.isValid) {
			return ok(dt);
		}
	}

	return err('Value cannot be converted to DateTime');
};

/**
 * Convert any value to a displayable string
 *
 * Objects are JSON stringified to avoid '[object Object]' in the UI.
 */
const stringifyValue = (value: unknown): string => {
	if (value === null) {
		return 'null';
	}

	if (value === undefined) {
		return 'undefined';
	}

	if (typeof value === 'object') {
		try {
			return JSON.stringify(value);
		} catch {
			return String(value);
		}
	}

	return String(value);
};
