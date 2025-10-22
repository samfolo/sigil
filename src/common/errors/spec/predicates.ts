/**
 * Type guard predicates for spec errors
 */

import {isStructuredErrorArray} from '@sigil/src/common/errors/structured';

import {ERROR_CODES} from './codes';
import type {SpecError, SpecErrorCategory, SpecErrorCode} from './types';

/**
 * Valid spec error codes for runtime validation
 */
const VALID_SPEC_ERROR_CODES = new Set(Object.values(ERROR_CODES));

/**
 * Type guard to check if error is SpecError array
 *
 * Useful at boundaries handling Result<T, SpecError[] | string>
 *
 * @param error - Error value to check
 * @returns true if error is non-empty SpecError array
 *
 * @example
 * ```typescript
 * if (isSpecErrorArray(result.error)) {
 *   console.log(formatErrorsForModel(result.error));
 * }
 * ```
 */
export const isSpecErrorArray = (error: unknown): error is SpecError[] => isStructuredErrorArray<SpecErrorCode, SpecErrorCategory, SpecError['context']>(
		error,
		VALID_SPEC_ERROR_CODES
	);
