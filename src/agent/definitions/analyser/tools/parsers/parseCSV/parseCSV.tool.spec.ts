import {describe, expect, it} from 'vitest';

import type {ParserState} from '@sigil/src/agent/definitions/analyser/tools/parsers/common';
import type {AgentState} from '@sigil/src/agent/framework/defineAgent';
import {isOk} from '@sigil/src/common/errors';
import type {EmptyObject} from '@sigil/src/common/types';

import {createParseCSVTool} from './parseCSV.tool';
import {ParseCSVStructureMetadataDetailsSchema} from './schemas';

const CSV_DATA = `name,age,city
Alice,30,London
Bob,25,Manchester`;

const TSV_DATA = `name\tage\tcity
Alice\t30\tLondon
Bob\t25\tManchester`;

// Empty string triggers "No data rows found after parsing" error
const INVALID_CSV_DATA = '';

const createState = (rawData: string, parsedData?: unknown): AgentState<ParserState, EmptyObject> => ({
	context: {
		attempt: 1,
		maxAttempts: 3,
		iteration: 1,
		maxIterations: 10,
	},
	run: {
		rawData,
		parsedData,
	},
	attempt: {},
});

describe('PARSE_CSV_TOOL', () => {
	const tool = createParseCSVTool<ParserState, EmptyObject>();

	describe('handler', () => {
		it('successfully parses CSV data with default delimiter', () => {
			const state = createState(CSV_DATA);

			const result = tool.handler(state, {});

			expect(isOk(result)).toBe(true);
			if (!isOk(result)) {
				return;
			}

			expect(result.data.newState.run.parsedData).toBeDefined();
			const toolResult = ParseCSVStructureMetadataDetailsSchema.parse(result.data.toolResult);
			expect(toolResult.valid).toBe(true);
		});

		it('successfully parses TSV data with tab delimiter', () => {
			const state = createState(TSV_DATA);

			const result = tool.handler(state, {delimiter: '\t'});

			expect(isOk(result)).toBe(true);
			if (!isOk(result)) {
				return;
			}

			expect(result.data.newState.run.parsedData).toBeDefined();
			const toolResult = ParseCSVStructureMetadataDetailsSchema.parse(result.data.toolResult);
			expect(toolResult.valid).toBe(true);
		});

		it('preserves existing parsedData when parsing fails', () => {
			const existingParsedData = [
				['name', 'age', 'city'],
				['Alice', '30', 'London'],
			];
			const state = createState(INVALID_CSV_DATA, existingParsedData);

			const result = tool.handler(state, {});

			expect(isOk(result)).toBe(true);
			if (!isOk(result)) {
				return;
			}

			// Should preserve the existing parsedData when parse fails
			expect(result.data.newState.run.parsedData).toBe(existingParsedData);
			const toolResult = ParseCSVStructureMetadataDetailsSchema.parse(result.data.toolResult);
			expect(toolResult.valid).toBe(false);
		});

		it('preserves undefined parsedData when parsing fails', () => {
			const state = createState(INVALID_CSV_DATA, undefined);

			const result = tool.handler(state, {});

			expect(isOk(result)).toBe(true);
			if (!isOk(result)) {
				return;
			}

			// Should keep parsedData as undefined when it was undefined before
			expect(result.data.newState.run.parsedData).toBeUndefined();
			const toolResult = ParseCSVStructureMetadataDetailsSchema.parse(result.data.toolResult);
			expect(toolResult.valid).toBe(false);
		});

		it('replaces parsedData when new parse succeeds', () => {
			const existingParsedData = [['old', 'data']];
			const state = createState(CSV_DATA, existingParsedData);

			const result = tool.handler(state, {});

			expect(isOk(result)).toBe(true);
			if (!isOk(result)) {
				return;
			}

			// Should replace with new parsedData when parse succeeds
			expect(result.data.newState.run.parsedData).not.toBe(existingParsedData);
			expect(result.data.newState.run.parsedData).toBeDefined();
			const toolResult = ParseCSVStructureMetadataDetailsSchema.parse(result.data.toolResult);
			expect(toolResult.valid).toBe(true);
		});
	});
});
