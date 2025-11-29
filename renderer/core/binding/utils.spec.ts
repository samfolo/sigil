/**
 * Tests for binding utility functions
 *
 * Tests cover:
 * - formatCellValue with value_mappings
 * - formatCellValue with TextFormat (format parameter)
 * - Null/undefined handling and pass-through
 * - Format precedence (value_mappings take priority)
 */

import {describe, expect, it} from 'vitest';

import type {FieldMetadata, TextFormat} from '@sigil/src/lib/generated/types/specification';

import {formatCellValue} from './utils';

describe('formatCellValue', () => {
	describe('without format or value_mappings', () => {
		it('should stringify primitive values', () => {
			expect(formatCellValue('hello', undefined, undefined)).toBe('hello');
			expect(formatCellValue(42, undefined, undefined)).toBe('42');
			expect(formatCellValue(true, undefined, undefined)).toBe('true');
		});

		it('should JSON stringify objects', () => {
			expect(formatCellValue({key: 'value'}, undefined, undefined)).toBe('{"key":"value"}');
		});

		it('should JSON stringify arrays', () => {
			expect(formatCellValue([1, 2, 3], undefined, undefined)).toBe('[1,2,3]');
		});

		it('should pass through null', () => {
			expect(formatCellValue(null, undefined, undefined)).toBeNull();
		});

		it('should pass through undefined', () => {
			expect(formatCellValue(undefined, undefined, undefined)).toBeUndefined();
		});
	});

	describe('with value_mappings', () => {
		const metadataWithMappings: FieldMetadata = {
			data_types: ['string'],
			roles: ['category'],
			value_mappings: {
				'active': {display_value: 'Active'},
				'inactive': {display_value: 'Inactive'},
				'true': {display_value: 'Yes'},
				'false': {display_value: 'No'},
				'1': {display_value: 'Critical'},
				'null': {display_value: 'N/A'},
				'undefined': {display_value: '-'},
			},
		};

		it('should apply string value mapping', () => {
			expect(formatCellValue('active', metadataWithMappings, undefined)).toBe('Active');
			expect(formatCellValue('inactive', metadataWithMappings, undefined)).toBe('Inactive');
		});

		it('should apply boolean value mapping', () => {
			expect(formatCellValue(true, metadataWithMappings, undefined)).toBe('Yes');
			expect(formatCellValue(false, metadataWithMappings, undefined)).toBe('No');
		});

		it('should apply number value mapping', () => {
			expect(formatCellValue(1, metadataWithMappings, undefined)).toBe('Critical');
		});

		it('should apply null value mapping', () => {
			expect(formatCellValue(null, metadataWithMappings, undefined)).toBe('N/A');
		});

		it('should apply undefined value mapping', () => {
			expect(formatCellValue(undefined, metadataWithMappings, undefined)).toBe('-');
		});

		it('should fall through to stringify when no mapping exists', () => {
			expect(formatCellValue('unknown', metadataWithMappings, undefined)).toBe('unknown');
			expect(formatCellValue(99, metadataWithMappings, undefined)).toBe('99');
		});
	});

	describe('with TextFormat', () => {
		it('should format decimal numbers', () => {
			const format: TextFormat = {
				type: 'decimal',
				options: {minimum_fraction_digits: 2, maximum_fraction_digits: 2},
			};

			expect(formatCellValue(1234.5, undefined, format)).toBe('1,234.50');
		});

		it('should format currency', () => {
			const format: TextFormat = {
				type: 'currency',
				currency: 'GBP',
				options: {minimum_fraction_digits: 2},
			};

			expect(formatCellValue(99.99, undefined, format)).toBe('£99.99');
		});

		it('should format percent', () => {
			const format: TextFormat = {
				type: 'percent',
				options: {minimum_fraction_digits: 1},
			};

			expect(formatCellValue(0.756, undefined, format)).toBe('75.6%');
		});

		it('should format unit', () => {
			const format: TextFormat = {
				type: 'unit',
				unit: 'kilometer',
				display: 'short',
			};

			expect(formatCellValue(42, undefined, format)).toBe('42 km');
		});

		it('should pass through null even with format', () => {
			const format: TextFormat = {type: 'decimal'};
			expect(formatCellValue(null, undefined, format)).toBeNull();
		});

		it('should pass through undefined even with format', () => {
			const format: TextFormat = {type: 'decimal'};
			expect(formatCellValue(undefined, undefined, format)).toBeUndefined();
		});
	});

	describe('precedence: value_mappings over format', () => {
		const metadataWithMappings: FieldMetadata = {
			data_types: ['number'],
			roles: ['category'],
			value_mappings: {
				'100': {display_value: 'Perfect Score'},
			},
		};

		const currencyFormat: TextFormat = {
			type: 'currency',
			currency: 'USD',
		};

		it('should use value_mapping when present, ignoring format', () => {
			expect(formatCellValue(100, metadataWithMappings, currencyFormat)).toBe('Perfect Score');
		});

		it('should use format when no matching value_mapping exists', () => {
			expect(formatCellValue(50, metadataWithMappings, currencyFormat)).toBe('US$50.00');
		});
	});

	describe('with both value_mappings and format for null/undefined', () => {
		it('should use null mapping over format', () => {
			const metadata: FieldMetadata = {
				data_types: ['number'],
				roles: ['value'],
				value_mappings: {
					'null': {display_value: 'Not Available'},
				},
			};
			const format: TextFormat = {type: 'decimal'};

			expect(formatCellValue(null, metadata, format)).toBe('Not Available');
		});

		it('should use undefined mapping over format', () => {
			const metadata: FieldMetadata = {
				data_types: ['number'],
				roles: ['value'],
				value_mappings: {
					'undefined': {display_value: 'Missing'},
				},
			};
			const format: TextFormat = {type: 'decimal'};

			expect(formatCellValue(undefined, metadata, format)).toBe('Missing');
		});

		it('should pass through null when no mapping exists', () => {
			const metadata: FieldMetadata = {
				data_types: ['number'],
				roles: ['value'],
			};
			const format: TextFormat = {type: 'decimal'};

			expect(formatCellValue(null, metadata, format)).toBeNull();
		});
	});
});
