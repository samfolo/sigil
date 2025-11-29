import type {Duration} from 'iso8601-duration';
import {describe, expect, it} from 'vitest';

import type {ElapsedTimeStyle} from './formatElapsedTime';
import {formatElapsedTime} from './formatElapsedTime';

interface TestCase {
	duration: Duration;
	style: ElapsedTimeStyle;
	expected: string;
}

describe('formatElapsedTime', () => {
	it.each<TestCase>([
		// Compact style (short unit display)
		{duration: {hours: 2, minutes: 30}, style: 'compact', expected: '2 hrs, 30 mins'},
		{duration: {hours: 5}, style: 'compact', expected: '5 hrs'},
		{duration: {seconds: 45}, style: 'compact', expected: '45 secs'},
		{duration: {years: 1, days: 5, seconds: 10}, style: 'compact', expected: '1 yr, 5 days, 10 secs'},
		{duration: {years: 100, days: 365}, style: 'compact', expected: '100 yrs, 365 days'},
		{duration: {}, style: 'compact', expected: '0 sec'},
		{duration: {hours: 0, minutes: 0}, style: 'compact', expected: '0 sec'},
		{
			duration: {years: 1, months: 2, weeks: 3, days: 4, hours: 5, minutes: 6, seconds: 7},
			style: 'compact',
			expected: '1 yr, 2 mths, 3 wks, 4 days, 5 hrs, 6 mins, 7 secs',
		},

		// Expanded style (long unit display)
		{duration: {hours: 2, minutes: 30}, style: 'expanded', expected: '2 hours, 30 minutes'},
		{duration: {hours: 1, minutes: 1, seconds: 1}, style: 'expanded', expected: '1 hour, 1 minute, 1 second'},
		{duration: {years: 1}, style: 'expanded', expected: '1 year'},
		{duration: {years: 5}, style: 'expanded', expected: '5 years'},
		{duration: {weeks: 1}, style: 'expanded', expected: '1 week'},
		{duration: {weeks: 2}, style: 'expanded', expected: '2 weeks'},
		{duration: {years: 1, days: 5, seconds: 10}, style: 'expanded', expected: '1 year, 5 days, 10 seconds'},
		{duration: {}, style: 'expanded', expected: '0 seconds'},
		{
			duration: {years: 1, months: 2, weeks: 3, days: 4, hours: 5, minutes: 6, seconds: 7},
			style: 'expanded',
			expected: '1 year, 2 months, 3 weeks, 4 days, 5 hours, 6 minutes, 7 seconds',
		},

		// Edge cases
		{duration: {hours: 2, minutes: undefined}, style: 'compact', expected: '2 hrs'},
		{duration: {seconds: 30.5}, style: 'compact', expected: '30.5 secs'},
		{duration: {seconds: 30.5}, style: 'expanded', expected: '30.5 seconds'},
	])('formats $duration as "$expected" ($style)', ({duration, style, expected}) => {
		expect(formatElapsedTime(duration, style)).toBe(expected);
	});
});
