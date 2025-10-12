# Error handling

Error handling conventions for Sigil. Use `Result<T, E>` for expected errors, throw exceptions for programming errors.

## Decision Rules

Use `Result<T, E>` for:
- Validation failures
- Not found / missing data
- Parsing errors
- External API failures
- User input errors
- Any error that is part of normal operation

Throw exceptions for:
- Programming errors (null deref, index out of bounds)
- Type mismatches that should never occur
- Assertion failures
- System failures (out of memory)
- Errors that should crash the application

## Error Type Patterns

Be specific about error types:

```typescript
// Good: Specific error types
Result<User, 'not_found' | 'invalid_id'>
Result<Config, ValidationError>
Result<Data, string[]>  // Array of validation messages

// Avoid: Vague string errors (loses type safety)
Result<User, string>

// Valid: When wrapping external errors or try-catch blocks
Result<User, Error>
```

## Basic Usage

```typescript
import type {Result} from '@sigil/lib/errors/result';
import {ok, err} from '@sigil/lib/errors/result';

const divide = (a: number, b: number): Result<number, string> => {
  if (b === 0) {
    return err('Division by zero');
  }
  return ok(a / b);
};

const parseNumber = (str: string): Result<number, string> => {
  const num = parseInt(str, 10);
  if (isNaN(num)) {
    return err('Invalid number');
  }
  return ok(num);
};

// Handle result
const result = divide(10, 2);
if (result.success) {
  console.log(result.data);  // 5
} else {
  console.error(result.error);
}
```

## Try-Catch Wrapping

No Promise utilities exist. Wrap async operations manually:

```typescript
const fetchUser = async (id: string): Promise<Result<User, string>> => {
  try {
    const response = await fetch(`/api/users/${id}`);
    if (!response.ok) {
      return err('Failed to fetch user');
    }
    const user = await response.json();
    return ok(user);
  } catch (e) {
    return err(e instanceof Error ? e.message : 'Unknown error');
  }
};
```

## Essential Utilities

### Type Guards

```typescript
import {isOk, isErr} from '@sigil/lib/errors/result';

if (isOk(result)) {
  console.log(result.data);  // TypeScript narrows to Ok<T>
}

if (isErr(result)) {
  console.error(result.error);  // TypeScript narrows to Err<E>
}
```

Use type guards instead of `result.success` for better type narrowing.

### Combining Multiple Results

```typescript
import {all} from '@sigil/lib/errors/result';

const results = [parseNumber('1'), parseNumber('2'), parseNumber('3')];
const combined = all(results);
// ok([1, 2, 3]) if all succeed
// err('Invalid number') at first error (remaining results ignored)
```

## Code Patterns

Prefer early returns:

```typescript
const process = (data: Data): Result<Output, Error> => {
  if (!data.valid) {
    return err(new Error('Invalid data'));
  }

  const step1 = transform(data);
  if (isErr(step1)) {
    return step1;
  }

  return ok(finalise(step1.data));
};
```

Document error conditions in JSDoc:

```typescript
/**
 * Parses user input into validated User object.
 *
 * @returns Result containing User on success, or array of validation errors
 */
const parseUser = (input: unknown): Result<User, string[]> => {
  // ...
};
```

## Anti-Patterns

Never wrap Results in try-catch:

```typescript
// Wrong: Result already handles the error
try {
  const result = divide(10, 0);
  if (result.success) {
    // ...
  }
} catch (e) {
  // This will never execute
}

// Correct: Handle the Result directly
const result = divide(10, 0);
if (isErr(result)) {
  handleError(result.error);
}
```

Never throw from functions that return Result:

```typescript
// Wrong: Mixing error strategies
const parse = (input: string): Result<Data, string> => {
  if (!input) {
    throw new Error('Empty input');  // Don't do this
  }
  return ok(data);
};

// Correct: Return error via Result
const parse = (input: string): Result<Data, string> => {
  if (!input) {
    return err('Empty input');
  }
  return ok(data);
};
```

Never ignore error cases:

```typescript
// Wrong: Only handling success
const result = validateUser(user);
if (result.success) {
  save(result.data);
}
// Missing error handling entirely

// Correct: Handle both cases
const result = validateUser(user);
if (isOk(result)) {
  save(result.data);
} else {
  displayErrors(result.error);
}
```

## Advanced Utilities

Rarely needed utilities available in @sigil/lib/errors/result:

- `chain<T, U, E>(result, fn)` - Chain operations without nested checks (prefer early returns)
- `mapResult<T, U, E>(result, fn)` - Transform success value
- `mapError<T, E, F>(result, fn)` - Transform error value
- `unwrapOr<T, E>(result, defaultValue)` - Extract value or use default
- `unwrapOrElse<T, E>(result, fn)` - Extract value or compute from error

Use type narrowing with `isOk`/`isErr` instead of these utilities in most cases.
