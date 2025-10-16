/**
 * Error formatting for LLM-readable output
 *
 * Formats SpecError arrays into structured markdown that is optimised for
 * consumption by language models.
 */

import {groupBy} from 'lodash';

import type {
	EmptyLayoutContext,
	ExpectedSingleValueContext,
	FieldRequiredContext,
	InvalidAccessorContext,
	MissingArrayPropertyContext,
	MissingComponentContext,
	NotArrayContext,
	QueryErrorContext,
	SpecError,
	TypeMismatchContext,
	UnknownLayoutChildTypeContext,
	UnknownLayoutTypeContext,
} from '@sigil/src/common/errors/types';
import {ERROR_CODES} from '@sigil/src/common/errors/codes';

/**
 * Formats an array of strings as a quoted list
 *
 * @param items - Array of strings to format
 * @param separator - Separator between items (default: ' | ')
 * @param emptyText - Text to show when array is empty
 * @returns Formatted list or empty text
 */
const formatList = (
	items: string[] | undefined,
	separator: string = ' | ',
	emptyText: string = '(none available)'
): string => {
	if (!items || items.length === 0) {
		return emptyText;
	}
	return items.map((item) => `"${item}"`).join(separator);
};

/**
 * Safely stringifies a value with truncation
 *
 * @param value - Value to stringify
 * @param maxLength - Maximum length before truncation
 * @returns Stringified value, truncated if necessary
 */
const safeStringify = (value: unknown, maxLength: number = 100): string => {
	try {
		const stringified = JSON.stringify(value);
		return stringified.length > maxLength
			? `${stringified.slice(0, maxLength)}...`
			: stringified;
	} catch {
		return '(unstringifiable)';
	}
};

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
 * Formats unknown error code with context dump
 */
const formatUnknownError = (code: string, context: Record<string, unknown>): string => {
	let message = `[${code}]`;
	try {
		const contextString = JSON.stringify(context, null, 2);
		message += `\n  ${contextString}`;
	} catch {
		message += '\n  (context unavailable)';
	}
	return message;
};

/**
 * Appends path and suggestion to a message
 */
const appendMetadata = (
	message: string,
	path: string,
	suggestion?: string
): string => {
	const pathStr = path || '(no path)';
	let result = `${message} at ${pathStr}`;

	if (suggestion) {
		result += `. ${suggestion}`;
	}

	return result;
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
	switch (error.code) {
		case ERROR_CODES.MISSING_COMPONENT:
			return appendMetadata(
				formatMissingComponent(error.context),
				error.path,
				error.suggestion
			);

		case ERROR_CODES.MISSING_ARRAY_PROPERTY:
			return appendMetadata(
				formatMissingArrayProperty(error.context),
				error.path,
				error.suggestion
			);

		case ERROR_CODES.UNKNOWN_LAYOUT_TYPE:
			return appendMetadata(
				formatUnknownLayoutType(error.context),
				error.path,
				error.suggestion
			);

		case ERROR_CODES.UNKNOWN_LAYOUT_CHILD_TYPE:
			return appendMetadata(
				formatUnknownLayoutChildType(error.context),
				error.path,
				error.suggestion
			);

		case ERROR_CODES.INVALID_ACCESSOR:
			return appendMetadata(
				formatInvalidAccessor(error.context),
				error.path,
				error.suggestion
			);

		case ERROR_CODES.EXPECTED_SINGLE_VALUE:
			return appendMetadata(
				formatExpectedSingleValue(error.context),
				error.path,
				error.suggestion
			);

		case ERROR_CODES.FIELD_REQUIRED:
			return appendMetadata(
				formatFieldRequired(error.context),
				error.path,
				error.suggestion
			);

		case ERROR_CODES.EMPTY_LAYOUT:
			return appendMetadata(
				formatEmptyLayout(error.context),
				error.path,
				error.suggestion
			);

		case ERROR_CODES.NOT_ARRAY:
			return appendMetadata(
				formatNotArray(error.context),
				error.path,
				error.suggestion
			);

		case ERROR_CODES.QUERY_ERROR:
			return appendMetadata(
				formatQueryError(error.context),
				error.path,
				error.suggestion
			);

		case ERROR_CODES.TYPE_MISMATCH:
			return appendMetadata(
				formatTypeMismatch(error.context),
				error.path,
				error.suggestion
			);
	}
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
	if (errors.length === 0) {
		return '';
	}

	const grouped = groupBy(errors, 'severity');
	const sections: string[] = [];

	// Process errors first
	if (grouped['error']) {
		const errorSection = [
			`## Errors (${grouped['error'].length})`,
			...grouped['error'].map((err) => `- ${formatError(err)}`),
		].join('\n');
		sections.push(errorSection);
	}

	// Then warnings
	if (grouped['warning']) {
		const warningSection = [
			`## Warnings (${grouped['warning'].length})`,
			...grouped['warning'].map((err) => `- ${formatError(err)}`),
		].join('\n');
		sections.push(warningSection);
	}

	return sections.join('\n\n');
};
