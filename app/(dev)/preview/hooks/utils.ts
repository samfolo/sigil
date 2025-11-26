import type {UseQueryResult} from '@tanstack/react-query';

import type {Result} from '@sigil/src/common/errors/result';
import {isErr, isOk} from '@sigil/src/common/errors/result';

interface UnwrappedQueryResult<Data> {
	data: Data | undefined;
	error: Error | null;
}

/**
 * Normalises an unknown error value to an Error instance
 */
const toError = (value: unknown): Error => {
	if (value instanceof Error) {
		return value;
	}
	return new Error(String(value));
};

/**
 * Extracts data and error from Result-wrapped React Query response
 *
 * @param query - React Query result containing Result-wrapped data
 * @returns Unwrapped data and error (normalised to Error type)
 */
export const unwrapQueryResult = <Data, Err>(
	query: UseQueryResult<Result<Data, Err>, unknown>
): UnwrappedQueryResult<Data> => {
	const result = query.data;

	if (result && isErr(result)) {
		return {data: undefined, error: toError(result.error)};
	}

	if (query.error) {
		return {data: undefined, error: toError(query.error)};
	}

	return {
		data: result && isOk(result) ? result.data : undefined,
		error: null,
	};
};
