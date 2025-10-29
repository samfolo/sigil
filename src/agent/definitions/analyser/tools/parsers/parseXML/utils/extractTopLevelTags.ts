import type {PrecisionValue} from '@sigil/src/agent/definitions/analyser/tools/common';
import {truncateString} from '@sigil/src/agent/definitions/analyser/tools/common';

import {ATTRIBUTE_PREFIX, MAX_TAG_NAME_LENGTH, MAX_TOP_LEVEL_TAGS, TEXT_NODE_KEY} from '../types';

/**
 * Extracts and processes top-level XML node tags from parsed XML structure
 *
 * Filters out special parser keys (text nodes and attributes), preserves document order,
 * caps at MAX_TOP_LEVEL_TAGS, and truncates long tag names.
 *
 * @param value - Parsed XML structure (object, array, or primitive)
 * @returns Array of tag names with precision metadata, empty for non-objects
 */
export const extractTopLevelTags = (value: unknown): PrecisionValue<string>[] => {
	// Primitives and arrays have no tags to extract
	if (typeof value !== 'object' || value === null || Array.isArray(value)) {
		return [];
	}

	return Object.keys(value)
		.filter((key) => key !== TEXT_NODE_KEY && !key.startsWith(ATTRIBUTE_PREFIX))
		.slice(0, MAX_TOP_LEVEL_TAGS)
		.map((key) => truncateString(key, MAX_TAG_NAME_LENGTH));
};
