import type {PrecisionValue} from '@sigil/src/agent/definitions/analyser/tools/common';
import {truncateString} from '@sigil/src/agent/definitions/analyser/tools/common';

import {MAX_STRUCTURE_EXTRACTED_ITEMS, MAX_STRUCTURE_VALUE_LENGTH} from '../../common';

import {ATTRIBUTE_PREFIX, TEXT_NODE_KEY} from '../types';

/**
 * Extracts and processes top-level XML node tags from parsed XML structure
 *
 * Filters out special parser keys (text nodes and attributes), preserves document order,
 * and caps at maximum item count with truncated tag names for performance.
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
		.slice(0, MAX_STRUCTURE_EXTRACTED_ITEMS)
		.map((key) => truncateString(key, MAX_STRUCTURE_VALUE_LENGTH));
};
