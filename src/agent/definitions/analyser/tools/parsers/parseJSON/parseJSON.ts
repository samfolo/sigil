import {calculateSize} from '@sigil/src/agent/definitions/analyser/tools/common';
import {buildStructuredMetadata, MAX_STRUCTURE_EXTRACTED_ITEMS, MAX_STRUCTURE_PROBING_DEPTH, MAX_STRUCTURE_VALUE_LENGTH} from '@sigil/src/agent/definitions/analyser/tools/parsers/common';
import type {Result} from '@sigil/src/common/errors';
import {ok} from '@sigil/src/common/errors';

import type {ParseJSONResult} from './types';

/**
 * Parses raw data as JSON and extracts metadata
 *
 * Attempts to parse the provided data as JSON. On success, analyses the structure
 * and returns metadata including depth, size, and structure-specific information.
 * On failure, returns validation error with details.
 *
 * Always returns Ok - parsing failures are reported as {valid: false} in the result.
 *
 * @param rawData - Raw string data to parse as JSON
 * @returns Result containing parse outcome and metadata (never returns Err)
 *
 * @example
 * ```typescript
 * // Valid JSON object
 * parseJSON('{"name":"Alice"}')
 * // → ok({valid: true, metadata: {structure: 'object', ...}})
 *
 * // Invalid JSON
 * parseJSON('{invalid}')
 * // → ok({valid: false, error: 'Unexpected token...'})
 * ```
 */
export const parseJSON = (rawData: string): Result<ParseJSONResult, string> => {
	// Calculate size from raw input
	const size = calculateSize(rawData);

	// Attempt to parse JSON
	let data: unknown;
	try {
		data = JSON.parse(rawData);
	} catch (error) {
		const errorMessage =
			error instanceof Error ? error.message : 'Unknown parsing error';
		return ok({valid: false, error: errorMessage});
	}

	// Build metadata based on structure type
	const metadata = buildStructuredMetadata(data, size, {
		maxKeys: MAX_STRUCTURE_EXTRACTED_ITEMS,
		maxKeyLength: MAX_STRUCTURE_VALUE_LENGTH,
		maxDepth: MAX_STRUCTURE_PROBING_DEPTH,
	});

	return ok({valid: true, parsedData: data, metadata});
};
