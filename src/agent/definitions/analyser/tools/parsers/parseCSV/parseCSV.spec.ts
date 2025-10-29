import {describe, expect, it} from 'vitest';

import {isOk} from '@sigil/src/common/errors';

import {parseCSV} from './parseCSV';
import {MAX_COLUMN_VALUE_LENGTH} from './types';

describe('parseCSV', () => {
	describe('invalid CSV', () => {
		it('returns valid: false for empty string', () => {
			const result = parseCSV('');

			expect(isOk(result)).toBe(true);
			if (!isOk(result)) {
				return;
			}

			expect(result.data.valid).toBe(false);
			if (result.data.valid) {
				return;
			}

			expect(result.data.error).toBeTruthy();
			expect(typeof result.data.error).toBe('string');
		});

		it('always returns ok(), never err()', () => {
			const result = parseCSV('');

			expect(isOk(result)).toBe(true);
		});
	});

	describe('valid CSV', () => {
		it('parses simple 2x3 CSV', () => {
			const csv = 'name,age\nJohn,30\nJane,25';
			const result = parseCSV(csv);

			expect(isOk(result)).toBe(true);
			if (!isOk(result)) {
				return;
			}

			expect(result.data.valid).toBe(true);
			if (!result.data.valid) {
				return;
			}

			const {metadata} = result.data;
			expect(metadata.rowCount).toBe(3);
			expect(metadata.columnCount).toBe(2);
			expect(metadata.columns).toHaveLength(2);
			expect(metadata.columns.at(0)?.value).toBe('name');
			expect(metadata.columns.at(0)?.exact).toBe(true);
			expect(metadata.columns.at(1)?.value).toBe('age');
			expect(metadata.columns.at(1)?.exact).toBe(true);
		});

		it('parses CSV with numbers', () => {
			const csv = '1,2,3\n4,5,6\n7,8,9';
			const result = parseCSV(csv);

			expect(isOk(result)).toBe(true);
			if (!isOk(result)) {
				return;
			}

			expect(result.data.valid).toBe(true);
			if (!result.data.valid) {
				return;
			}

			const {metadata} = result.data;
			expect(metadata.rowCount).toBe(3);
			expect(metadata.columnCount).toBe(3);
			expect(metadata.columns.at(0)?.value).toBe('1');
			expect(metadata.columns.at(1)?.value).toBe('2');
			expect(metadata.columns.at(2)?.value).toBe('3');
		});

		it('parses CSV with booleans', () => {
			const csv = 'enabled,active\ntrue,false\nfalse,true';
			const result = parseCSV(csv);

			expect(isOk(result)).toBe(true);
			if (!isOk(result)) {
				return;
			}

			expect(result.data.valid).toBe(true);
			if (!result.data.valid) {
				return;
			}

			const {metadata} = result.data;
			expect(metadata.rowCount).toBe(3);
			expect(metadata.columnCount).toBe(2);
		});

		it('parses CSV with empty cells', () => {
			const csv = 'name,age,city\nJohn,,London\n,30,';
			const result = parseCSV(csv);

			expect(isOk(result)).toBe(true);
			if (!isOk(result)) {
				return;
			}

			expect(result.data.valid).toBe(true);
			if (!result.data.valid) {
				return;
			}

			const {metadata} = result.data;
			expect(metadata.rowCount).toBe(3);
			expect(metadata.columnCount).toBe(3);
			expect(metadata.columns.at(0)?.value).toBe('name');
		});

		it('parses single row CSV', () => {
			const csv = 'name,age,city';
			const result = parseCSV(csv);

			expect(isOk(result)).toBe(true);
			if (!isOk(result)) {
				return;
			}

			expect(result.data.valid).toBe(true);
			if (!result.data.valid) {
				return;
			}

			const {metadata} = result.data;
			expect(metadata.rowCount).toBe(1);
			expect(metadata.columnCount).toBe(3);
		});

		it('parses single column CSV', () => {
			const csv = 'name\nJohn\nJane\nBob';
			const result = parseCSV(csv);

			expect(isOk(result)).toBe(true);
			if (!isOk(result)) {
				return;
			}

			expect(result.data.valid).toBe(true);
			if (!result.data.valid) {
				return;
			}

			const {metadata} = result.data;
			expect(metadata.rowCount).toBe(4);
			expect(metadata.columnCount).toBe(1);
			expect(metadata.columns).toHaveLength(1);
			expect(metadata.columns.at(0)?.value).toBe('name');
		});

		it('calculates size from raw input string', () => {
			const csv = 'name,age\nJohn,30';
			const result = parseCSV(csv);

			expect(isOk(result)).toBe(true);
			if (!isOk(result)) {
				return;
			}

			expect(result.data.valid).toBe(true);
			if (!result.data.valid) {
				return;
			}

			const {metadata} = result.data;
			expect(metadata.size.characters).toBe(csv.length);
			expect(metadata.size.bytes).toBeGreaterThan(0);
			expect(metadata.size.lines).toBe(2);
		});
	});

	describe('custom delimiters', () => {
		it('parses tab-separated values', () => {
			const csv = 'name\tage\nJohn\t30\nJane\t25';
			const result = parseCSV(csv, '\t');

			expect(isOk(result)).toBe(true);
			if (!isOk(result)) {
				return;
			}

			expect(result.data.valid).toBe(true);
			if (!result.data.valid) {
				return;
			}

			const {metadata} = result.data;
			expect(metadata.rowCount).toBe(3);
			expect(metadata.columnCount).toBe(2);
			expect(metadata.columns.at(0)?.value).toBe('name');
			expect(metadata.columns.at(1)?.value).toBe('age');
		});

		it('parses pipe-separated values', () => {
			const csv = 'name|age|city\nJohn|30|London\nJane|25|Paris';
			const result = parseCSV(csv, '|');

			expect(isOk(result)).toBe(true);
			if (!isOk(result)) {
				return;
			}

			expect(result.data.valid).toBe(true);
			if (!result.data.valid) {
				return;
			}

			const {metadata} = result.data;
			expect(metadata.rowCount).toBe(3);
			expect(metadata.columnCount).toBe(3);
			expect(metadata.columns.at(0)?.value).toBe('name');
			expect(metadata.columns.at(1)?.value).toBe('age');
			expect(metadata.columns.at(2)?.value).toBe('city');
		});

		it('parses semicolon-separated values', () => {
			const csv = 'name;age\nJohn;30\nJane;25';
			const result = parseCSV(csv, ';');

			expect(isOk(result)).toBe(true);
			if (!isOk(result)) {
				return;
			}

			expect(result.data.valid).toBe(true);
			if (!result.data.valid) {
				return;
			}

			const {metadata} = result.data;
			expect(metadata.rowCount).toBe(3);
			expect(metadata.columnCount).toBe(2);
		});
	});

	describe('column value truncation', () => {
		it('does not truncate short strings', () => {
			const csv = 'short,values\ntest,data';
			const result = parseCSV(csv);

			expect(isOk(result)).toBe(true);
			if (!isOk(result)) {
				return;
			}

			expect(result.data.valid).toBe(true);
			if (!result.data.valid) {
				return;
			}

			const {metadata} = result.data;
			expect(metadata.columns.at(0)?.value).toBe('short');
			expect(metadata.columns.at(0)?.exact).toBe(true);
			expect(metadata.columns.at(1)?.value).toBe('values');
			expect(metadata.columns.at(1)?.exact).toBe(true);
		});

		it('truncates values longer than MAX_COLUMN_VALUE_LENGTH', () => {
			const longValue = 'a'.repeat(150);
			const csv = `${longValue},short\ndata,more`;
			const result = parseCSV(csv);

			expect(isOk(result)).toBe(true);
			if (!isOk(result)) {
				return;
			}

			expect(result.data.valid).toBe(true);
			if (!result.data.valid) {
				return;
			}

			const {metadata} = result.data;
			expect(metadata.columns.at(0)?.exact).toBe(false);
			expect(metadata.columns.at(0)?.value).toHaveLength(MAX_COLUMN_VALUE_LENGTH);
			expect(metadata.columns.at(0)?.value).toMatch(/^a+\.\.\.$/);
			expect(metadata.columns.at(1)?.exact).toBe(true);
			expect(metadata.columns.at(1)?.value).toBe('short');
		});

		it('does not truncate values with exactly MAX_COLUMN_VALUE_LENGTH', () => {
			const exactValue = 'a'.repeat(MAX_COLUMN_VALUE_LENGTH);
			const csv = `${exactValue},short\ndata,more`;
			const result = parseCSV(csv);

			expect(isOk(result)).toBe(true);
			if (!isOk(result)) {
				return;
			}

			expect(result.data.valid).toBe(true);
			if (!result.data.valid) {
				return;
			}

			const {metadata} = result.data;
			expect(metadata.columns.at(0)?.exact).toBe(true);
			expect(metadata.columns.at(0)?.value).toBe(exactValue);
		});

		it('handles null values in cells', () => {
			const csv = 'name,age\n,30\nJohn,';
			const result = parseCSV(csv);

			expect(isOk(result)).toBe(true);
			if (!isOk(result)) {
				return;
			}

			expect(result.data.valid).toBe(true);
			if (!result.data.valid) {
				return;
			}

			const {metadata} = result.data;
			expect(metadata.columns.at(0)?.value).toBe('name');
			expect(metadata.columns.at(1)?.value).toBe('age');
		});
	});

	describe('row and column counts', () => {
		it('counts rows accurately', () => {
			const csv = 'a,b\n1,2\n3,4\n5,6\n7,8';
			const result = parseCSV(csv);

			expect(isOk(result)).toBe(true);
			if (!isOk(result)) {
				return;
			}

			expect(result.data.valid).toBe(true);
			if (!result.data.valid) {
				return;
			}

			const {metadata} = result.data;
			expect(metadata.rowCount).toBe(5);
		});

		it('counts columns accurately', () => {
			const csv = 'a,b,c,d,e\n1,2,3,4,5';
			const result = parseCSV(csv);

			expect(isOk(result)).toBe(true);
			if (!isOk(result)) {
				return;
			}

			expect(result.data.valid).toBe(true);
			if (!result.data.valid) {
				return;
			}

			const {metadata} = result.data;
			expect(metadata.columnCount).toBe(5);
		});

		it('handles inconsistent column counts gracefully', () => {
			const csv = 'a,b,c\n1,2\n3,4,5,6';
			const result = parseCSV(csv);

			expect(isOk(result)).toBe(true);
			if (!isOk(result)) {
				return;
			}

			expect(result.data.valid).toBe(true);
			if (!result.data.valid) {
				return;
			}

			const {metadata} = result.data;
			// First row determines column count
			expect(metadata.columnCount).toBe(3);
		});
	});

	describe('edge cases', () => {
		it('skips empty lines when configured', () => {
			const csv = 'name,age\n\nJohn,30\n\nJane,25\n\n';
			const result = parseCSV(csv);

			expect(isOk(result)).toBe(true);
			if (!isOk(result)) {
				return;
			}

			expect(result.data.valid).toBe(true);
			if (!result.data.valid) {
				return;
			}

			const {metadata} = result.data;
			// Should skip empty lines
			expect(metadata.rowCount).toBe(3);
		});

		it('handles quoted fields with embedded delimiters', () => {
			const csv = 'name,description\nJohn,"Contains, comma"\nJane,"Normal text"';
			const result = parseCSV(csv);

			expect(isOk(result)).toBe(true);
			if (!isOk(result)) {
				return;
			}

			expect(result.data.valid).toBe(true);
			if (!result.data.valid) {
				return;
			}

			const {metadata} = result.data;
			expect(metadata.rowCount).toBe(3);
			expect(metadata.columnCount).toBe(2);
		});

		it('handles quoted fields with embedded newlines', () => {
			const csv = 'name,address\nJohn,"123 Main St\nApt 4"\nJane,"456 Oak Ave"';
			const result = parseCSV(csv);

			expect(isOk(result)).toBe(true);
			if (!isOk(result)) {
				return;
			}

			expect(result.data.valid).toBe(true);
			if (!result.data.valid) {
				return;
			}

			const {metadata} = result.data;
			expect(metadata.rowCount).toBe(3);
			expect(metadata.columnCount).toBe(2);
		});
	});
});
