import {prettifyError} from 'zod';

import type {Result} from '@sigil/src/common/errors/result';
import {err, ok} from '@sigil/src/common/errors/result';
import type {SigilLogEntry} from '@sigil/src/common/observability/logger';
import {SpecGeneratedEventSchema} from '@sigil/src/common/observability/logger';
import type {ComponentSpec} from '@sigil/src/lib/generated/schemas/specification';


/**
 * Extracts and validates ComponentSpec from spec_generated log events
 *
 * Searches through log entries for spec_generated events, extracts the spec from
 * the event's data.spec field, and validates it against SpecGeneratedEventSchema.
 * If multiple spec_generated events exist, returns the last one (most recent iteration).
 *
 * @param logs - Array of SigilLogEntry objects to search
 * @returns Result containing validated ComponentSpec or descriptive error message
 */
export const extractSpec = (logs: SigilLogEntry[]): Result<ComponentSpec, string> => {
	const lastSpecEvent = logs.findLast((log) => log.event === 'spec_generated');

	if (!lastSpecEvent) {
		return err('No spec_generated event found in logs');
	}

	const parseResult = SpecGeneratedEventSchema.safeParse(lastSpecEvent);

	if (!parseResult.success) {
		const errorMessage = prettifyError(parseResult.error);
		return err(`Invalid spec_generated event:\n${errorMessage}`);
	}

	return ok(parseResult.data.data.spec);
};
