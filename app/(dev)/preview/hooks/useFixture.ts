import {useQuery} from '@tanstack/react-query';

import {FixtureSchema} from '@sigil/src/common/fixtures/schemas';

/**
 * Fetches a single fixture by ID from the preview API.
 *
 * @param id - The fixture ID (format: "logs/filename" or "fixtures/filename"), or null
 * @returns React Query result containing the fixture data
 */
export const useFixture = (id: string | null) => useQuery({
	queryKey: ['fixture', id],
	queryFn: async () => {
		if (!id) {
			throw new Error('No fixture ID provided');
		}

		const response = await fetch(`/api/preview/${id}`);

		if (!response.ok) {
			const error = await response.json();
			throw new Error(error.error || 'Failed to fetch fixture');
		}

		const data = await response.json();
		return FixtureSchema.parse(data);
	},
	enabled: !!id,
});
