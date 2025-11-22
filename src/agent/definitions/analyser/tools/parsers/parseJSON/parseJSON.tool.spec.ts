import {describe, expect, it} from 'vitest';

import type {ParserState} from '@sigil/src/agent/definitions/analyser/tools/parsers/common';
import type {AgentState} from '@sigil/src/agent/framework/defineAgent';
import {isOk} from '@sigil/src/common/errors';
import type {EmptyObject} from '@sigil/src/common/types';

import {createParseJSONTool} from './parseJSON.tool';
import {ParseJSONStructureMetadataDetailsSchema} from './schemas';

const JSON_DATA = `{
  "name": "Alice",
  "age": 30,
  "city": "London"
}`;

const JSON_ARRAY_DATA = `[
  {"id": 1, "value": "first"},
  {"id": 2, "value": "second"}
]`;

// Empty string triggers parse error
const INVALID_JSON_DATA = '';

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

describe('PARSE_JSON_TOOL', () => {
	const tool = createParseJSONTool<ParserState, EmptyObject>();

	describe('handler', () => {
		it('successfully parses JSON object data', () => {
			const state = createState(JSON_DATA);

			const result = tool.handler(state, {});

			expect(isOk(result)).toBe(true);
			if (!isOk(result)) {
				return;
			}

			expect(result.data.newState.run.parsedData).toBeDefined();
			const toolResult = ParseJSONStructureMetadataDetailsSchema.parse(result.data.toolResult);
			expect(toolResult.valid).toBe(true);
		});

		it('successfully parses JSON array data', () => {
			const state = createState(JSON_ARRAY_DATA);

			const result = tool.handler(state, {});

			expect(isOk(result)).toBe(true);
			if (!isOk(result)) {
				return;
			}

			expect(result.data.newState.run.parsedData).toBeDefined();
			const toolResult = ParseJSONStructureMetadataDetailsSchema.parse(result.data.toolResult);
			expect(toolResult.valid).toBe(true);
		});

		it('preserves existing parsedData when parsing fails', () => {
			const existingParsedData = {name: 'Bob', age: 25};
			const state = createState(INVALID_JSON_DATA, existingParsedData);

			const result = tool.handler(state, {});

			expect(isOk(result)).toBe(true);
			if (!isOk(result)) {
				return;
			}

			// Should preserve the existing parsedData when parse fails
			expect(result.data.newState.run.parsedData).toBe(existingParsedData);
			const toolResult = ParseJSONStructureMetadataDetailsSchema.parse(result.data.toolResult);
			expect(toolResult.valid).toBe(false);
		});

		it('preserves undefined parsedData when parsing fails', () => {
			const state = createState(INVALID_JSON_DATA, undefined);

			const result = tool.handler(state, {});

			expect(isOk(result)).toBe(true);
			if (!isOk(result)) {
				return;
			}

			// Should keep parsedData as undefined when it was undefined before
			expect(result.data.newState.run.parsedData).toBeUndefined();
			const toolResult = ParseJSONStructureMetadataDetailsSchema.parse(result.data.toolResult);
			expect(toolResult.valid).toBe(false);
		});

		it('replaces parsedData when new parse succeeds', () => {
			const existingParsedData = {old: 'data'};
			const state = createState(JSON_DATA, existingParsedData);

			const result = tool.handler(state, {});

			expect(isOk(result)).toBe(true);
			if (!isOk(result)) {
				return;
			}

			// Should replace with new parsedData when parse succeeds
			expect(result.data.newState.run.parsedData).not.toBe(existingParsedData);
			expect(result.data.newState.run.parsedData).toBeDefined();
			const toolResult = ParseJSONStructureMetadataDetailsSchema.parse(result.data.toolResult);
			expect(toolResult.valid).toBe(true);
		});
	});
});
