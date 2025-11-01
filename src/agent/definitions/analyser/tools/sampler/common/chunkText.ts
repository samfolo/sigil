import type {Result} from '@sigil/src/common/errors/result';
import {err, ok} from '@sigil/src/common/errors/result';

import type {Chunk} from './schemas';

/**
 * Chunks text into overlapping segments for diversity sampling
 *
 * Uses pure character-based chunking to work reliably across all data formats
 * (CSV, JSON, YAML, XML, prose). Chunks provide "vignettes" of the data for
 * the LLM to analyse and identify data types.
 *
 * Character-based approach ensures consistent behaviour regardless of content
 * structure, unlike semantic splitting which can break structured data.
 *
 * Position metadata (start/end) references the original input text before trimming,
 * allowing reconstruction of chunk locations in the source data.
 *
 * @param text - Text to chunk
 * @param chunkSize - Size of each chunk in characters (default: 200)
 * @param overlap - Characters to overlap between chunks (default: 10)
 * @returns Result containing array of chunks with position metadata, or error message
 *
 * @example
 * ```typescript
 * const result = chunkText(csvData, 200, 10);
 * if (isOk(result)) {
 *   for (const chunk of result.data) {
 *     console.log(chunk.content);  // Trimmed text
 *     console.log(chunk.start, chunk.end);  // Position in original
 *   }
 * }
 * ```
 */
export const chunkText = (
	text: string,
	chunkSize = 200,
	overlap = 10
): Result<Chunk[], string> => {
	// Validate parameters
	if (chunkSize <= 0) {
		return err('Chunk size must be greater than 0');
	}

	if (overlap < 0) {
		return err('Overlap must be non-negative');
	}

	if (overlap >= chunkSize) {
		return err('Overlap must be less than chunk size');
	}

	// Calculate trim offset for position tracking
	const leadingWhitespace = text.length - text.trimStart().length;
	const trimmed = text.trim();

	// Handle empty or whitespace-only text
	if (trimmed.length === 0) {
		return ok([]);
	}

	// If text is shorter than chunk size, return as single chunk
	if (trimmed.length <= chunkSize) {
		return ok([
			{
				content: trimmed,
				start: leadingWhitespace,
				end: leadingWhitespace + trimmed.length,
			},
		]);
	}

	// Character-based chunking with overlap
	const chunks: Chunk[] = [];
	const step = chunkSize - overlap;
	let position = 0;

	while (position < trimmed.length) {
		const end = Math.min(position + chunkSize, trimmed.length);
		const content = trimmed.slice(position, end);

		// Only add non-empty chunks
		if (content.length > 0) {
			chunks.push({
				content,
				start: leadingWhitespace + position,
				end: leadingWhitespace + end,
			});
		}

		// Move forward by step size
		position += step;

		// Avoid infinite loop if we're at the end
		if (end === trimmed.length) {
			break;
		}
	}

	return ok(chunks);
};
