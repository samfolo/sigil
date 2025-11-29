/**
 * Format ISO 8601 duration objects into human-readable elapsed time strings
 *
 * Uses luxon's Duration.toHuman() for locale-aware formatting.
 *
 * Supports two display styles:
 * - compact: '2 hr, 30 min' (narrow unit display)
 * - expanded: '2 hours, 30 minutes' (long unit display)
 */

import type {Duration as ISO8601Duration} from 'iso8601-duration';
import {Duration} from 'luxon';

/**
 * Display style for elapsed time formatting
 *
 * - 'compact': Short form using narrow units
 * - 'expanded': Long form using full unit names
 */
export type ElapsedTimeStyle = 'compact' | 'expanded';

/**
 * Zero duration fallback strings
 */
const ZERO_DURATION_COMPACT = '0 sec';
const ZERO_DURATION_EXPANDED = '0 seconds';

/**
 * Converts iso8601-duration object to luxon Duration
 */
const toLuxonDuration = (duration: ISO8601Duration): Duration => Duration.fromObject({
	years: duration.years,
	months: duration.months,
	weeks: duration.weeks,
	days: duration.days,
	hours: duration.hours,
	minutes: duration.minutes,
	seconds: duration.seconds,
});

/**
 * Checks if duration has any non-zero values
 */
const isZeroDuration = (duration: ISO8601Duration): boolean => {
	const keys: Array<keyof ISO8601Duration> = ['years', 'months', 'weeks', 'days', 'hours', 'minutes', 'seconds'];
	return keys.every(key => !duration[key] || duration[key] === 0);
};

/**
 * Formats a Duration object into a human-readable string
 *
 * @param duration - ISO 8601 duration object from iso8601-duration parse()
 * @param style - Display style for the output
 * @returns Formatted duration string
 *
 * @example
 * ```typescript
 * formatElapsedTime({hours: 2, minutes: 30}, 'compact');
 * // → '2 hr, 30 min'
 *
 * formatElapsedTime({hours: 2, minutes: 30}, 'expanded');
 * // → '2 hours, 30 minutes'
 * ```
 */
export const formatElapsedTime = (
	duration: ISO8601Duration,
	style: ElapsedTimeStyle
): string => {
	// Handle zero duration
	if (isZeroDuration(duration)) {
		return style === 'compact' ? ZERO_DURATION_COMPACT : ZERO_DURATION_EXPANDED;
	}

	const luxonDuration = toLuxonDuration(duration);

	return luxonDuration.toHuman({
		unitDisplay: style === 'compact' ? 'short' : 'long',
		listStyle: 'narrow',
		showZeros: false,
	});
};
