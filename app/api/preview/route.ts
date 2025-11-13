import type {NextRequest} from 'next/server';
import {NextResponse} from 'next/server';

import {isErr} from '@sigil/src/common/errors/result';
import {scanRuns} from '@sigil/src/common/run';

/**
 * Lists all available runs from runs/ directory
 *
 * Development-only endpoint that exposes run artifact metadata
 * for the preview interface. Scans run directories and returns
 * complete run metadata sorted chronologically.
 *
 * @example
 * ```bash
 * curl http://localhost:3000/api/preview
 * ```
 *
 * @returns 200 with {runs: RunArtifact[]} - sorted newest first
 * @returns 500 with {error: string} - if scanning fails
 */
export const GET = async (_request: NextRequest) => {
	try {
		const result = scanRuns();

		if (isErr(result)) {
			return NextResponse.json(
				{error: `Failed to scan runs: ${result.error}`},
				{status: 500}
			);
		}

		return NextResponse.json({runs: result.data});
	} catch (error) {
		return NextResponse.json(
			{error: error instanceof Error ? error.message : 'Unknown error occurred'},
			{status: 500}
		);
	}
};
