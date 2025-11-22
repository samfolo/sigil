import {describe, expect, it} from 'vitest';

import type {ParserState} from '@sigil/src/agent/definitions/analyser/tools/parsers/common';
import type {AgentState} from '@sigil/src/agent/framework/defineAgent';
import {isOk} from '@sigil/src/common/errors';
import type {EmptyObject} from '@sigil/src/common/types';

import {createParseXMLTool} from './parseXML.tool';
import {ParseXMLStructureMetadataDetailsSchema} from './schemas';

const XML_DATA = `<?xml version="1.0" encoding="UTF-8"?>
<person>
  <name>Alice</name>
  <age>30</age>
  <city>London</city>
</person>`;

const XML_LIST_DATA = `<?xml version="1.0" encoding="UTF-8"?>
<users>
  <user>
    <id>1</id>
    <value>first</value>
  </user>
  <user>
    <id>2</id>
    <value>second</value>
  </user>
</users>`;

// Plain text without any XML structure triggers parse error
const INVALID_XML_DATA = 'This is just plain text, not XML at all';

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

describe('PARSE_XML_TOOL', () => {
	const tool = createParseXMLTool<ParserState, EmptyObject>();

	describe('handler', () => {
		it('successfully parses XML object data', () => {
			const state = createState(XML_DATA);

			const result = tool.handler(state, {});

			expect(isOk(result)).toBe(true);
			if (!isOk(result)) {
				return;
			}

			expect(result.data.newState.run.parsedData).toBeDefined();
			const toolResult = ParseXMLStructureMetadataDetailsSchema.parse(result.data.toolResult);
			expect(toolResult.valid).toBe(true);
		});

		it('successfully parses XML list data', () => {
			const state = createState(XML_LIST_DATA);

			const result = tool.handler(state, {});

			expect(isOk(result)).toBe(true);
			if (!isOk(result)) {
				return;
			}

			expect(result.data.newState.run.parsedData).toBeDefined();
			const toolResult = ParseXMLStructureMetadataDetailsSchema.parse(result.data.toolResult);
			expect(toolResult.valid).toBe(true);
		});

		it('preserves existing parsedData when parsing fails', () => {
			const existingParsedData = {person: {name: 'Bob', age: 25}};
			const state = createState(INVALID_XML_DATA, existingParsedData);

			const result = tool.handler(state, {});

			expect(isOk(result)).toBe(true);
			if (!isOk(result)) {
				return;
			}

			// Should preserve the existing parsedData when parse fails
			expect(result.data.newState.run.parsedData).toBe(existingParsedData);
			const toolResult = ParseXMLStructureMetadataDetailsSchema.parse(result.data.toolResult);
			expect(toolResult.valid).toBe(false);
		});

		it('preserves undefined parsedData when parsing fails', () => {
			const state = createState(INVALID_XML_DATA, undefined);

			const result = tool.handler(state, {});

			expect(isOk(result)).toBe(true);
			if (!isOk(result)) {
				return;
			}

			// Should keep parsedData as undefined when it was undefined before
			expect(result.data.newState.run.parsedData).toBeUndefined();
			const toolResult = ParseXMLStructureMetadataDetailsSchema.parse(result.data.toolResult);
			expect(toolResult.valid).toBe(false);
		});

		it('replaces parsedData when new parse succeeds', () => {
			const existingParsedData = {old: 'data'};
			const state = createState(XML_DATA, existingParsedData);

			const result = tool.handler(state, {});

			expect(isOk(result)).toBe(true);
			if (!isOk(result)) {
				return;
			}

			// Should replace with new parsedData when parse succeeds
			expect(result.data.newState.run.parsedData).not.toBe(existingParsedData);
			expect(result.data.newState.run.parsedData).toBeDefined();
			const toolResult = ParseXMLStructureMetadataDetailsSchema.parse(result.data.toolResult);
			expect(toolResult.valid).toBe(true);
		});
	});
});
