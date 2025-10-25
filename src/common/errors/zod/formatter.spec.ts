/**
 * Tests for Zod error formatting
 */

import {describe, it, expect} from 'vitest';

import {formatZodErrorsForModel} from './formatter';
import {
  ARRAY_ERROR,
  DEEPLY_NESTED_ERROR,
  EMPTY_ERROR,
  FORM_LEVEL_ERROR,
  MISSING_FIELDS_ERROR,
  MULTIPLE_ERRORS,
  NESTED_ERROR,
  NUMERIC_ERROR,
  WRONG_TYPES_ERROR,
} from './formatter.fixtures';

describe('formatZodErrorsForModel', () => {
  describe('basic formatting', () => {
    it('should format missing required fields', () => {
      const result = formatZodErrorsForModel(MISSING_FIELDS_ERROR);

      expect(result).toContain('## Errors');
      expect(result).toContain('at name');
      expect(result).toContain('at age');
    });

    it('should format wrong type errors', () => {
      const result = formatZodErrorsForModel(WRONG_TYPES_ERROR);

      expect(result).toContain('## Errors (2)');
      expect(result).toContain('at name');
      expect(result).toContain('at age');
    });

    it('should return empty string for empty error', () => {
      const result = formatZodErrorsForModel(EMPTY_ERROR);

      expect(result).toBe('');
    });
  });

  describe('nested objects', () => {
    it('should format nested object errors with dot notation', () => {
      const result = formatZodErrorsForModel(NESTED_ERROR);

      expect(result).toContain('## Errors');
      expect(result).toContain('at user.email');
      expect(result).toContain('at preferences.theme');
    });

    it('should format deeply nested errors', () => {
      const result = formatZodErrorsForModel(DEEPLY_NESTED_ERROR);

      expect(result).toContain('## Errors');
      expect(result).toContain('at company.departments[0].employees[1].email');
    });
  });

  describe('arrays', () => {
    it('should format array element errors with bracket notation', () => {
      const result = formatZodErrorsForModel(ARRAY_ERROR);

      expect(result).toContain('## Errors');
      expect(result).toContain('at items[1]');
      expect(result).toContain('at items[2]');
    });

    it('should combine array index with nested properties', () => {
      const result = formatZodErrorsForModel(DEEPLY_NESTED_ERROR);

      expect(result).toContain('at company.departments[0].employees[1].email');
    });
  });

  describe('form-level errors', () => {
    it('should format root-level errors without path', () => {
      const result = formatZodErrorsForModel(FORM_LEVEL_ERROR);

      expect(result).toContain('## Errors');
      expect(result).toContain('Passwords must match');
      // Root errors should not have "at (root)" appended
      expect(result).not.toContain('at (root)');
    });
  });

  describe('multiple errors', () => {
    it('should format multiple errors in different fields', () => {
      const result = formatZodErrorsForModel(MULTIPLE_ERRORS);

      expect(result).toContain('## Errors (3)');
      expect(result).toContain('at email');
      expect(result).toContain('at url');
      expect(result).toContain('at uuid');
    });

    it('should format numeric constraint violations', () => {
      const result = formatZodErrorsForModel(NUMERIC_ERROR);

      expect(result).toContain('## Errors');
      expect(result).toContain('at age');
      expect(result).toContain('at score');
      expect(result).toContain('at price');
    });
  });

  describe('output structure', () => {
    it('should use markdown header with error count', () => {
      const result = formatZodErrorsForModel(WRONG_TYPES_ERROR);

      expect(result).toMatch(/^## Errors \(\d+\)/);
    });

    it('should format errors as bullet list', () => {
      const result = formatZodErrorsForModel(WRONG_TYPES_ERROR);
      const lines = result.split('\n');

      // First line is header
      expect(lines.at(0)).toMatch(/^## Errors/);

      // Should contain error bullets (✖) and path indicators (→)
      expect(result).toContain('✖');
      expect(result).toContain('→ at');
    });

    it('should include error messages', () => {
      const result = formatZodErrorsForModel(MISSING_FIELDS_ERROR);

      // Should contain the actual validation messages
      expect(result).toContain('Invalid input: expected string, received undefined');
      expect(result).toContain('Invalid input: expected number, received undefined');
    });
  });

  describe('path formatting', () => {
    it('should format simple property paths', () => {
      const result = formatZodErrorsForModel(WRONG_TYPES_ERROR);

      expect(result).toContain('at name');
      expect(result).toContain('at age');
    });

    it('should format nested property paths with dots', () => {
      const result = formatZodErrorsForModel(NESTED_ERROR);

      // prettifyError formats paths as "→ at path"
      expect(result).toContain('→ at user.email');
      expect(result).toContain('→ at preferences.theme');
    });

    it('should format array indices with brackets', () => {
      const result = formatZodErrorsForModel(ARRAY_ERROR);

      expect(result).toMatch(/at items\[\d+\]/);
    });

    it('should combine dots and brackets for complex paths', () => {
      const result = formatZodErrorsForModel(DEEPLY_NESTED_ERROR);

      // Should have pattern: property.property[index].property[index].property
      expect(result).toContain('company.departments[0].employees[1].email');
    });
  });

  describe('edge cases', () => {
    it('should handle errors with no path (root level)', () => {
      const result = formatZodErrorsForModel(FORM_LEVEL_ERROR);

      // Should contain the message but not append "at" clause
      const lines = result.split('\n').filter((line) => line.startsWith('- '));
      const hasAtClause = lines.some((line) => line.includes(' at '));

      expect(hasAtClause).toBe(false);
    });

    it('should handle empty error array gracefully', () => {
      const result = formatZodErrorsForModel(EMPTY_ERROR);

      expect(result).toBe('');
    });
  });
});
