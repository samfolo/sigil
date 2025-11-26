import {useQuery} from '@tanstack/react-query';

import type {Result} from '@sigil/src/common/errors/result';
import {err, ok} from '@sigil/src/common/errors/result';
import type {RunArtifact} from '@sigil/src/common/run/schemas';
import {RunArtifactSchema} from '@sigil/src/common/run/schemas';

/**
 * Fetches a single run by ID from the preview API.
 *
 * @param id - The run ID (format: "yyyyMMdd-HHmmssSSS-xxxx"), or null
 * @returns React Query result containing Result-wrapped run artifact data
 */
export const useRun = (id: string | null) => useQuery({
	queryKey: ['run', id],
	queryFn: async (): Promise<Result<RunArtifact, string>> => {
		if (!id) {
			return err('No run ID provided');
		}

		try {
			const response = await fetch(`/api/preview/${id}`);

			if (!response.ok) {
				const errorData = await response.json();
				return err(errorData.error || 'Failed to fetch run');
			}

			const data = await response.json();
			const parseResult = RunArtifactSchema.safeParse(data);

			if (!parseResult.success) {
				return err(`Invalid run data: ${parseResult.error.message}`);
			}

			return ok(parseResult.data);
		} catch (error) {
			return err(error instanceof Error ? error.message : 'Unknown error occurred');
		}
	},
	enabled: !!id,
});
