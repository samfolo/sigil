import {useQuery} from '@tanstack/react-query';
import {z} from 'zod';

import {FixtureMetadataSchema} from '@sigil/src/common/fixtures/schemas';

/**
 * Fetches the list of all available fixtures from the preview API.
 *
 * @returns React Query result containing fixture metadata array
 */
export const useFixtureList = () => useQuery({
	queryKey: ['fixtures'],
	queryFn: async () => {
		const response = await fetch('/api/preview');

		if (!response.ok) {
			const error = await response.json();
			throw new Error(error.error || 'Failed to fetch fixtures');
		}

		const data = await response.json();
		const parsed = z.object({fixtures: z.array(FixtureMetadataSchema)}).parse(data);
		return parsed.fixtures;
	},
});
