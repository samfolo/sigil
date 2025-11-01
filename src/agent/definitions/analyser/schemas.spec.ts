import {describe, expect, it} from 'vitest';

import {
	AnalysisOutputSchema,
	FIELD_DATA_TYPES,
	MAX_FIELD_DESCRIPTION_LENGTH,
	MAX_KEY_FIELDS,
	MAX_SEMANTIC_DESCRIPTION_LENGTH,
	MAX_SUMMARY_LENGTH,
	MIN_FIELD_DESCRIPTION_LENGTH,
	MIN_FIELD_LABEL_LENGTH,
	MIN_KEY_FIELDS,
	MIN_SEMANTIC_DESCRIPTION_LENGTH,
	MIN_SUMMARY_LENGTH,
} from './schemas';

describe('AnalysisOutputSchema', () => {
	const SIZE = {bytes: 10, characters: 10, lines: 1};
	const DEPTH = {value: 1, exact: true};
	const CLASSIFICATION = {syntactic: 'json', semantic: 'User data'};
	const PARSE_RESULT = {valid: true, metadata: {structure: 'object', topLevelKeys: [], totalKeyCount: 0, depth: DEPTH, size: SIZE}};
	const SUMMARY = 'A dataset containing user information';
	const KEY_FIELD = {path: '$.name', label: 'Name', description: 'User full name', dataTypes: ['string']};

	it.each([
		// Valid complete analysis
		{
			description: 'valid complete analysis',
			input: {classification: CLASSIFICATION, parseResult: PARSE_RESULT, summary: SUMMARY, keyFields: [KEY_FIELD]},
			valid: true,
		},

		// Classification validation
		{
			description: 'valid syntactic format: csv',
			input: {classification: {syntactic: 'csv', semantic: 'User data'}, parseResult: null, summary: SUMMARY, keyFields: [KEY_FIELD]},
			valid: true,
		},
		{
			description: 'invalid syntactic format',
			input: {classification: {syntactic: 'pdf', semantic: 'User data'}, parseResult: null, summary: SUMMARY, keyFields: [KEY_FIELD]},
			valid: false,
		},
		{
			description: `semantic at min length (${MIN_SEMANTIC_DESCRIPTION_LENGTH})`,
			input: {classification: {syntactic: 'json', semantic: 'a'.repeat(MIN_SEMANTIC_DESCRIPTION_LENGTH)}, parseResult: null, summary: SUMMARY, keyFields: [KEY_FIELD]},
			valid: true,
		},
		{
			description: 'semantic below min length',
			input: {classification: {syntactic: 'json', semantic: 'a'.repeat(MIN_SEMANTIC_DESCRIPTION_LENGTH - 1)}, parseResult: null, summary: SUMMARY, keyFields: [KEY_FIELD]},
			valid: false,
		},
		{
			description: `semantic at max length (${MAX_SEMANTIC_DESCRIPTION_LENGTH})`,
			input: {classification: {syntactic: 'json', semantic: 'a'.repeat(MAX_SEMANTIC_DESCRIPTION_LENGTH)}, parseResult: null, summary: SUMMARY, keyFields: [KEY_FIELD]},
			valid: true,
		},
		{
			description: 'semantic above max length',
			input: {classification: {syntactic: 'json', semantic: 'a'.repeat(MAX_SEMANTIC_DESCRIPTION_LENGTH + 1)}, parseResult: null, summary: SUMMARY, keyFields: [KEY_FIELD]},
			valid: false,
		},

		// ParseResult union
		{
			description: 'parseResult null',
			input: {classification: CLASSIFICATION, parseResult: null, summary: SUMMARY, keyFields: [KEY_FIELD]},
			valid: true,
		},
		{
			description: 'parseResult with CSV metadata',
			input: {
				classification: CLASSIFICATION,
				parseResult: {valid: true, metadata: {structure: 'array', rowCount: 5, columnCount: 3, columns: [], size: SIZE}},
				summary: SUMMARY,
				keyFields: [KEY_FIELD],
			},
			valid: true,
		},

		// Summary validation
		{
			description: `summary at min length (${MIN_SUMMARY_LENGTH})`,
			input: {classification: CLASSIFICATION, parseResult: null, summary: 'a'.repeat(MIN_SUMMARY_LENGTH), keyFields: [KEY_FIELD]},
			valid: true,
		},
		{
			description: 'summary below min length',
			input: {classification: CLASSIFICATION, parseResult: null, summary: 'a'.repeat(MIN_SUMMARY_LENGTH - 1), keyFields: [KEY_FIELD]},
			valid: false,
		},
		{
			description: `summary at max length (${MAX_SUMMARY_LENGTH})`,
			input: {classification: CLASSIFICATION, parseResult: null, summary: 'a'.repeat(MAX_SUMMARY_LENGTH), keyFields: [KEY_FIELD]},
			valid: true,
		},
		{
			description: 'summary above max length',
			input: {classification: CLASSIFICATION, parseResult: null, summary: 'a'.repeat(MAX_SUMMARY_LENGTH + 1), keyFields: [KEY_FIELD]},
			valid: false,
		},

		// KeyFields array bounds
		{
			description: `keyFields at min count (${MIN_KEY_FIELDS})`,
			input: {classification: CLASSIFICATION, parseResult: null, summary: SUMMARY, keyFields: Array(MIN_KEY_FIELDS).fill(KEY_FIELD)},
			valid: true,
		},
		{
			description: 'keyFields below min count',
			input: {classification: CLASSIFICATION, parseResult: null, summary: SUMMARY, keyFields: []},
			valid: false,
		},
		{
			description: `keyFields at max count (${MAX_KEY_FIELDS})`,
			input: {classification: CLASSIFICATION, parseResult: null, summary: SUMMARY, keyFields: Array(MAX_KEY_FIELDS).fill(KEY_FIELD)},
			valid: true,
		},
		{
			description: 'keyFields above max count',
			input: {classification: CLASSIFICATION, parseResult: null, summary: SUMMARY, keyFields: Array(MAX_KEY_FIELDS + 1).fill(KEY_FIELD)},
			valid: false,
		},

		// KeyField validation
		{
			description: `field label at min length (${MIN_FIELD_LABEL_LENGTH})`,
			input: {classification: CLASSIFICATION, parseResult: null, summary: SUMMARY, keyFields: [{...KEY_FIELD, label: 'a'.repeat(MIN_FIELD_LABEL_LENGTH)}]},
			valid: true,
		},
		{
			description: 'field label below min length',
			input: {classification: CLASSIFICATION, parseResult: null, summary: SUMMARY, keyFields: [{...KEY_FIELD, label: 'ab'}]},
			valid: false,
		},
		{
			description: `field description at min length (${MIN_FIELD_DESCRIPTION_LENGTH})`,
			input: {classification: CLASSIFICATION, parseResult: null, summary: SUMMARY, keyFields: [{...KEY_FIELD, description: 'a'.repeat(MIN_FIELD_DESCRIPTION_LENGTH)}]},
			valid: true,
		},
		{
			description: 'field description below min length',
			input: {classification: CLASSIFICATION, parseResult: null, summary: SUMMARY, keyFields: [{...KEY_FIELD, description: 'short'}]},
			valid: false,
		},
		{
			description: `field description at max length (${MAX_FIELD_DESCRIPTION_LENGTH})`,
			input: {classification: CLASSIFICATION, parseResult: null, summary: SUMMARY, keyFields: [{...KEY_FIELD, description: 'a'.repeat(MAX_FIELD_DESCRIPTION_LENGTH)}]},
			valid: true,
		},
		{
			description: 'field description above max length',
			input: {classification: CLASSIFICATION, parseResult: null, summary: SUMMARY, keyFields: [{...KEY_FIELD, description: 'a'.repeat(MAX_FIELD_DESCRIPTION_LENGTH + 1)}]},
			valid: false,
		},
		{
			description: 'field path empty',
			input: {classification: CLASSIFICATION, parseResult: null, summary: SUMMARY, keyFields: [{...KEY_FIELD, path: ''}]},
			valid: false,
		},
		{
			description: 'field dataTypes valid enum values',
			input: {classification: CLASSIFICATION, parseResult: null, summary: SUMMARY, keyFields: [{...KEY_FIELD, dataTypes: [...FIELD_DATA_TYPES]}]},
			valid: true,
		},
		{
			description: 'field dataTypes invalid value',
			input: {classification: CLASSIFICATION, parseResult: null, summary: SUMMARY, keyFields: [{...KEY_FIELD, dataTypes: ['invalid']}]},
			valid: false,
		},
		{
			description: 'field dataTypes empty array',
			input: {classification: CLASSIFICATION, parseResult: null, summary: SUMMARY, keyFields: [{...KEY_FIELD, dataTypes: []}]},
			valid: false,
		},

		// Missing required fields
		{
			description: 'missing classification',
			input: {parseResult: null, summary: SUMMARY, keyFields: [KEY_FIELD]},
			valid: false,
		},
		{
			description: 'missing parseResult',
			input: {classification: CLASSIFICATION, summary: SUMMARY, keyFields: [KEY_FIELD]},
			valid: false,
		},
		{
			description: 'missing summary',
			input: {classification: CLASSIFICATION, parseResult: null, keyFields: [KEY_FIELD]},
			valid: false,
		},
		{
			description: 'missing keyFields',
			input: {classification: CLASSIFICATION, parseResult: null, summary: SUMMARY},
			valid: false,
		},
	])('$description', ({input, valid}) => {
		const result = AnalysisOutputSchema.safeParse(input);
		expect(result.success).toBe(valid);
	});
});
