import {useQuery} from '@tanstack/react-query';
import {z} from 'zod';

import {RunArtifactSchema} from '@sigil/src/common/run/schemas';

/**
 * Fetches the list of all available runs from the preview API.
 *
 * @returns React Query result containing run artifact array
 */
export const useRunList = () => useQuery({
	queryKey: ['runs'],
	queryFn: async () => {
		const response = await fetch('/api/preview');

		if (!response.ok) {
			const error = await response.json();
			throw new Error(error.error || 'Failed to fetch runs');
		}

		const data = await response.json();
		const parsed = z.object({runs: z.array(RunArtifactSchema)}).parse(data);
		return parsed.runs;
	},
});
