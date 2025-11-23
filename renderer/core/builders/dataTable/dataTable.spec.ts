/**
 * Tests for DataTableBuilder
 *
 * Verifies that DataTableBuilder correctly transforms DataTableConfig and data
 * into TableProps, reusing existing binding utilities.
 */

import {describe, it, expect} from 'vitest';

import {ERROR_CODES} from '@sigil/src/common/errors';
import {isErr, isOk} from '@sigil/src/common/errors/result';
import type {DataTableConfig, FieldMetadata} from '@sigil/src/lib/generated/types/specification';

import {JSONPATH_ROOT} from '../../constants';

import {DataTableBuilder} from './dataTable';

const INITIAL_PATH_CONTEXT = [JSONPATH_ROOT];

describe('DataTableBuilder', () => {
	const builder = new DataTableBuilder();

	describe('successful TableProps generation', () => {
		it('builds TableProps with valid config and data', () => {
			const config: DataTableConfig = {
				type: 'data-table',
				title: 'Users',
				description: 'List of users',
				columns: [
					{accessor: '$[*].name', label: 'Name'},
					{accessor: '$[*].age', label: 'Age', alignment: 'right'},
				],
				affordances: [],
			};

			const bindings: Record<string, FieldMetadata> = {
				'$[*].name': {
					roles: ['label'],
					data_types: ['string'],
				},
				'$[*].age': {
					roles: ['value'],
					data_types: ['number'],
				},
			};

			const data = [
				{name: 'Alice', age: 30},
				{name: 'Bob', age: 25},
			];

			const result = builder.build(config, data, bindings, INITIAL_PATH_CONTEXT);

			expect(isOk(result)).toBe(true);
			if (!isOk(result)) {
				return;
			}

			expect(result.data.title).toBe('Users');
			expect(result.data.description).toBe('List of users');
			expect(result.data.columns).toHaveLength(2);
			expect(result.data.data).toHaveLength(2);

			// Verify column structure
			expect(result.data.columns.at(0)).toEqual({
				id: '$[*].name',
				label: 'Name',
				dataType: 'string',
				alignment: undefined,
			});

			expect(result.data.columns.at(1)).toEqual({
				id: '$[*].age',
				label: 'Age',
				dataType: 'number',
				alignment: 'right',
			});

			// Verify row structure
			expect(result.data.data.at(0)).toEqual({
				id: 'row-0',
				cells: {
					'$[*].name': {
						raw: 'Alice',
						display: 'Alice',
						dataType: 'string',
						format: undefined,
					},
					'$[*].age': {
						raw: 30,
						display: '30',
						dataType: 'number',
						format: undefined,
					},
				},
			});
		});

		it('builds TableProps without title and description', () => {
			const config: DataTableConfig = {
				type: 'data-table',
				columns: [{accessor: '$[*].name', label: 'Name'}],
				affordances: [],
			};

			const bindings: Record<string, FieldMetadata> = {
				'$[*].name': {
					roles: ['label'],
					data_types: ['string'],
				},
			};

			const data = [{name: 'Alice'}];

			const result = builder.build(config, data, bindings, INITIAL_PATH_CONTEXT);

			expect(isOk(result)).toBe(true);
			if (!isOk(result)) {
				return;
			}

			expect(result.data.title).toBeUndefined();
			expect(result.data.description).toBeUndefined();
		});

		it('handles empty data array', () => {
			const config: DataTableConfig = {
				type: 'data-table',
				title: 'Empty Table',
				columns: [
					{accessor: '$[*].name', label: 'Name'},
					{accessor: '$[*].value', label: 'Value', alignment: 'right'},
				],
				affordances: [],
			};

			const bindings: Record<string, FieldMetadata> = {
				'$[*].name': {
					roles: ['label'],
					data_types: ['string'],
				},
				'$[*].value': {
					roles: ['value'],
					data_types: ['number'],
				},
			};

			const data: unknown[] = [];

			const result = builder.build(config, data, bindings, INITIAL_PATH_CONTEXT);

			expect(isOk(result)).toBe(true);
			if (!isOk(result)) {
				return;
			}

			expect(result.data.columns).toHaveLength(2);
			expect(result.data.data).toHaveLength(0);
		});
	});

	describe('column extraction and enrichment', () => {
		it('extracts columns from DataTableConfig', () => {
			const config: DataTableConfig = {
				type: 'data-table',
				columns: [
					{accessor: '$[*].id', label: 'ID', alignment: 'right'},
					{accessor: '$[*].name', label: 'Name'},
					{accessor: '$[*].email', label: 'Email'},
				],
				affordances: [],
			};

			const bindings: Record<string, FieldMetadata> = {
				'$[*].id': {roles: ['identifier'], data_types: ['number']},
				'$[*].name': {roles: ['label'], data_types: ['string']},
				'$[*].email': {roles: ['label'], data_types: ['string']},
			};

			const data = [{id: 1, name: 'Alice', email: 'alice@example.com'}];

			const result = builder.build(config, data, bindings, INITIAL_PATH_CONTEXT);

			expect(isOk(result)).toBe(true);
			if (!isOk(result)) {
				return;
			}

			expect(result.data.columns).toHaveLength(3);
			expect(result.data.columns.at(0)?.id).toBe('$[*].id');
			expect(result.data.columns.at(1)?.id).toBe('$[*].name');
			expect(result.data.columns.at(2)?.id).toBe('$[*].email');
		});

		it('enriches columns with data types from bindings', () => {
			const config: DataTableConfig = {
				type: 'data-table',
				columns: [
					{accessor: '$[*].count', label: 'Count'},
					{accessor: '$[*].active', label: 'Active'},
				],
				affordances: [],
			};

			const bindings: Record<string, FieldMetadata> = {
				'$[*].count': {roles: ['value'], data_types: ['number']},
				'$[*].active': {roles: ['value'], data_types: ['boolean']},
			};

			const data = [{count: 42, active: true}];

			const result = builder.build(config, data, bindings, INITIAL_PATH_CONTEXT);

			expect(isOk(result)).toBe(true);
			if (!isOk(result)) {
				return;
			}

			expect(result.data.columns.at(0)?.dataType).toBe('number');
			expect(result.data.columns.at(1)?.dataType).toBe('boolean');
		});

		it('uses unknown dataType when binding metadata missing', () => {
			const config: DataTableConfig = {
				type: 'data-table',
				columns: [{accessor: '$[*].mystery', label: 'Mystery'}],
				affordances: [],
			};

			const bindings: Record<string, FieldMetadata> = {};

			const data = [{mystery: 'value'}];

			const result = builder.build(config, data, bindings, INITIAL_PATH_CONTEXT);

			expect(isOk(result)).toBe(true);
			if (!isOk(result)) {
				return;
			}

			expect(result.data.columns.at(0)?.dataType).toBe('unknown');
		});
	});

	describe('array-of-objects data binding', () => {
		it('binds array-of-objects data correctly', () => {
			const config: DataTableConfig = {
				type: 'data-table',
				columns: [
					{accessor: '$[*].name', label: 'Name'},
					{accessor: '$[*].email', label: 'Email'},
				],
				affordances: [],
			};

			const bindings: Record<string, FieldMetadata> = {
				'$[*].name': {roles: ['label'], data_types: ['string']},
				'$[*].email': {roles: ['label'], data_types: ['string']},
			};

			const data = [
				{name: 'Alice', email: 'alice@example.com'},
				{name: 'Bob', email: 'bob@example.com'},
			];

			const result = builder.build(config, data, bindings, INITIAL_PATH_CONTEXT);

			expect(isOk(result)).toBe(true);
			if (!isOk(result)) {
				return;
			}

			expect(result.data.data.at(0)?.cells['$[*].name'].raw).toBe('Alice');
			expect(result.data.data.at(1)?.cells['$[*].name'].raw).toBe('Bob');
		});

		it('binds nested object properties', () => {
			const config: DataTableConfig = {
				type: 'data-table',
				columns: [{accessor: '$[*].company.department.name', label: 'Department'}],
				affordances: [],
			};

			const bindings: Record<string, FieldMetadata> = {
				'$[*].company.department.name': {roles: ['label'], data_types: ['string']},
			};

			const data = [
				{company: {department: {name: 'Engineering'}}},
				{company: {department: {name: 'Sales'}}},
			];

			const result = builder.build(config, data, bindings, INITIAL_PATH_CONTEXT);

			expect(isOk(result)).toBe(true);
			if (!isOk(result)) {
				return;
			}

			expect(result.data.data.at(0)?.cells['$[*].company.department.name'].raw).toBe('Engineering');
			expect(result.data.data.at(1)?.cells['$[*].company.department.name'].raw).toBe('Sales');
		});
	});

	describe('array-of-arrays data binding (CSV)', () => {
		it('binds CSV-style data with wildcard accessors', () => {
			const config: DataTableConfig = {
				type: 'data-table',
				columns: [
					{accessor: '$[*][0]', label: 'Name'},
					{accessor: '$[*][1]', label: 'Age'},
				],
				affordances: [],
			};

			const bindings: Record<string, FieldMetadata> = {
				'$[*][0]': {roles: ['label'], data_types: ['string']},
				'$[*][1]': {roles: ['value'], data_types: ['number']},
			};

			const data = [
				['Name', 'Age'], // Header row
				['Alice', 30],
				['Bob', 25],
			];

			const result = builder.build(config, data, bindings, INITIAL_PATH_CONTEXT);

			expect(isOk(result)).toBe(true);
			if (!isOk(result)) {
				return;
			}

			// Should have 2 data rows (header row skipped)
			expect(result.data.data).toHaveLength(2);
			expect(result.data.data.at(0)?.cells['$[*][0]'].raw).toBe('Alice');
			expect(result.data.data.at(0)?.cells['$[*][1]'].raw).toBe(30);
			expect(result.data.data.at(1)?.cells['$[*][0]'].raw).toBe('Bob');
			expect(result.data.data.at(1)?.cells['$[*][1]'].raw).toBe(25);
		});
	});

	describe('error handling', () => {
		it('returns error for invalid accessor syntax', () => {
			const config: DataTableConfig = {
				type: 'data-table',
				columns: [{accessor: 'badAccessor', label: 'Bad'}],
				affordances: [],
			};

			const bindings: Record<string, FieldMetadata> = {
				badAccessor: {roles: ['label'], data_types: ['string']},
			};

			const data = [{name: 'Alice'}, {name: 'Bob'}];

			const result = builder.build(config, data, bindings, INITIAL_PATH_CONTEXT);

			expect(isErr(result)).toBe(true);
			if (!isErr(result)) {
				return;
			}

			expect(result.error).toHaveLength(1); // One error for invalid accessor (detected before row iteration)
			expect(result.error.at(0)?.category).toBe('spec'); // Spec error because accessor syntax is invalid
			expect(result.error.at(0)?.code).toBe(ERROR_CODES.INVALID_ACCESSOR);
		});

		it('returns error when data is not an array', () => {
			const config: DataTableConfig = {
				type: 'data-table',
				columns: [{accessor: '$[*].name', label: 'Name'}],
				affordances: [],
			};

			const bindings: Record<string, FieldMetadata> = {
				'$[*].name': {roles: ['label'], data_types: ['string']},
			};

			const data = {name: 'Not an array'};

			const result = builder.build(config, data, bindings, INITIAL_PATH_CONTEXT);

			expect(isErr(result)).toBe(true);
			if (!isErr(result)) {
				return;
			}

			expect(result.error).toHaveLength(1);
			expect(result.error.at(0)?.code).toBe(ERROR_CODES.QUERY_ERROR);
			expect(result.error.at(0)?.category).toBe('data'); // Data error from attempting to query primitive value
		});

		it('includes path context in error messages', () => {
			const config: DataTableConfig = {
				type: 'data-table',
				columns: [{accessor: 'invalid', label: 'Invalid'}],
				affordances: [],
			};

			const bindings: Record<string, FieldMetadata> = {
				invalid: {roles: ['label'], data_types: ['string']},
			};

			const data = [{value: 'test'}];

			const result = builder.build(config, data, bindings, INITIAL_PATH_CONTEXT);

			expect(isErr(result)).toBe(true);
			if (!isErr(result)) {
				return;
			}

			expect(result.error.at(0)?.path).toBe(JSONPATH_ROOT); // Error detected before row iteration
		});
	});

	describe('value mapping', () => {
		it('applies value mappings to display values', () => {
			const config: DataTableConfig = {
				type: 'data-table',
				columns: [{accessor: '$[*].status', label: 'Status'}],
				affordances: [],
			};

			const bindings: Record<string, FieldMetadata> = {
				'$[*].status': {
					roles: ['label'],
					data_types: ['string'],
					value_mappings: {
						active: {display_value: 'Active'},
						inactive: {display_value: 'Inactive'},
					},
				},
			};

			const data = [{status: 'active'}, {status: 'inactive'}];

			const result = builder.build(config, data, bindings, INITIAL_PATH_CONTEXT);

			expect(isOk(result)).toBe(true);
			if (!isOk(result)) {
				return;
			}

			expect(result.data.data.at(0)?.cells['$[*].status'].raw).toBe('active');
			expect(result.data.data.at(0)?.cells['$[*].status'].display).toBe('Active');
			expect(result.data.data.at(1)?.cells['$[*].status'].raw).toBe('inactive');
			expect(result.data.data.at(1)?.cells['$[*].status'].display).toBe('Inactive');
		});

		it('uses raw value when no mapping defined', () => {
			const config: DataTableConfig = {
				type: 'data-table',
				columns: [{accessor: '$[*].name', label: 'Name'}],
				affordances: [],
			};

			const bindings: Record<string, FieldMetadata> = {
				'$[*].name': {
					roles: ['label'],
					data_types: ['string'],
				},
			};

			const data = [{name: 'Alice'}];

			const result = builder.build(config, data, bindings, INITIAL_PATH_CONTEXT);

			expect(isOk(result)).toBe(true);
			if (!isOk(result)) {
				return;
			}

			expect(result.data.data.at(0)?.cells['$[*].name'].display).toBe('Alice');
		});
	});

	describe('edge cases', () => {
		it('handles null and undefined values', () => {
			const config: DataTableConfig = {
				type: 'data-table',
				columns: [
					{accessor: '$[*].nullValue', label: 'Null'},
					{accessor: '$[*].undefinedValue', label: 'Undefined'},
				],
				affordances: [],
			};

			const bindings: Record<string, FieldMetadata> = {
				'$[*].nullValue': {roles: ['value'], data_types: ['string']},
				'$[*].undefinedValue': {roles: ['value'], data_types: ['string']},
			};

			const data = [{nullValue: null, undefinedValue: undefined}];

			const result = builder.build(config, data, bindings, INITIAL_PATH_CONTEXT);

			expect(isOk(result)).toBe(true);
			if (!isOk(result)) {
				return;
			}

			expect(result.data.data.at(0)?.cells['$[*].nullValue'].display).toBe('');
			expect(result.data.data.at(0)?.cells['$[*].undefinedValue'].display).toBe('');
		});

		it('handles single row of data', () => {
			const config: DataTableConfig = {
				type: 'data-table',
				columns: [{accessor: '$[*].name', label: 'Name'}],
				affordances: [],
			};

			const bindings: Record<string, FieldMetadata> = {
				'$[*].name': {roles: ['label'], data_types: ['string']},
			};

			const data = [{name: 'Solo'}];

			const result = builder.build(config, data, bindings, INITIAL_PATH_CONTEXT);

			expect(isOk(result)).toBe(true);
			if (!isOk(result)) {
				return;
			}

			expect(result.data.data).toHaveLength(1);
			expect(result.data.data.at(0)?.cells['$[*].name'].raw).toBe('Solo');
		});
	});
});
