import {distance} from 'fastest-levenshtein';

import {DEFAULT_LEVENSHTEIN_DISTANCE} from '@sigil/renderer/core/constants/constants';

/**
 * Generate a field name similarity suggestion based on Levenshtein distance
 *
 * Searches through candidate field names to find close matches to the actual key
 * using Levenshtein distance. Returns a suggestion string if a match is found
 * within the specified distance threshold.
 *
 * @param actualKey - The key that was not found
 * @param candidates - List of potential field names to compare against
 * @param maxDistance - Maximum Levenshtein distance to consider a match (default: 2)
 * @returns Suggestion string like "Did you mean 'fieldName'?" or undefined if no match
 *
 * @example
 * ```typescript
 * const suggestion = generateFieldNameSimilaritySuggestion(
 *   'itms',
 *   ['items', 'data', 'results']
 * );
 * // Returns: "Did you mean 'items'?"
 * ```
 */
export const generateFieldNameSimilaritySuggestion = (
  actualKey: string,
  candidates: string[],
  maxDistance: number = DEFAULT_LEVENSHTEIN_DISTANCE
): string | undefined => {
  // Deduplicate candidates
  const uniqueCandidates = [...new Set(candidates)];

  // Lowercase once for efficiency
  const lowerActualKey = actualKey.toLowerCase();

  // Find closest match within the distance threshold
  const closest = uniqueCandidates.find(
    candidate => distance(lowerActualKey, candidate.toLowerCase()) <= maxDistance
  );

  return closest ? `Did you mean '${closest}'?` : undefined;
};
