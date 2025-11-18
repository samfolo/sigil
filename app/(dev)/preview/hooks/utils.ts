import type {UseQueryResult} from '@tanstack/react-query';

import type {Result} from '@sigil/src/common/errors/result';
import {isErr, unwrapOr} from '@sigil/src/common/errors/result';

/**
 * Extracts data and error from Result-wrapped React Query response
 *
 * @param query - React Query result containing Result-wrapped data
 * @returns Unwrapped data and error
 */
export const unwrapQueryResult = <Data, ErrorType>(
	query: UseQueryResult<Result<Data, ErrorType>, unknown>
): {data: Data | undefined; error: ErrorType | unknown} => {
	const result = query.data;

	return {
		data: unwrapOr(result, undefined),
		error: result && isErr(result) ? result.error : query.error,
	};
};
