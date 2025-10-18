# Testing

Testing conventions for Sigil. Write comprehensive tests that protect against regression as the project scales.

## Core Principles

### Test Isolation

Isolate units under test. When testing functions that delegate to other tested functions, test the delegation logic, not the delegated behaviour.

```typescript
// Good: Test structure and delegation
it('should delegate to formatError for single error', () => {
  const errors = [createTestError()];
  const result = formatErrorsForHumans(errors);

  expect(result).toBe(formatError(errors[0]));
  expect(result).not.toMatch(/^\d+\./); // No numbering
});

// Bad: Hardcoding output from delegated function
it('should format single error', () => {
  const result = formatErrorsForHumans([createTestError()]);
  expect(result).toBe('Empty layout; vertical layout has no children at $.layout');
  // ^ Breaks when formatError implementation changes
});
```

### Question Complexity

If tests require complex infrastructure (parsers, mocks, fixtures), question whether the code under test is too complex.

```typescript
// Warning sign: Need a parser to test a formatter
const parseFormattedErrors = (output: string) => {
  // Complex parsing logic...
};

it('should format errors correctly', () => {
  const parsed = parseFormattedErrors(formatErrors(errors));
  expect(parsed.errorCount).toBe(2);
});

// Better: Simplify the code or use existing tested functions
```

When tests become harder to write than the implementation, consider:
- Simplifying the implementation
- Deleting the feature entirely
- Using existing tested utilities

### Coverage Requirements

**All** utilities and methods in `src/common/` must have tests. These are foundational building blocks used throughout the codebase. Missing tests create risk as the project scales.

Test for:
- Happy path (valid inputs)
- Edge cases (empty arrays, null, undefined, boundaries)
- Error conditions (invalid inputs, type mismatches)
- All valid code paths

## Test Patterns

### Table-Driven Tests

Use `it.each()` for repetitive test cases. More maintainable and easier to extend.

```typescript
// Good: Table-driven
it.each([
  {description: 'null', value: null},
  {description: 'undefined', value: undefined},
  {description: 'string', value: 'error'},
  {description: 'number', value: 42},
])('should return false for $description', ({value}) => {
  expect(isSpecErrorArray(value)).toBe(false);
});

// Bad: Repetitive
it('should return false for null', () => {
  expect(isSpecErrorArray(null)).toBe(false);
});

it('should return false for undefined', () => {
  expect(isSpecErrorArray(undefined)).toBe(false);
});
// ... etc
```

### Type Narrowing Verification

When testing type guards, verify that TypeScript narrowing works correctly.

```typescript
it('should narrow type to SpecError[] when true', () => {
  const value: unknown = [createValidSpecError()];

  if (isSpecErrorArray(value)) {
    // TypeScript should know value is SpecError[]
    const firstError: SpecError = value[0];
    expect(firstError.code).toBe(ERROR_CODES.EMPTY_LAYOUT);
  }
});
```

### Test Both Success and Error Cases

Never test only the happy path. Always verify error handling.

```typescript
describe('divide', () => {
  it('should return result for valid division', () => {
    const result = divide(10, 2);
    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.data).toBe(5);
    }
  });

  it('should return error for division by zero', () => {
    const result = divide(10, 0);
    expect(isErr(result)).toBe(true);
  });
});
```

## Test Organisation

### File Structure

Tests follow the directory structure from @CLAUDE.md:

```
functionName/
├── index.ts                   # export {functionName} from './functionName'
├── functionName.ts            # Implementation
├── functionName.spec.ts       # Tests
└── functionName.fixtures.ts   # Fixtures (optional)
```

For directories with multiple utilities (e.g., `predicates/`), colocate tests with implementations:

```
predicates/
├── index.ts          # Barrel exports only
├── predicates.ts     # Implementation
└── predicates.spec.ts # Tests
```

### No Business Logic in Test Files

Test files contain tests only. Extract shared test helpers and fixtures to separate files.

```typescript
// Bad: Helper function in test file
// myFunction.spec.ts
const createComplexTestData = () => { /* ... */ };

describe('myFunction', () => {
  it('should work', () => {
    const data = createComplexTestData();
    // ...
  });
});

// Good: Extract to fixtures
// myFunction.fixtures.ts
export const createComplexTestData = () => { /* ... */ };

// myFunction.spec.ts
import {createComplexTestData} from './myFunction.fixtures';
```

## Anti-Patterns

### Brittle String Matching

Avoid testing exact strings when delegating to other tested functions. Test structure instead.

```typescript
// Brittle: Breaks when formatError changes
expect(result).toContain('Empty layout; vertical');

// Better: Test delegation
expect(result).toContain(formatError(errors[0]));

// Best: Test structure/behaviour
expect(result).toMatch(/^1\. /);
expect(result).toContain('; 2. ');
```

### Over-Mocking

Don't mock internal utilities that are already tested. Use real implementations.

```typescript
// Bad: Mocking tested internal utilities
vi.mock('./format', () => ({
  formatError: vi.fn(() => 'mocked error'),
}));

// Good: Use real implementations
import {formatError} from './format';
// formatError is tested separately, trust it
```

### Testing Implementation Details

Test public API and behaviour, not internal implementation.

```typescript
// Bad: Testing private implementation
expect(result.internalCache.size).toBe(3);

// Good: Testing observable behaviour
expect(myFunction(input)).toBe(expected);
expect(myFunction(input)).toBe(expected); // Cached, but that's internal
```

### Ignoring Edge Cases

Empty arrays, null, undefined, and boundary conditions must be tested.

```typescript
describe('formatErrorsForModel', () => {
  it('should return empty string for empty array', () => {
    expect(formatErrorsForModel([])).toBe('');
  });

  it('should handle single error', () => { /* ... */ });
  it('should handle multiple errors', () => { /* ... */ });
});
```
