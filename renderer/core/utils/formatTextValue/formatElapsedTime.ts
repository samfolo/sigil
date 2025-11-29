/**
 * Format ISO 8601 duration objects into human-readable elapsed time strings
 *
 * Supports two display styles:
 * - compact: '1y 2mo 3d 4h 5m 6s'
 * - expanded: '1 year 2 months 3 days 4 hours 5 minutes 6 seconds'
 *
 * Only displays non-zero units for cleaner output.
 */

import type {Duration} from 'iso8601-duration';

/**
 * Display style for elapsed time formatting
 *
 * - 'compact': Short form (e.g., '2h 30m')
 * - 'expanded': Long form (e.g., '2 hours 30 minutes')
 */
export type ElapsedTimeStyle = 'compact' | 'expanded';

/**
 * Unit configuration for formatting durations
 */
interface UnitConfig {
	key: keyof Duration;
	compact: string;
	singular: string;
	plural: string;
}

/**
 * Ordered list of duration units from largest to smallest
 */
const DURATION_UNITS: UnitConfig[] = [
	{key: 'years', compact: 'y', singular: 'year', plural: 'years'},
	{key: 'months', compact: 'mo', singular: 'month', plural: 'months'},
	{key: 'weeks', compact: 'w', singular: 'week', plural: 'weeks'},
	{key: 'days', compact: 'd', singular: 'day', plural: 'days'},
	{key: 'hours', compact: 'h', singular: 'hour', plural: 'hours'},
	{key: 'minutes', compact: 'm', singular: 'minute', plural: 'minutes'},
	{key: 'seconds', compact: 's', singular: 'second', plural: 'seconds'},
];

/**
 * Formats a Duration object into a human-readable string
 *
 * @param duration - ISO 8601 duration object from iso8601-duration parse()
 * @param style - Display style for the output
 * @returns Formatted duration string, or '0s'/'0 seconds' if duration is zero
 *
 * @example
 * ```typescript
 * formatElapsedTime({hours: 2, minutes: 30}, 'compact');
 * // → '2h 30m'
 *
 * formatElapsedTime({hours: 2, minutes: 30}, 'expanded');
 * // → '2 hours 30 minutes'
 *
 * formatElapsedTime({years: 1, days: 5, seconds: 10}, 'compact');
 * // → '1y 5d 10s'
 * ```
 */
export const formatElapsedTime = (
	duration: Duration,
	style: ElapsedTimeStyle
): string => {
	const parts: string[] = [];

	for (const unit of DURATION_UNITS) {
		const value = duration[unit.key];

		if (value !== undefined && value !== 0) {
			if (style === 'compact') {
				parts.push(`${value}${unit.compact}`);
			} else {
				const label = value === 1 ? unit.singular : unit.plural;
				parts.push(`${value} ${label}`);
			}
		}
	}

	// Handle zero duration
	if (parts.length === 0) {
		return style === 'compact' ? '0s' : '0 seconds';
	}

	return parts.join(' ');
};
