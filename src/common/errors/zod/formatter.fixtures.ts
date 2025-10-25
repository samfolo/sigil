/**
 * Test fixtures for Zod error formatting
 *
 * Provides example ZodErrors for various validation scenarios.
 */

import {z} from 'zod';

/**
 * Schema for testing missing required fields
 */
export const SIMPLE_USER_SCHEMA = z.object({
  name: z.string(),
  age: z.number(),
});

/**
 * Schema for testing nested object validation
 */
export const NESTED_SCHEMA = z.object({
  user: z.object({
    name: z.string(),
    email: z.email(),
  }),
  preferences: z.object({
    theme: z.enum(['light', 'dark']),
  }),
});

/**
 * Schema for testing array validation
 */
export const ARRAY_SCHEMA = z.object({
  items: z.array(
    z.object({
      id: z.string(),
      quantity: z.number().positive(),
    })
  ),
});

/**
 * Schema for testing deeply nested paths
 */
export const DEEPLY_NESTED_SCHEMA = z.object({
  company: z.object({
    departments: z.array(
      z.object({
        name: z.string(),
        employees: z.array(
          z.object({
            id: z.string(),
            email: z.email(),
          })
        ),
      })
    ),
  }),
});

/**
 * Schema for testing form-level (root) errors with refinement
 */
export const REFINEMENT_SCHEMA = z
  .object({
    password: z.string().min(8),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords must match',
    path: [],
  });

/**
 * Schema for testing string format validations
 */
export const FORMAT_SCHEMA = z.object({
  email: z.email(),
  url: z.url(),
  uuid: z.uuidv4(),
});

/**
 * Schema for testing numeric constraints
 */
export const NUMERIC_SCHEMA = z.object({
  age: z.number().min(0).max(120),
  score: z.number().int(),
  price: z.number().positive(),
});

/**
 * Fixture: Missing required fields
 */
export const MISSING_FIELDS_ERROR = (() => {
  const result = SIMPLE_USER_SCHEMA.safeParse({});
  if (!result.success) {
    return result.error;
  }
  throw new Error('Expected validation to fail');
})();

/**
 * Fixture: Wrong types
 */
export const WRONG_TYPES_ERROR = (() => {
  const result = SIMPLE_USER_SCHEMA.safeParse({name: 123, age: 'invalid'});
  if (!result.success) {
    return result.error;
  }
  throw new Error('Expected validation to fail');
})();

/**
 * Fixture: Nested object errors
 */
export const NESTED_ERROR = (() => {
  const result = NESTED_SCHEMA.safeParse({
    user: {name: '', email: 'not-an-email'},
    preferences: {theme: 'invalid'},
  });
  if (!result.success) {
    return result.error;
  }
  throw new Error('Expected validation to fail');
})();

/**
 * Fixture: Array validation errors
 */
export const ARRAY_ERROR = (() => {
  const result = ARRAY_SCHEMA.safeParse({
    items: [
      {id: 'valid', quantity: 5},
      {id: '', quantity: -1},
      {id: 'also-valid', quantity: 0},
    ],
  });
  if (!result.success) {
    return result.error;
  }
  throw new Error('Expected validation to fail');
})();

/**
 * Fixture: Deeply nested error
 */
export const DEEPLY_NESTED_ERROR = (() => {
  const result = DEEPLY_NESTED_SCHEMA.safeParse({
    company: {
      departments: [
        {
          name: 'Engineering',
          employees: [
            {id: 'e1', email: 'valid@example.com'},
            {id: 'e2', email: 'invalid-email'},
          ],
        },
      ],
    },
  });
  if (!result.success) {
    return result.error;
  }
  throw new Error('Expected validation to fail');
})();

/**
 * Fixture: Form-level (root) error from refinement
 */
export const FORM_LEVEL_ERROR = (() => {
  const result = REFINEMENT_SCHEMA.safeParse({
    password: 'password123',
    confirmPassword: 'different',
  });
  if (!result.success) {
    return result.error;
  }
  throw new Error('Expected validation to fail');
})();

/**
 * Fixture: Multiple errors in different fields
 */
export const MULTIPLE_ERRORS = (() => {
  const result = FORMAT_SCHEMA.safeParse({
    email: 'not-an-email',
    url: 'not-a-url',
    uuid: 'not-a-uuid',
  });
  if (!result.success) {
    return result.error;
  }
  throw new Error('Expected validation to fail');
})();

/**
 * Fixture: Numeric constraint violations
 */
export const NUMERIC_ERROR = (() => {
  const result = NUMERIC_SCHEMA.safeParse({
    age: -5,
    score: 3.14,
    price: -10,
  });
  if (!result.success) {
    return result.error;
  }
  throw new Error('Expected validation to fail');
})();

/**
 * Fixture: Empty error (edge case - should not happen in practice)
 */
export const EMPTY_ERROR = new z.ZodError([]);
