import {useQuery} from '@tanstack/react-query';

import {RunArtifactSchema} from '@sigil/src/common/run/schemas';

/**
 * Fetches a single run by ID from the preview API.
 *
 * @param id - The run ID (format: "YYYYMMDD-HHmmssSSS-xxxx"), or null
 * @returns React Query result containing the run artifact data
 */
export const useRun = (id: string | null) => useQuery({
	queryKey: ['run', id],
	queryFn: async () => {
		if (!id) {
			throw new Error('No run ID provided');
		}

		const response = await fetch(`/api/preview/${id}`);

		if (!response.ok) {
			const error = await response.json();
			throw new Error(error.error || 'Failed to fetch run');
		}

		const data = await response.json();
		return RunArtifactSchema.parse(data);
	},
	enabled: !!id,
});
