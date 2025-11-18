import {useQuery} from '@tanstack/react-query';
import {z} from 'zod';

import type {Result} from '@sigil/src/common/errors/result';
import {err, ok} from '@sigil/src/common/errors/result';
import type {RunArtifact} from '@sigil/src/common/run/schemas';
import {RunArtifactSchema} from '@sigil/src/common/run/schemas';

/**
 * Fetches the list of all available runs from the preview API.
 *
 * @returns React Query result containing Result-wrapped run artifact array
 */
export const useRunList = () => useQuery({
	queryKey: ['runs'],
	queryFn: async (): Promise<Result<RunArtifact[], string>> => {
		try {
			const response = await fetch('/api/preview');

			if (!response.ok) {
				const errorData = await response.json();
				return err(errorData.error || 'Failed to fetch runs');
			}

			const data = await response.json();
			const schema = z.object({runs: z.array(RunArtifactSchema)});
			const parseResult = schema.safeParse(data);

			if (!parseResult.success) {
				return err(`Invalid runs data: ${parseResult.error.message}`);
			}

			return ok(parseResult.data.runs);
		} catch (error) {
			return err(error instanceof Error ? error.message : 'Unknown error occurred');
		}
	},
});
