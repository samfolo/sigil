import type {PrecisionValue, SizeMetrics} from '@sigil/src/agent/definitions/analyser/tools/common';
import {truncateString} from '@sigil/src/agent/definitions/analyser/tools/common';

import {calculateDepth} from './calculateDepth';
import {MAX_STRUCTURE_EXTRACTED_ITEMS, MAX_STRUCTURE_PROBING_DEPTH, MAX_STRUCTURE_VALUE_LENGTH} from './constants';
import type {StructureMetadata} from './schemas';

/**
 * Options for configuring metadata extraction
 */
export interface BuildStructuredMetadataOptions {
	/**
	 * Maximum number of keys to extract from objects
	 * @default MAX_STRUCTURE_EXTRACTED_ITEMS
	 */
	maxKeys?: number;
	/**
	 * Maximum length for extracted keys (truncated with ellipsis)
	 * @default MAX_STRUCTURE_VALUE_LENGTH
	 */
	maxKeyLength?: number;
	/**
	 * Maximum depth to probe structured data
	 * @default MAX_STRUCTURE_PROBING_DEPTH
	 */
	maxDepth?: number;
}

/**
 * Builds structured metadata from parsed data (JSON, YAML, etc.)
 *
 * Analyses the structure and returns metadata including depth, size,
 * and structure-specific information (keys for objects, element count for arrays).
 *
 * @param parsed - Parsed data value to analyse
 * @param size - Size metrics for the raw input string
 * @param options - Configuration options for metadata extraction
 * @returns Metadata describing the structure
 *
 * @example
 * ```typescript
 * const parsed = {name: 'Alice', age: 30};
 * const size = {bytes: 25, characters: 25, lines: 1};
 * const metadata = buildStructuredMetadata(parsed, size);
 * // → {structure: 'object', topLevelKeys: [...], totalKeyCount: 2, ...}
 * ```
 */
export const buildStructuredMetadata = (
	parsed: unknown,
	size: SizeMetrics,
	options?: BuildStructuredMetadataOptions
): StructureMetadata => {
	const maxKeys = options?.maxKeys ?? MAX_STRUCTURE_EXTRACTED_ITEMS;
	const maxKeyLength = options?.maxKeyLength ?? MAX_STRUCTURE_VALUE_LENGTH;
	const maxDepth = options?.maxDepth ?? MAX_STRUCTURE_PROBING_DEPTH;

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
		const depthValue = calculateDepth(parsed, maxDepth);
		const depth = buildStructureDepth(depthValue, maxDepth);

		return {
			structure: 'array',
			elementCount: parsed.length,
			depth,
			size,
		};
	}

	// Handle objects
	// At this point, must be an object (JSON/YAML parsing only returns primitives, arrays, or objects)
	if (typeof parsed !== 'object' || parsed === null) {
		throw new Error('Unexpected parsed value type');
	}

	const allKeys = Object.keys(parsed);
	const sortedKeys = allKeys.toSorted();
	const topKeys = sortedKeys.slice(0, maxKeys);
	const topLevelKeys = topKeys.map((key) => truncateString(key, maxKeyLength));

	const depthValue = calculateDepth(parsed, maxDepth);
	const depth = buildStructureDepth(depthValue, maxDepth);

	return {
		structure: 'object',
		topLevelKeys,
		totalKeyCount: allKeys.length,
		depth,
		size,
	};
};

/**
 * Builds depth information from calculated depth value
 *
 * Determines if depth is exact based on whether it exceeds maxDepth.
 * When depth exceeds the cap, exact is set to false.
 */
const buildStructureDepth = (
	depthValue: number,
	maxDepth: number
): PrecisionValue<number> => {
	if (depthValue > maxDepth) {
		return {
			value: maxDepth,
			exact: false,
		};
	}

	return {
		value: depthValue,
		exact: true,
	};
};
