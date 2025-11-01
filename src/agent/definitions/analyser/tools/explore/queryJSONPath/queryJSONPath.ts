import {JSONPath} from 'jsonpath-plus';

import {JSONPATH_PREFIX, SAFE_PROPERTY_REGEX} from '@sigil/src/agent/definitions/analyser/tools/explore/common';
import type {Result} from '@sigil/src/common/errors';
import {err, ok} from '@sigil/src/common/errors';

import type {QueryJSONPathOptions, QueryJSONPathResult} from './types';

/**
 * Maximum number of matches to return
 */
export const MAX_QUERY_MATCHES = 20;

/**
 * Maximum characters per match preview
 */
export const MAX_MATCH_PREVIEW_CHARS = 300;

/**
 * Normalises JSONPath notation to use dot notation where safe
 *
 * Transforms bracket notation with quoted strings to dot notation for
 * properties with safe names (alphanumeric and underscores). Array indices
 * and properties with special characters remain in bracket notation.
 *
 * @param path - JSONPath string from jsonpath-plus (e.g., $['users'][0]['name'])
 * @returns Normalised path (e.g., $.users[0].name)
 *
 * @example
 * ```typescript
 * normaliseJSONPath("$['users'][0]['name']")
 * // Returns: "$.users[0].name"
 *
 * normaliseJSONPath("$['user-data'][0]['first name']")
 * // Returns: "$['user-data'][0]['first name']" (keeps special chars in brackets)
 * ```
 */
export const normaliseJSONPath = (path: string): string => 
	// Replace ['safeKey'] with .safeKey for valid identifiers
	 path.replace(SAFE_PROPERTY_REGEX, '.$1')
;

/**
 * Queries parsed JSON data with JSONPath expression
 *
 * Returns up to MAX_QUERY_MATCHES results, each with resolved path and
 * stringified value preview truncated to MAX_MATCH_PREVIEW_CHARS.
 *
 * @param data - Parsed data structure to query
 * @param options - Query options with JSONPath expression
 * @returns Result containing matches with paths and previews, or error message
 *
 * @example
 * ```typescript
 * const data = {users: [{name: 'Alice'}, {name: 'Bob'}]};
 * const result = queryJSONPath(data, {path: '$.users[*].name'});
 * // Returns: ok({
 * //   matches: {
 * //     value: [
 * //       {path: '$.users[0].name', preview: '"Alice"'},
 * //       {path: '$.users[1].name', preview: '"Bob"'}
 * //     ],
 * //     exact: true
 * //   },
 * //   metadata: {query: '$.users[*].name', totalMatches: 2}
 * // })
 * ```
 */
export const queryJSONPath = (
	data: unknown,
	options: QueryJSONPathOptions
): Result<QueryJSONPathResult, string> => {
	const {path} = options;

	// Validate path starts with JSONPATH_PREFIX
	if (!path.startsWith(JSONPATH_PREFIX)) {
		return err(`JSONPath expression must start with ${JSONPATH_PREFIX}`);
	}

	// Query data with JSONPath
	try {
		// JSONPath library requires json parameter to be narrower than unknown
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const jsonData: any = data;
		const results = JSONPath({
			path,
			json: jsonData,
			resultType: 'all',
		});

		// resultType: 'all' returns array of {path, value, parent, parentProperty}
		if (!Array.isArray(results)) {
			return err('JSONPath library returned non-array result (expected array with resultType: all)');
		}

		const totalMatches = results.length;

		// Map results to matches with normalised paths and stringified previews
		const matches = results.slice(0, MAX_QUERY_MATCHES).map((result) => {
			const rawPath = result.path;
			const normalisedPath = normaliseJSONPath(rawPath);

			// Stringify value for preview
			let preview = JSON.stringify(result.value);

			// Truncate preview if needed
			if (preview.length > MAX_MATCH_PREVIEW_CHARS) {
				preview = preview.slice(0, MAX_MATCH_PREVIEW_CHARS - 3) + '...';
			}

			return {
				path: normalisedPath,
				preview,
			};
		});

		return ok({
			matches: {
				value: matches,
				exact: totalMatches <= MAX_QUERY_MATCHES,
			},
			metadata: {
				query: path,
				totalMatches,
			},
		});
	} catch (error) {
		// Handle JSONPath library errors (malformed expressions, etc.)
		const message = error instanceof Error ? error.message : 'Unknown error during JSONPath query';
		return err(`JSONPath query failed: ${message}`);
	}
};
