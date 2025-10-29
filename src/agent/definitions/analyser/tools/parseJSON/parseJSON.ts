import type {SizeMetrics} from '@sigil/src/agent/definitions/analyser/tools/common';
import {calculateSize, truncateString} from '@sigil/src/agent/definitions/analyser/tools/common';
import type {Result} from '@sigil/src/common/errors';
import {ok} from '@sigil/src/common/errors';

import type {JSONMetadata, ParseJSONResult, JSONDepth} from './types';
import {MAX_JSON_DEPTH} from './types';
import {calculateDepth} from './utils/calculateDepth';

const MAX_KEYS_TO_RETURN = 50;
const MAX_KEY_LENGTH = 100;

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
	let parsed: unknown;
	try {
		parsed = JSON.parse(rawData);
	} catch (error) {
		const errorMessage =
			error instanceof Error ? error.message : 'Unknown parsing error';
		return ok({valid: false, error: errorMessage});
	}

	// Build metadata based on structure type
	const metadata = buildMetadata(parsed, size);

	return ok({valid: true, metadata});
};

/**
 * Builds appropriate metadata based on the parsed value's structure
 */
const buildMetadata = (parsed: unknown, size: SizeMetrics): JSONMetadata => {
	// Handle null explicitly
	if (parsed === null) {
		return {structure: 'null', size};
	}

	// Handle primitives
	if (typeof parsed === 'string') {
		return {structure: 'string', size};
	}
	if (typeof parsed === 'number') {
		return {structure: 'number', size};
	}
	if (typeof parsed === 'boolean') {
		return {structure: 'boolean', size};
	}

	// Handle arrays
	if (Array.isArray(parsed)) {
		const depthValue = calculateDepth(parsed);
		const depth = buildJSONDepth(depthValue);

		return {
			structure: 'array',
			elementCount: parsed.length,
			depth,
			size,
		};
	}

	// Handle objects
	const allKeys = Object.keys(parsed);
	const sortedKeys = allKeys.toSorted();
	const topKeys = sortedKeys.slice(0, MAX_KEYS_TO_RETURN);
	const topLevelKeys = topKeys.map((key) => truncateString(key, MAX_KEY_LENGTH));

	const depthValue = calculateDepth(parsed);
	const depth = buildJSONDepth(depthValue);

	return {
		structure: 'object',
		topLevelKeys,
		totalKeyCount: allKeys.length,
		depth,
		size,
	};
};

/**
 * Builds JSONDepth information from calculated depth value
 *
 * Determines if depth is exact based on whether it exceeds MAX_JSON_DEPTH.
 * When depth exceeds the cap, exact is set to false.
 */
const buildJSONDepth = (depthValue: number): JSONDepth => {
	if (depthValue > MAX_JSON_DEPTH) {
		return {
			value: MAX_JSON_DEPTH,
			exact: false,
		};
	}

	return {
		value: depthValue,
		exact: true,
	};
};
