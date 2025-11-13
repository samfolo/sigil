import type {NextRequest} from 'next/server';
import {NextResponse} from 'next/server';

import {isErr} from '@sigil/src/common/errors/result';
import {loadRunArtifact} from '@sigil/src/common/run';

/**
 * Loads a specific run by ID
 *
 * Development-only endpoint that retrieves a complete run artifact including
 * input, data, analysis, output, logs, and metadata. The run ID format is
 * "YYYYMMDD-HHmmssSSS-xxxx" (e.g., "20251108-143022000-a3f9").
 *
 * @param params.runId - Run identifier from URL path
 *
 * @example
 * ```bash
 * # Valid request
 * curl http://localhost:3000/api/preview/20251108-143022000-a3f9
 *
 * # Not found
 * curl http://localhost:3000/api/preview/20251108-000000000-0000
 * # Returns 404: {error: "Run not found: 20251108-000000000-0000"}
 * ```
 *
 * @returns 200 with RunArtifact object on success
 * @returns 404 with {error: string} for non-existent run
 * @returns 500 with {error: string} for other errors
 */
export const GET = async (
	_request: NextRequest,
	{params}: {params: Promise<{runId: string}>}
) => {
	try {
		const {runId} = await params;

		const result = loadRunArtifact(runId);

		if (isErr(result)) {
			if (result.error.includes('not found') || result.error.includes('does not exist')) {
				return NextResponse.json(
					{error: `Run not found: ${runId}`},
					{status: 404}
				);
			}

			return NextResponse.json(
				{error: `Failed to load run: ${result.error}`},
				{status: 500}
			);
		}

		return NextResponse.json(result.data);
	} catch (error) {
		return NextResponse.json(
			{error: error instanceof Error ? error.message : 'Unknown error occurred'},
			{status: 500}
		);
	}
};
