/**
 * Zod error formatting for LLM consumption
 *
 * Converts ZodError into structured, actionable markdown for language models.
 * Leverages Zod's built-in prettifyError function with a markdown header.
 */

import {prettifyError, type ZodError} from 'zod';

/**
 * Formats ZodError into LLM-readable markdown
 *
 * Uses Zod's built-in prettifyError for formatting and wraps with markdown header.
 * The output includes error messages with paths formatted using unicode characters.
 *
 * @param error - The ZodError to format
 * @returns Markdown-formatted error summary, or empty string if no errors
 *
 * @example
 * ```typescript
 * const schema = z.object({
 *   name: z.string(),
 *   age: z.number(),
 * });
 *
 * const result = schema.safeParse({name: 123, age: 'invalid'});
 * if (!result.success) {
 *   const formatted = formatZodErrorsForModel(result.error);
 *   console.log(formatted);
 *   // ## Errors (2)
 *   // ✖ Invalid input: expected string, received number
 *   //   → at name
 *   // ✖ Invalid input: expected number, received string
 *   //   → at age
 * }
 * ```
 */
export const formatZodErrorsForModel = (error: ZodError): string => {
  if (error.issues.length === 0) {
    return '';
  }

  const prettyErrors = prettifyError(error);
  const header = `## Errors (${error.issues.length})`;

  return `${header}\n${prettyErrors}`;
};
