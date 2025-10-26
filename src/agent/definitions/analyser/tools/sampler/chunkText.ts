import type {Result} from '@sigil/src/common/errors/result';
import {err, ok} from '@sigil/src/common/errors/result';

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
 * @param text - Text to chunk
 * @param chunkSize - Size of each chunk in characters (default: 200)
 * @param overlap - Characters to overlap between chunks (default: 10)
 * @returns Result containing array of text chunks, or error message
 *
 * @example
 * ```typescript
 * const result = chunkText(csvData, 200, 10);
 * if (isOk(result)) {
 *   // result.data contains chunks suitable for embedding
 * }
 * ```
 */
export const chunkText = (
	text: string,
	chunkSize = 200,
	overlap = 10
): Result<string[], string> => {
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

	// Handle empty or whitespace-only text
	const trimmed = text.trim();
	if (trimmed.length === 0) {
		return ok([]);
	}

	// If text is shorter than chunk size, return as single chunk
	if (trimmed.length <= chunkSize) {
		return ok([trimmed]);
	}

	// Character-based chunking with overlap
	const chunks: string[] = [];
	const step = chunkSize - overlap;
	let position = 0;

	while (position < trimmed.length) {
		const end = Math.min(position + chunkSize, trimmed.length);
		const chunk = trimmed.slice(position, end);

		// Only add non-empty chunks
		if (chunk.length > 0) {
			chunks.push(chunk);
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
