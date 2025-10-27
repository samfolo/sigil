# Error handling

Error handling conventions for Sigil. Use `Result<T, E>` for expected errors, throw exceptions for programming errors.

All error systems import from `@sigil/src/common/errors`. Generic error infrastructure in `src/common/errors/structured/`, domain errors in `src/common/errors/spec/` and `src/common/errors/agent/`.

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
import type {Result} from '@sigil/src/common/errors/result';
import {ok, err} from '@sigil/src/common/errors/result';

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
import {isOk, isErr} from '@sigil/src/common/errors/result';

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
import {all} from '@sigil/src/common/errors/result';

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

Rarely needed utilities available in @sigil/src/common/errors/result:

- `chain<T, U, E>(result, fn)` - Chain operations without nested checks (prefer early returns)
- `mapResult<T, U, E>(result, fn)` - Transform success value
- `mapError<T, E, F>(result, fn)` - Transform error value
- `unwrapOr<T, E>(result, defaultValue)` - Extract value or use default
- `unwrapOrElse<T, E>(result, fn)` - Extract value or compute from error

Use type narrowing with `isOk`/`isErr` instead of these utilities in most cases.

## Structured Spec Errors

For renderer and tool errors that need LLM-actionable feedback, use `SpecError` with `Result<T, SpecError[]>`.

### When to Use

Use SpecError for:
- Renderer errors (layout validation, component lookup, data binding)
- Tool execution errors (aggregation, query failures)

Use plain strings for:
- Feature limitations (unsupported components)
- Programming errors (throw exceptions)

### Error Categories

- `spec`: Model generated malformed structure (missing IDs, invalid types, bad JSONPath)
- `data`: Model's assumptions don't match data (failed queries, nulls, type mismatches)

### Construction

Construct inline at error sites. No helpers.

```typescript
import {ERROR_CODES, type SpecError} from '@sigil/src/common/errors';

const error: SpecError = {
  code: ERROR_CODES.MISSING_COMPONENT,
  severity: 'error',
  category: 'spec',
  path: '$.layout.children[0]',
  context: {componentId: 'UserCard', availableComponents: ['DataTable']},
  suggestion: 'Did you mean "DataTable"?',
};

return err([error]);
```

### Error Accumulation

Collect errors, continue processing where possible:

```typescript
const errors: SpecError[] = [];

for (const item of items) {
  const result = processItem(item);
  if (isErr(result)) {
    errors.push(...result.error);
    continue; // Use fallback
  }
}

return errors.length > 0 ? err(errors) : ok(data);
```

Pipeline strategy:
- Layout validation: fail fast
- Component lookup: fail fast
- Data binding: accumulate all errors
- buildRenderTree: collect spec + binding errors

### Error Codes

See `@sigil/src/common/errors/types.ts` for context type definitions.

Reference: MISSING_COMPONENT, MISSING_ARRAY_PROPERTY, UNKNOWN_LAYOUT_TYPE, UNKNOWN_LAYOUT_CHILD_TYPE

Accessor: INVALID_ACCESSOR, EXPECTED_SINGLE_VALUE

Requirement: FIELD_REQUIRED, EMPTY_LAYOUT

Type: NOT_ARRAY, QUERY_ERROR, TYPE_MISMATCH

### LLM Output

```typescript
import {formatSpecErrorsForModel} from '@sigil/src/common/errors';

const formatted = formatSpecErrorsForModel(errors);
// ## Errors (1)
// - Missing component; was given "UserCard" but available: "DataTable" at $.layout.children[0]
```

### Boundary Adapter

Throw only at React boundaries and tool handlers:

```typescript
import {SpecProcessingError} from '@sigil/src/common/errors';

if (isErr(result)) {
  throw new SpecProcessingError(result.error);
}
```

### Levenshtein Suggestions

```typescript
import {closest, distance} from 'fastest-levenshtein';

const match = closest(input, candidates);
if (distance(input, match) <= 2) {
  suggestion = `Did you mean "${match}"?`;
}
```
