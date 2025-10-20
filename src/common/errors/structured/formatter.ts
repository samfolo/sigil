/**
 * Generic formatting utilities for structured errors
 *
 * This module provides reusable formatting functions that can be used across
 * different error domains (spec, agent, etc.).
 */

import {groupBy} from 'lodash';

import type {Severity, StructuredError} from './types';

/**
 * Formats an array of strings as a quoted list
 *
 * @param items - Array of strings to format
 * @param separator - Separator between items (default: ' | ')
 * @param emptyText - Text to show when array is empty
 * @returns Formatted list or empty text
 */
export const formatList = (
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
export const safeStringify = (value: unknown, maxLength: number = 100): string => {
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
 * Formats unknown error code with context dump
 */
export const formatUnknownError = (code: string, context: Record<string, unknown>): string => {
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
export const appendMetadata = (
	message: string,
	path?: string,
	suggestion?: string
): string => {
	let result = message;

	if (path) {
		result += ` at ${path}`;
	}

	if (suggestion) {
		result += `. ${suggestion}`;
	}

	return result;
};

/**
 * Groups errors by severity and formats them into sections
 *
 * @param errors - Array of structured errors
 * @param formatError - Function to format individual errors
 * @param sectionFormat - Format for section headers ('markdown' or 'text')
 * @returns Formatted error output grouped by severity
 */
export const formatErrorsBySeverity = <Code extends string, Category extends string, Context>(
	errors: StructuredError<Code, Category, Context>[],
	formatError: (error: StructuredError<Code, Category, Context>) => string,
	sectionFormat: 'markdown' | 'text' = 'markdown'
): string => {
	if (errors.length === 0) {
		return '';
	}

	const grouped = groupBy(errors, 'severity');
	const sections: string[] = [];

	// Helper to create section header
	const createHeader = (severity: Severity, count: number): string => {
		const label = severity === 'error' ? 'Errors' : 'Warnings';
		return sectionFormat === 'markdown'
			? `## ${label} (${count})`
			: `${label.toUpperCase()} (${count})`;
	};

	// Process errors first
	if (grouped['error']) {
		const errorSection = [
			createHeader('error', grouped['error'].length),
			...grouped['error'].map((err) => `- ${formatError(err)}`),
		].join('\n');
		sections.push(errorSection);
	}

	// Then warnings
	if (grouped['warning']) {
		const warningSection = [
			createHeader('warning', grouped['warning'].length),
			...grouped['warning'].map((err) => `- ${formatError(err)}`),
		].join('\n');
		sections.push(warningSection);
	}

	return sections.join('\n\n');
};
