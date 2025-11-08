import type {NextRequest} from 'next/server';
import {NextResponse} from 'next/server';

import {isErr} from '@sigil/src/common/errors/result';
import {scanFixtureDirectories} from '@sigil/src/common/types/fixture';

/**
 * Lists all available fixtures from logs/ and fixtures/ directories
 *
 * Development-only endpoint that exposes parsed fixture metadata
 * for the preview interface. Scans date-based subdirectories and
 * returns metadata for all parseable fixture files.
 *
 * @example
 * ```bash
 * curl http://localhost:3000/api/preview
 * ```
 *
 * @returns 200 with {fixtures: FixtureMetadata[]} - sorted newest first
 * @returns 500 with {error: string} - if scanning fails
 */
export const GET = async (request: NextRequest) => {
	try {
		const result = scanFixtureDirectories();

		if (isErr(result)) {
			return NextResponse.json(
				{error: `Failed to scan fixture directories: ${result.error}`},
				{status: 500}
			);
		}

		return NextResponse.json({fixtures: result.data});
	} catch (error) {
		return NextResponse.json(
			{error: error instanceof Error ? error.message : 'Unknown error occurred'},
			{status: 500}
		);
	}
};
