/**
 * Tests for validation error formatting
 */

import {describe, expect, it} from 'vitest';

import {formatValidationErrorForPrompt} from './format';
import {
  LAYER_METADATA,
  SAMPLE_ERROR,
  SAMPLE_SPEC_ERRORS,
  SAMPLE_UNKNOWN_ERROR,
  SAMPLE_ZOD_ERROR,
} from './format.fixtures';

describe('formatValidationErrorForPrompt', () => {
  it('should dispatch ZodError to formatZodErrorsForModel and include layer context', () => {
    const result = formatValidationErrorForPrompt(
      SAMPLE_ZOD_ERROR,
      LAYER_METADATA.zod.name,
      LAYER_METADATA.zod.description
    );

    // Layer context included
    expect(result).toContain(LAYER_METADATA.zod.name);
    expect(result).toContain(LAYER_METADATA.zod.description);

    // Dispatched to formatZodErrorsForModel (produces "## Errors" header)
    expect(result).toContain('## Errors');
  });

  it('should dispatch SpecError[] to formatSpecErrorsForModel and include layer context', () => {
    const result = formatValidationErrorForPrompt(
      SAMPLE_SPEC_ERRORS,
      LAYER_METADATA.spec.name,
      LAYER_METADATA.spec.description
    );

    // Layer context included
    expect(result).toContain(LAYER_METADATA.spec.name);
    expect(result).toContain(LAYER_METADATA.spec.description);

    // Dispatched to formatSpecErrorsForModel (produces error details)
    expect(result).toContain('Missing component');
    expect(result).toContain('UserCard');
  });

  it('should use Error.message for Error instances and include layer context', () => {
    const result = formatValidationErrorForPrompt(
      SAMPLE_ERROR,
      LAYER_METADATA.businessRules.name,
      LAYER_METADATA.businessRules.description
    );

    // Layer context included
    expect(result).toContain(LAYER_METADATA.businessRules.name);
    expect(result).toContain(LAYER_METADATA.businessRules.description);

    // Error message included
    expect(result).toContain('output must contain at least one column');
  });

  it('should use safeStringify for unknown error types and include layer context', () => {
    const result = formatValidationErrorForPrompt(
      SAMPLE_UNKNOWN_ERROR,
      LAYER_METADATA.custom.name,
      LAYER_METADATA.custom.description
    );

    // Layer context included
    expect(result).toContain(LAYER_METADATA.custom.name);
    expect(result).toContain(LAYER_METADATA.custom.description);

    // Stringified error content included
    expect(result).toContain('CUSTOM_ERROR');
    expect(result).toContain('Something went wrong');
  });
});
