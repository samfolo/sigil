/**
 * Error formatting for LLM-readable output
 *
 * Formats SpecError arrays into structured markdown that is optimised for
 * consumption by language models.
 */

import {
	appendMetadata,
	formatErrorsBySeverity,
	formatList,
	safeStringify,
} from '@sigil/src/common/errors/structured';

import {ERROR_CODES} from './codes';
import type {
	EmptyLayoutContext,
	ExpectedSingleValueContext,
	FieldRequiredContext,
	InvalidAccessorContext,
	MissingArrayPropertyContext,
	MissingComponentContext,
	NotArrayContext,
	QueryErrorContext,
	TypeMismatchContext,
	UnknownLayoutChildTypeContext,
	UnknownLayoutTypeContext,
} from './contexts';
import type {SpecError} from './types';

/**
 * Formats MISSING_COMPONENT error
 */
const formatMissingComponent = (context: MissingComponentContext): string => {
	const componentId = context.componentId ?? 'unknown';
	const available = formatList(context.availableComponents);
	return `Missing component; was given "${componentId}" but available components are ${available}`;
};

/**
 * Formats MISSING_ARRAY_PROPERTY error
 */
const formatMissingArrayProperty = (
	context: MissingArrayPropertyContext
): string => {
	const attempted = formatList(
		context.attemptedProperties,
		', ',
		'(none checked)'
	);
	const keys = formatList(context.objectKeys, ', ', '(no keys)');
	return `No array property found; checked ${attempted} but object has keys ${keys}`;
};

/**
 * Formats UNKNOWN_LAYOUT_TYPE error
 */
const formatUnknownLayoutType = (context: UnknownLayoutTypeContext): string => {
	const layoutType = context.layoutType ?? 'unknown';
	const validTypes = formatList(context.validTypes);
	return `Unknown layout type; was given "${layoutType}" but valid types are ${validTypes}`;
};

/**
 * Formats UNKNOWN_LAYOUT_CHILD_TYPE error
 */
const formatUnknownLayoutChildType = (
	context: UnknownLayoutChildTypeContext
): string => {
	const childType = context.childType ?? 'unknown';
	const validTypes = formatList(context.validTypes);
	return `Unknown layout child type; was given "${childType}" but valid types are ${validTypes}`;
};

/**
 * Formats INVALID_ACCESSOR error
 */
const formatInvalidAccessor = (context: InvalidAccessorContext): string => {
	const accessor = context.accessor ?? 'unknown';
	const reason = context.reason;

	if (!reason) {
		return `Invalid accessor "${accessor}"`;
	}

	return `Invalid accessor "${accessor}"; ${reason}`;
};

/**
 * Formats EXPECTED_SINGLE_VALUE error
 */
const formatExpectedSingleValue = (
	context: ExpectedSingleValueContext
): string => {
	const accessor = context.accessor ?? 'unknown';
	const count = context.resultCount ?? 0;
	return `Expected single value but accessor "${accessor}" returned ${count} items`;
};

/**
 * Formats FIELD_REQUIRED error
 */
const formatFieldRequired = (context: FieldRequiredContext): string => {
	const operation = context.operation ?? 'unknown';
	let message = `Field required for operation "${operation}"`;

	if (context.availableFields && context.availableFields.length > 0) {
		const fields = formatList(context.availableFields);
		message += `; available fields are ${fields}`;
	}

	return message;
};

/**
 * Formats EMPTY_LAYOUT error
 */
const formatEmptyLayout = (context: EmptyLayoutContext): string => {
	const layoutType = context.layoutType ?? 'unknown';
	return `Empty layout; ${layoutType} layout has no children`;
};

/**
 * Formats NOT_ARRAY error
 */
const formatNotArray = (context: NotArrayContext): string => {
	const actualType = context.actualType ?? 'unknown';
	let message = `Expected array but got ${actualType}`;

	if (context.value !== undefined) {
		const stringified = safeStringify(context.value);
		message += ` (value: ${stringified})`;
	}

	return message;
};

/**
 * Formats QUERY_ERROR error
 */
const formatQueryError = (context: QueryErrorContext): string => {
	const jsonPath = context.jsonPath ?? 'unknown';
	const reason = context.reason ?? 'unknown reason';
	let message = `JSONPath query failed for "${jsonPath}"; ${reason}`;

	if (context.dataType) {
		message += ` (attempted on ${context.dataType})`;
	}

	return message;
};

/**
 * Formats TYPE_MISMATCH error
 */
const formatTypeMismatch = (context: TypeMismatchContext): string => {
	const expected = context.expected ?? 'unknown';
	const actual = context.actual ?? 'unknown';
	let message = `Type mismatch; expected "${expected}" but got "${actual}"`;

	if (context.nodeId) {
		message += ` (node: ${context.nodeId})`;
	}

	return message;
};

/**
 * Formats a single error into a human-readable message
 *
 * Uses templated messages for each error code with contextual information.
 * Handles null/undefined context values gracefully.
 *
 * @param error - The error to format
 * @returns Formatted error message
 */
export const formatError = (error: SpecError): string => {
	let baseMessage: string;

	switch (error.code) {
		case ERROR_CODES.MISSING_COMPONENT:
			baseMessage = formatMissingComponent(error.context);
			break;

		case ERROR_CODES.MISSING_ARRAY_PROPERTY:
			baseMessage = formatMissingArrayProperty(error.context);
			break;

		case ERROR_CODES.UNKNOWN_LAYOUT_TYPE:
			baseMessage = formatUnknownLayoutType(error.context);
			break;

		case ERROR_CODES.UNKNOWN_LAYOUT_CHILD_TYPE:
			baseMessage = formatUnknownLayoutChildType(error.context);
			break;

		case ERROR_CODES.INVALID_ACCESSOR:
			baseMessage = formatInvalidAccessor(error.context);
			break;

		case ERROR_CODES.EXPECTED_SINGLE_VALUE:
			baseMessage = formatExpectedSingleValue(error.context);
			break;

		case ERROR_CODES.FIELD_REQUIRED:
			baseMessage = formatFieldRequired(error.context);
			break;

		case ERROR_CODES.EMPTY_LAYOUT:
			baseMessage = formatEmptyLayout(error.context);
			break;

		case ERROR_CODES.NOT_ARRAY:
			baseMessage = formatNotArray(error.context);
			break;

		case ERROR_CODES.QUERY_ERROR:
			baseMessage = formatQueryError(error.context);
			break;

		case ERROR_CODES.TYPE_MISMATCH:
			baseMessage = formatTypeMismatch(error.context);
			break;
	}

	return appendMetadata(baseMessage, error.path, error.suggestion);
};

/**
 * Formats multiple errors into LLM-readable markdown
 *
 * Groups errors by severity (errors first, then warnings) and formats each
 * with a bulleted list under severity headers.
 *
 * @param errors - Array of errors to format
 * @returns Markdown-formatted error summary, or empty string if no errors
 */
export const formatErrorsForModel = (errors: SpecError[]): string => {
	return formatErrorsBySeverity(errors, formatError, 'markdown');
};
