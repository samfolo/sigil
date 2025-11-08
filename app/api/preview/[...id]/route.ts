import type {NextRequest} from 'next/server';
import {NextResponse} from 'next/server';

import {isErr} from '@sigil/src/common/errors/result';
import {loadFixture} from '@sigil/src/common/types/fixture';

/**
 * Loads a specific fixture by ID
 *
 * Development-only endpoint that retrieves a complete fixture including
 * spec, data, and logs. The fixture ID format is "prefix/filename" where
 * prefix is either "logs" or "fixtures".
 *
 * @param params.id - Catch-all route segments (e.g., ["logs", "MyAgent-123"])
 *
 * @example
 * ```bash
 * # Valid request
 * curl http://localhost:3000/api/preview/logs/GenerateSigilIR-1730567890123
 *
 * # Invalid prefix
 * curl http://localhost:3000/api/preview/invalid/MyAgent-123
 * # Returns 400: {error: "Invalid fixture prefix: expected 'logs' or 'fixtures', got 'invalid'"}
 *
 * # Wrong segment count
 * curl http://localhost:3000/api/preview/single-segment
 * # Returns 400: {error: "Invalid fixture ID format: expected 2 segments (prefix/filename), got 1"}
 *
 * # Not found
 * curl http://localhost:3000/api/preview/logs/missing-fixture
 * # Returns 404: {error: "Fixture not found: logs/missing-fixture"}
 * ```
 *
 * @returns 200 with Fixture object on success
 * @returns 400 with {error: string} for invalid ID format
 * @returns 404 with {error: string} for non-existent fixture
 * @returns 500 with {error: string} for other errors
 */
export const GET = async (
	_request: NextRequest,
	{params}: {params: Promise<{id: string[]}>}
) => {
	try {
		const {id} = await params;

		// Validate segment count
		if (id.length !== 2) {
			return NextResponse.json(
				{
					error: `Invalid fixture ID format: expected 2 segments (prefix/filename), got ${id.length}`,
				},
				{status: 400}
			);
		}

		// Validate prefix
		const [prefix] = id;
		if (prefix !== 'logs' && prefix !== 'fixtures') {
			return NextResponse.json(
				{
					error: `Invalid fixture prefix: expected 'logs' or 'fixtures', got '${prefix}'`,
				},
				{status: 400}
			);
		}

		// Reconstruct fixture ID
		const fixtureId = id.join('/');

		// Load fixture
		const result = loadFixture(fixtureId);

		if (isErr(result)) {
			// Check if it's a "not found" error
			if (result.error.includes('not found') || result.error.includes('No fixture file found')) {
				return NextResponse.json(
					{error: `Fixture not found: ${fixtureId}`},
					{status: 404}
				);
			}

			// Other errors are internal server errors
			return NextResponse.json(
				{error: `Failed to load fixture: ${result.error}`},
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
