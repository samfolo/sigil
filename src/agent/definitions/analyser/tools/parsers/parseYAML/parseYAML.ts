import yaml, {JSON_SCHEMA} from 'js-yaml';

import {calculateSize} from '@sigil/src/agent/definitions/analyser/tools/common';
import {buildStructuredMetadata, MAX_STRUCTURE_EXTRACTED_ITEMS, MAX_STRUCTURE_PROBING_DEPTH, MAX_STRUCTURE_VALUE_LENGTH} from '@sigil/src/agent/definitions/analyser/tools/parsers/common';
import type {Result} from '@sigil/src/common/errors';
import {ok} from '@sigil/src/common/errors';

import type {ParseYAMLResult} from './types';

/**
 * Parses raw data as YAML and extracts metadata
 *
 * Attempts to parse the provided data as YAML. On success, analyses the structure
 * and returns metadata including depth, size, and structure-specific information.
 * On failure, returns validation error with details.
 *
 * YAML is a superset of JSON, so valid JSON is also valid YAML. Plain text strings
 * are valid YAML and will parse as string primitives. For multi-document YAML
 * (documents separated by ---), only the first document is analysed. The agent
 * can use context and semantics to disambiguate between formats.
 *
 * Always returns Ok - parsing failures are reported as {valid: false} in the result.
 *
 * @param rawData - Raw string data to parse as YAML
 * @returns Result containing parse outcome and metadata (never returns Err)
 *
 * @example
 * ```typescript
 * // Valid YAML object
 * parseYAML('name: Alice\nage: 30')
 * // → ok({valid: true, metadata: {structure: 'object', ...}})
 *
 * // Valid YAML array
 * parseYAML('- item1\n- item2')
 * // → ok({valid: true, metadata: {structure: 'array', ...}})
 *
 * // Plain text (valid YAML)
 * parseYAML('hello world')
 * // → ok({valid: true, metadata: {structure: 'string', ...}})
 *
 * // Invalid YAML syntax
 * parseYAML('invalid: yaml: syntax:')
 * // → ok({valid: false, error: 'bad indentation...'})
 * ```
 */
export const parseYAML = (rawData: string): Result<ParseYAMLResult, string> => {
	// Calculate size from raw input
	const size = calculateSize(rawData);

	// Attempt to parse YAML with safe schema (prevents code execution)
	let parsed: unknown;
	try {
		parsed = yaml.load(rawData, {schema: JSON_SCHEMA});
	} catch (error) {
		const errorMessage =
			error instanceof Error ? error.message : 'Unknown parsing error';
		return ok({valid: false, error: errorMessage});
	}

	// Handle empty/null/undefined results
	if (parsed === undefined) {
		return ok({valid: false, error: 'No document found'});
	}

	// Build metadata based on structure type
	const metadata = buildStructuredMetadata(parsed, size, {
		maxKeys: MAX_STRUCTURE_EXTRACTED_ITEMS,
		maxKeyLength: MAX_STRUCTURE_VALUE_LENGTH,
		maxDepth: MAX_STRUCTURE_PROBING_DEPTH,
	});

	return ok({valid: true, metadata});
};
