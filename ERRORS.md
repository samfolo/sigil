# Error Handling Guide

This document describes error handling conventions and best practices for the Sigil codebase.

## Result Type Pattern

We use a Rust-inspired `Result<T, E>` type for error handling instead of throwing exceptions for expected errors. This provides type-safe error handling and makes error cases explicit in function signatures.

### Basic Usage

```typescript
import {Result, ok, err} from '@sigil/lib/errors';

function divide(a: number, b: number): Result<number, string> {
  if (b === 0) {
    return err('Division by zero');
  }
  return ok(a / b);
}

// Handling the result
const result = divide(10, 2);
if (result.success) {
  console.log('Result:', result.data); // 5
} else {
  console.error('Error:', result.error);
}
```

### Error Types

The `Result` type is generic: `Result<T, E>` where:
- `T` is the success value type
- `E` is the error type (defaults to `Error`)

Common error type patterns:

```typescript
// String errors (simple cases)
Result<User, string>

// Error objects (with stack traces)
Result<User, Error>

// Custom error types
Result<User, ValidationError>

// Union of error types
Result<User, 'not_found' | 'invalid_credentials'>
```

### When to Use Result vs Exceptions

**Use Result for:**
- Expected error conditions (validation failures, not found, etc.)
- Operations where errors are part of normal flow
- Library code and utilities
- Functions that may fail for predictable reasons

**Use exceptions for:**
- Unexpected errors (programming errors, system failures)
- Errors that should crash the application
- Third-party library errors that cannot be recovered

### Utility Functions

#### Type Guards

```typescript
import {isOk, isErr} from '@sigil/lib/errors';

const result = divide(10, 2);

if (isOk(result)) {
  // TypeScript knows result.data is available
  console.log(result.data);
}

if (isErr(result)) {
  // TypeScript knows result.error is available
  console.error(result.error);
}
```

#### Mapping Results

```typescript
import {mapResult, mapError} from '@sigil/lib/errors';

// Transform success value
const doubled = mapResult(divide(10, 2), x => x * 2);
// doubled = ok(10)

// Transform error
const withError = mapError(
  divide(10, 0),
  msg => new Error(msg)
);
// withError = err(Error('Division by zero'))
```

#### Chaining Operations

```typescript
import {chain} from '@sigil/lib/errors';

function parseNumber(str: string): Result<number, string> {
  const num = parseInt(str, 10);
  return isNaN(num) ? err('Invalid number') : ok(num);
}

function divideBy(divisor: number) {
  return (num: number): Result<number, string> => divide(num, divisor);
}

// Chain multiple operations
const result = chain(
  parseNumber('10'),
  divideBy(2)
);
// result = ok(5)
```

#### Unwrapping with Defaults

```typescript
import {unwrapOr, unwrapOrElse} from '@sigil/lib/errors';

// Simple default
const value = unwrapOr(divide(10, 0), 0);
// value = 0

// Computed default
const value = unwrapOrElse(
  divide(10, 0),
  (error) => {
    console.error('Error:', error);
    return 0;
  }
);
// value = 0, and error is logged
```

#### Combining Multiple Results

```typescript
import {all} from '@sigil/lib/errors';

const results = [
  parseNumber('1'),
  parseNumber('2'),
  parseNumber('3'),
];

const combined = all(results);
// combined = ok([1, 2, 3])

const resultsWithError = [
  parseNumber('1'),
  parseNumber('invalid'),
  parseNumber('3'),
];

const combined = all(resultsWithError);
// combined = err('Invalid number')
```

## Migration Guide

### From Boolean Returns

**Before:**
```typescript
function validate(data: Data): boolean {
  if (!data.name) {
    console.error('Name is required');
    return false;
  }
  return true;
}
```

**After:**
```typescript
function validate(data: Data): Result<Data, string> {
  if (!data.name) {
    return err('Name is required');
  }
  return ok(data);
}
```

### From Throwing Exceptions

**Before:**
```typescript
function parseConfig(raw: string): Config {
  try {
    return JSON.parse(raw);
  } catch (e) {
    throw new Error(`Invalid config: ${e.message}`);
  }
}
```

**After:**
```typescript
function parseConfig(raw: string): Result<Config, Error> {
  try {
    return ok(JSON.parse(raw));
  } catch (e) {
    return err(new Error(`Invalid config: ${e instanceof Error ? e.message : String(e)}`));
  }
}
```

### From Separate Valid/Errors Return

**Before:**
```typescript
interface ValidationResult {
  valid: boolean;
  errors: string[];
}

function validateUser(user: User): ValidationResult {
  const errors: string[] = [];
  if (!user.name) errors.push('Name required');
  if (!user.email) errors.push('Email required');
  return {valid: errors.length === 0, errors };
}
```

**After:**
```typescript
function validateUser(user: User): Result<User, string[]> {
  const errors: string[] = [];
  if (!user.name) errors.push('Name required');
  if (!user.email) errors.push('Email required');

  if (errors.length > 0) {
    return err(errors);
  }
  return ok(user);
}
```

## Best Practices

### 1. Be Explicit About Error Types

```typescript
// Good: Clear error type
function loadConfig(): Result<Config, 'not_found' | 'invalid_json'> {... }

// Avoid: Generic error
function loadConfig(): Result<Config, string> {... }
```

### 2. Document Error Conditions

```typescript
/**
 * Parses user input into a validated User object
 *
 * @returns Result containing User on success, or array of validation errors on failure
 */
function parseUser(input: unknown): Result<User, string[]> {
  ...
}
```

### 3. Prefer Early Returns

```typescript
// Good
function process(data: Data): Result<Output, Error> {
  if (!data.valid) {
    return err(new Error('Invalid data'));
  }

  const step1 = transform(data);
  if (!step1.success) {
    return step1;
  }

  return ok(finalise(step1.data));
}

// Avoid: Deep nesting
function process(data: Data): Result<Output, Error> {
  if (data.valid) {
    const step1 = transform(data);
    if (step1.success) {
      return ok(finalise(step1.data));
    } else {
      return step1;
    }
  } else {
    return err(new Error('Invalid data'));
  }
}
```

### 4. Use Type Guards for Narrowing

```typescript
const result = loadUser();

// Good: Type guard narrows the type
if (isErr(result)) {
  return handleError(result.error);
}
// TypeScript knows result is Ok<User> here
processUser(result.data);

// Avoid: Manual success check loses type information
if (!result.success) {
  return handleError(result.error);
}
processUser(result.data); // TypeScript can't narrow as well
```

## Testing

When testing functions that return Results:

```typescript
import {describe, it, expect} from 'vitest';
import {isOk, isErr} from '@sigil/lib/errors';

describe('divide', () => {
  it('should return success for valid division', () => {
    const result = divide(10, 2);
    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.data).toBe(5);
    }
  });

  it('should return error for division by zero', () => {
    const result = divide(10, 0);
    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error).toBe('Division by zero');
    }
  });
});
```

## See Also

- [Result Type Implementation](./lib/errors/result.ts)
- [TypeScript Handbook - Discriminated Unions](https://www.typescriptlang.org/docs/handbook/2/narrowing.html#discriminated-unions)
