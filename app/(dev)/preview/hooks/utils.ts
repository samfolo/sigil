import type {UseQueryResult} from '@tanstack/react-query';

import type {Result} from '@sigil/src/common/errors/result';
import {isErr, isOk} from '@sigil/src/common/errors/result';

interface UnwrappedQueryResult<Data, Err> {
	data: Data | undefined;
	error: Err | unknown;
}

/**
 * Extracts data and error from Result-wrapped React Query response
 *
 * @param query - React Query result containing Result-wrapped data
 * @returns Unwrapped data and error
 */
export const unwrapQueryResult = <Data, Err>(
	query: UseQueryResult<Result<Data, Err>, unknown>
): UnwrappedQueryResult<Data, Err> => {
	const result = query.data;

	return {
		data: result && isOk(result) ? result.data : undefined,
		error: result && isErr(result) ? result.error : query.error,
	};
};
