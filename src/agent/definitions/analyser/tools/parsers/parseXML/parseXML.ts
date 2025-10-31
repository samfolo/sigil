import {XMLParser} from 'fast-xml-parser';

import type {PrecisionValue} from '@sigil/src/agent/definitions/analyser/tools/common';
import {calculateSize} from '@sigil/src/agent/definitions/analyser/tools/common';
import {calculateDepth, MAX_STRUCTURE_PROBING_DEPTH} from '@sigil/src/agent/definitions/analyser/tools/parsers/common';
import type {Result} from '@sigil/src/common/errors';
import {ok} from '@sigil/src/common/errors';

import {ATTRIBUTE_PREFIX, FRAGMENT_SENTINEL} from './constants';
import type {ParseXMLResult, XMLMetadata} from './types';
import {extractTopLevelTags} from './utils/extractTopLevelTags';

/**
 * Parses raw data as XML and extracts metadata
 *
 * Attempts to parse the provided data as XML. On success, analyses the structure
 * and returns metadata including root element, top-level tags, depth, and size.
 * On failure, returns validation error with details.
 *
 * Handles multiple root elements (XML fragments) by using a sentinel value.
 * Preserves document order for child tags. Filters out parser-internal keys
 * like text nodes and attributes from the tag list.
 *
 * Always returns Ok - parsing failures are reported as {valid: false} in the result.
 *
 * @param rawData - Raw string data to parse as XML
 * @returns Result containing parse outcome and metadata (never returns Err)
 *
 * @example
 * ```typescript
 * // Valid XML with single root
 * parseXML('<root><child1/><child2/></root>')
 * // → ok({valid: true, metadata: {rootElement: 'root', topLevelNodeTags: ['child1', 'child2'], ...}})
 *
 * // Multiple roots (fragment)
 * parseXML('<item1/><item2/>')
 * // → ok({valid: true, metadata: {rootElement: '(fragment)', topLevelNodeTags: ['item1', 'item2'], ...}})
 *
 * // Invalid XML syntax
 * parseXML('<invalid>')
 * // → ok({valid: false, error: 'Unclosed tag'})
 * ```
 */
export const parseXML = (rawData: string): Result<ParseXMLResult, string> => {
	// Calculate size from raw input
	const size = calculateSize(rawData);

	// Create XML parser with attribute handling
	const parser = new XMLParser({
		ignoreAttributes: false,
		attributeNamePrefix: ATTRIBUTE_PREFIX,
	});

	// Attempt to parse XML
	let data: unknown;
	try {
		data = parser.parse(rawData);
	} catch (error) {
		const errorMessage =
			error instanceof Error ? error.message : 'Unknown parsing error';
		return ok({valid: false, error: errorMessage});
	}

	// Handle empty result
	if (
		typeof data !== 'object' ||
		data === null ||
		Object.keys(data).length === 0
	) {
		return ok({valid: false, error: 'No XML structure found'});
	}

	// Extract root element and top-level tags
	const keys = Object.keys(data);
	let rootElement: string;
	let topLevelNodeTags: PrecisionValue<string>[];

	if (keys.length > 1) {
		// Multiple roots (fragment)
		rootElement = FRAGMENT_SENTINEL;
		topLevelNodeTags = extractTopLevelTags(data);
	} else {
		// Single root
		rootElement = keys.at(0)!;
		const rootValue = Reflect.get(data, rootElement);
		topLevelNodeTags = extractTopLevelTags(rootValue);
	}

	// Calculate depth
	const depthValue = calculateDepth(data, MAX_STRUCTURE_PROBING_DEPTH);
	const depth: PrecisionValue<number> =
		depthValue > MAX_STRUCTURE_PROBING_DEPTH
			? {value: MAX_STRUCTURE_PROBING_DEPTH, exact: false}
			: {value: depthValue, exact: true};

	// Build metadata
	const metadata: XMLMetadata = {
		rootElement,
		topLevelNodeTags,
		depth,
		size,
	};

	return ok({valid: true, parsedData: data, metadata});
};
