/**
 * Test fixtures for GenerateSigilIR Agent
 */

import type {GenerateSigilIRInput, GenerateSigilIROutput} from './types';

/**
 * Valid input with CSV analysis data
 */
export const VALID_GENERATE_SIGIL_IR_INPUT: GenerateSigilIRInput = {
	analysis: {
		classification: {
			syntactic: 'csv',
			semantic: 'User account data with names, emails, and status flags',
		},
		parseResult: {
			valid: true,
			metadata: {
				size: {
					bytes: 2500,
					characters: 2450,
					lines: 101,
				},
				rowCount: 100,
				columnCount: 3,
				columns: [
					{index: 0, content: {value: 'name', exact: true}},
					{index: 1, content: {value: 'email', exact: true}},
					{index: 2, content: {value: 'status', exact: true}},
				],
			},
		},
		summary: 'Dataset contains user account information with three primary fields: name (full names), email (contact addresses), and status (account states). Data appears clean with consistent formatting. Status values show categorical distribution across active, inactive, and pending states.',
		keyFields: [
			{
				path: '$[*][0]',
				label: 'Name',
				description: 'User full name for identification',
				dataTypes: ['string'],
			},
			{
				path: '$[*][1]',
				label: 'Email',
				description: 'Contact email address',
				dataTypes: ['string'],
			},
			{
				path: '$[*][2]',
				label: 'Status',
				description: 'Account status flag indicating user state',
				dataTypes: ['string'],
			},
		],
		parsedData: [
			['name', 'email', 'status'],
			['Alice Smith', 'alice@example.com', 'active'],
			['Bob Jones', 'bob@example.com', 'pending'],
		],
	},
};

/**
 * Valid ComponentSpec output (without id/created_at)
 */
export const VALID_COMPONENT_SPEC_OUTPUT: GenerateSigilIROutput = {
	title: 'User Accounts',
	description: 'User account data with names, emails, and status flags',
	data_shape: 'tabular',
	root: {
		layout: {
			type: 'stack',
			direction: 'vertical',
			id: 'root-layout',
			spacing: 'normal',
			children: [{type: 'component', component_id: 'table-1'}],
		},
		nodes: {
			'table-1': {
				id: 'table-1',
				type: 'data-table',
				config: {
					type: 'data-table',
					title: 'User Accounts',
					columns: [
						{accessor: '$[*][0]', label: 'Name'},
						{accessor: '$[*][1]', label: 'Email'},
						{accessor: '$[*][2]', label: 'Status'},
					],
					affordances: [],
				},
			},
		},
		accessor_bindings: {
			'table-1': {
				'$[*][0]': {roles: ['label'], data_types: ['string']},
				'$[*][1]': {roles: ['label'], data_types: ['string']},
				'$[*][2]': {roles: ['categorical'], data_types: ['string']},
			},
		},
	},
};

/**
 * Invalid ComponentSpec for testing error handling
 */
export const INVALID_COMPONENT_SPEC: Partial<GenerateSigilIROutput> = {
	title: 'Broken Spec',
	// Missing data_shape
	// Missing root
};
