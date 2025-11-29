import {DateTime} from 'luxon';
import {describe, expect, it} from 'vitest';

import type {TextFormat} from '@sigil/src/lib/generated/types/specification';

import {formatTextValue} from './formatTextValue';

interface TestCase {
	name: string;
	value: unknown;
	format: TextFormat | undefined;
	expected: string;
}

describe('formatTextValue', () => {
	describe('null/undefined passthrough', () => {
		it('returns null for null input', () => {
			expect(formatTextValue(null, undefined)).toBeNull();
		});

		it('returns undefined for undefined input', () => {
			expect(formatTextValue(undefined, undefined)).toBeUndefined();
		});

		it('returns null even with format specified', () => {
			expect(formatTextValue(null, {type: 'decimal'})).toBeNull();
		});

		it('returns undefined even with format specified', () => {
			expect(formatTextValue(undefined, {type: 'decimal'})).toBeUndefined();
		});
	});

	describe('no format (string conversion)', () => {
		it.each<TestCase>([
			{name: 'string', value: 'hello', format: undefined, expected: 'hello'},
			{name: 'number', value: 42, format: undefined, expected: '42'},
			{name: 'boolean', value: true, format: undefined, expected: 'true'},
			{name: 'object', value: {a: 1}, format: undefined, expected: '{"a":1}'},
			{name: 'array', value: [1, 2, 3], format: undefined, expected: '[1,2,3]'},
		])('converts $name to string', ({value, format, expected}) => {
			expect(formatTextValue(value, format)).toBe(expected);
		});
	});

	describe('decimal format', () => {
		it.each<TestCase>([
			{
				name: 'basic number',
				value: 1234.567,
				format: {type: 'decimal'},
				expected: '1,234.567',
			},
			{
				name: 'with minimum fraction digits',
				value: 42,
				format: {type: 'decimal', options: {minimum_fraction_digits: 2}},
				expected: '42.00',
			},
			{
				name: 'with maximum fraction digits',
				value: 3.14159,
				format: {type: 'decimal', options: {maximum_fraction_digits: 2}},
				expected: '3.14',
			},
			{
				name: 'without grouping',
				value: 1234567,
				format: {type: 'decimal', options: {use_grouping: false}},
				expected: '1234567',
			},
			{
				name: 'string number',
				value: '9876.54',
				format: {type: 'decimal'},
				expected: '9,876.54',
			},
			{
				name: 'invalid value fallback',
				value: 'not a number',
				format: {type: 'decimal'},
				expected: 'not a number',
			},
		])('formats $name', ({value, format, expected}) => {
			expect(formatTextValue(value, format)).toBe(expected);
		});
	});

	describe('currency format', () => {
		it.each<TestCase>([
			{
				name: 'GBP',
				value: 1234.56,
				format: {type: 'currency', currency: 'GBP'},
				expected: '£1,234.56',
			},
			{
				name: 'USD',
				value: 99.99,
				format: {type: 'currency', currency: 'USD'},
				expected: 'US$99.99',
			},
			{
				name: 'EUR',
				value: 50,
				format: {type: 'currency', currency: 'EUR'},
				expected: '€50.00',
			},
			{
				name: 'with name display',
				value: 100,
				format: {type: 'currency', currency: 'GBP', options: {display: 'name'}},
				expected: '100.00 British pounds',
			},
			{
				name: 'with narrow symbol',
				value: 100,
				format: {type: 'currency', currency: 'USD', options: {display: 'narrow_symbol'}},
				expected: '$100.00',
			},
			{
				name: 'with fraction digits',
				value: 99,
				format: {type: 'currency', currency: 'GBP', options: {minimum_fraction_digits: 0, maximum_fraction_digits: 0}},
				expected: '£99',
			},
		])('formats $name', ({value, format, expected}) => {
			expect(formatTextValue(value, format)).toBe(expected);
		});

		it('formats with code display', () => {
			const result = formatTextValue(100, {type: 'currency', currency: 'GBP', options: {display: 'code'}});
			// Intl uses narrow non-breaking space between code and amount
			expect(result).toMatch(/^GBP\s+100\.00$/);
		});
	});

	describe('percent format', () => {
		it.each<TestCase>([
			{
				name: 'basic percentage',
				value: 0.5,
				format: {type: 'percent'},
				expected: '50%',
			},
			{
				name: 'with fraction digits',
				value: 0.1234,
				format: {type: 'percent', options: {minimum_fraction_digits: 1, maximum_fraction_digits: 1}},
				expected: '12.3%',
			},
			{
				name: 'greater than 100%',
				value: 1.5,
				format: {type: 'percent'},
				expected: '150%',
			},
			{
				name: 'zero',
				value: 0,
				format: {type: 'percent'},
				expected: '0%',
			},
		])('formats $name', ({value, format, expected}) => {
			expect(formatTextValue(value, format)).toBe(expected);
		});
	});

	describe('unit format', () => {
		it.each<TestCase>([
			{
				name: 'kilometres short',
				value: 5,
				format: {type: 'unit', unit: 'kilometer'},
				expected: '5 km',
			},
			{
				name: 'kilometres long',
				value: 5,
				format: {type: 'unit', unit: 'kilometer', display: 'long'},
				expected: '5 kilometres',
			},
			{
				name: 'megabytes narrow',
				value: 100,
				format: {type: 'unit', unit: 'megabyte', display: 'narrow'},
				expected: '100MB',
			},
			{
				name: 'celsius',
				value: 25,
				format: {type: 'unit', unit: 'celsius'},
				expected: '25°C',
			},
		])('formats $name', ({value, format, expected}) => {
			expect(formatTextValue(value, format)).toBe(expected);
		});
	});

	describe('relative date format', () => {
		const NOW = DateTime.fromISO('2025-06-15T12:00:00Z');

		it.each<{name: string; value: string; expected: string}>([
			{name: 'yesterday', value: '2025-06-14T12:00:00Z', expected: 'yesterday'},
			{name: 'tomorrow', value: '2025-06-16T12:00:00Z', expected: 'tomorrow'},
			{name: '3 days ago', value: '2025-06-12T12:00:00Z', expected: '3 days ago'},
			{name: 'in 2 weeks', value: '2025-06-29T12:00:00Z', expected: 'in 2 weeks'},
			{name: 'last month', value: '2025-05-15T12:00:00Z', expected: 'last month'},
			{name: 'last year', value: '2024-06-15T12:00:00Z', expected: 'last year'},
		])('formats $name', ({value, expected}) => {
			expect(formatTextValue(value, {type: 'relative'}, {now: NOW})).toBe(expected);
		});
	});

	describe('absolute date format', () => {
		it.each<TestCase>([
			{
				name: 'datetime medium (default)',
				value: '2025-06-15T14:30:00Z',
				format: {type: 'absolute'},
				expected: '2025-06-15 14:30:00',
			},
			{
				name: 'date only short',
				value: '2025-06-15T14:30:00Z',
				format: {type: 'absolute', display: 'date', style: 'short'},
				expected: '2025-06-15',
			},
			{
				name: 'date only long',
				value: '2025-06-15T14:30:00Z',
				format: {type: 'absolute', display: 'date', style: 'long'},
				expected: '15 June 2025',
			},
			{
				name: 'date only full',
				value: '2025-06-15T14:30:00Z',
				format: {type: 'absolute', display: 'date', style: 'full'},
				expected: 'Sunday, 15 June 2025',
			},
			{
				name: 'time only short',
				value: '2025-06-15T14:30:00Z',
				format: {type: 'absolute', display: 'time', style: 'short'},
				expected: '14:30',
			},
			{
				name: 'time only medium',
				value: '2025-06-15T14:30:45Z',
				format: {type: 'absolute', display: 'time', style: 'medium'},
				expected: '14:30:45',
			},
			{
				name: 'from Date object',
				value: new Date('2025-06-15T14:30:00Z'),
				format: {type: 'absolute', display: 'date', style: 'short'},
				expected: '2025-06-15',
			},
		])('formats $name', ({value, format, expected}) => {
			expect(formatTextValue(value, format)).toBe(expected);
		});
	});

	describe('elapsed format', () => {
		it.each<TestCase>([
			{
				name: 'ISO 8601 duration compact',
				value: 'PT2H30M',
				format: {type: 'elapsed'},
				expected: '2 hrs, 30 mins',
			},
			{
				name: 'ISO 8601 duration expanded',
				value: 'PT2H30M',
				format: {type: 'elapsed', style: 'expanded'},
				expected: '2 hours, 30 minutes',
			},
			{
				name: 'full duration',
				value: 'P1Y2M3DT4H5M6S',
				format: {type: 'elapsed'},
				expected: '1 yr, 2 mths, 3 days, 4 hrs, 5 mins, 6 secs',
			},
			{
				name: 'milliseconds',
				value: 9000000,
				format: {type: 'elapsed'},
				expected: '2 hrs, 30 mins',
			},
			{
				name: 'milliseconds expanded',
				value: 9000000,
				format: {type: 'elapsed', style: 'expanded'},
				expected: '2 hours, 30 minutes',
			},
		])('formats $name', ({value, format, expected}) => {
			expect(formatTextValue(value, format)).toBe(expected);
		});
	});

	describe('graceful fallback', () => {
		it.each<TestCase>([
			{
				name: 'invalid number for decimal',
				value: 'abc',
				format: {type: 'decimal'},
				expected: 'abc',
			},
			{
				name: 'invalid date for relative',
				value: 'not a date',
				format: {type: 'relative'},
				expected: 'not a date',
			},
			{
				name: 'invalid date for absolute',
				value: 'invalid',
				format: {type: 'absolute'},
				expected: 'invalid',
			},
			{
				name: 'object for number format',
				value: {x: 1},
				format: {type: 'decimal'},
				expected: '{"x":1}',
			},
		])('falls back to string for $name', ({value, format, expected}) => {
			expect(formatTextValue(value, format)).toBe(expected);
		});
	});

	describe('timezone option', () => {
		it('defaults to UTC for absolute dates', () => {
			const result = formatTextValue('2025-06-15T14:30:00Z', {type: 'absolute', display: 'time', style: 'short'});
			expect(result).toBe('14:30');
		});

		it('converts to specified timezone for absolute dates', () => {
			const result = formatTextValue('2025-06-15T14:30:00Z', {type: 'absolute', display: 'time', style: 'short'}, {timezone: 'Europe/London'});
			expect(result).toBe('15:30');
		});

		it('handles timezone with date display', () => {
			// Midnight UTC on the 15th is still the 14th in New York (UTC-4 in June)
			const result = formatTextValue('2025-06-15T02:00:00Z', {type: 'absolute', display: 'date', style: 'short'}, {timezone: 'America/New_York'});
			expect(result).toBe('2025-06-14');
		});

		it('uses timezone for relative date calculations', () => {
			const now = DateTime.fromISO('2025-06-15T23:00:00Z');
			// In UTC, both are on the 15th (same day)
			// In Pacific time (UTC-7), now is 16:00 on the 15th, value is 01:00 on the 15th (14 hours ago)
			const result = formatTextValue('2025-06-15T08:00:00Z', {type: 'relative'}, {now, timezone: 'utc'});
			expect(result).toBe('15 hours ago');
		});
	});
});
