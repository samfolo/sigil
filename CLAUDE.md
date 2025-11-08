# CLAUDE.md

Guidance for Claude Code when working with this repository. Ordered by decision frequency: patterns used in every file first, organisational rules second, reference material last.

## Core Patterns

### Error Handling

MANDATORY: Consult @docs/ERROR_HANDLING.md before writing any error handling code.

Use `Result<T, E>` from @src/common/errors/result.ts for ALL expected errors.

Decision rule:
- Expected errors (validation, not found, parsing) → Return `Result<T, E>`
- Programming errors (null deref, type mismatch) → Throw exception

```typescript
import type {Result} from '@sigil/src/common/errors/result';
import {ok, err} from '@sigil/src/common/errors/result';

const parse = (input: string): Result<Data, string> => {
  if (!input) {
    return err('Input cannot be empty');
  }

  // Parse logic...

  return ok(parsedData);
};
```

See @docs/ERROR_HANDLING.md for complete decision flowchart, utility functions (mapResult, chain, all), and type patterns.

### State Management

All async request/response states use `QueryState` from `src/common/types/queryState.ts`:

```typescript
import type {QueryState} from '@sigil/src/common/types/queryState';

const [state, setState] = useState<QueryState<Data, Error>>({status: 'idle'});
```

Valid states: `'idle'` | `'loading'` | `'success'` | `'error'`

Individual state interfaces are available for explicit typing:
```typescript
import type {IdleQueryState, LoadingQueryState, SuccessQueryState, ErrorQueryState} from '@sigil/src/common/types/queryState';

const successState: SuccessQueryState<Data> = {status: 'success', data: myData};
const errorState: ErrorQueryState<Error> = {status: 'error', error: myError};
```

### Code Style

Arrow functions only:
```typescript
const myFunc = (x: number) => x * 2;
```

No spaces in curly braces:
```typescript
import {useState} from 'react';
const {data} = result;
const obj = {key: 'value'};
```

No single-line blocks:
```typescript
if (condition) {
  doSomething();
}
```

Comments describe code as it exists, not how it changed or will change:
```typescript
// Good
// Content is an array of content blocks
const content = message.content;

// Bad - references changes or process
// Content is now an array after refactoring
// Content changed to array as per PRD
// Content uses array for backward compatibility
const content = message.content;
```

File-level constants use SCREAMING_SNAKE_CASE:
```typescript
export const MAX_RETRY_COUNT = 3;
export const DEFAULT_TIMEOUT_MS = 5000;
export const BASIC_TABLE: TableProps = {...};
```

Exceptions: React APIs (Context, memo, forwardRef), functions (camelCase), classes and Zod schemas (PascalCase)

No magic numbers, strings, or booleans:
```typescript
// Good - extract as named constants
const MAX_RETRY_COUNT = 3;
const DEFAULT_TIMEOUT_MS = 5000;
const INITIAL_OFFSET = 0;

if (retries < MAX_RETRY_COUNT) {
  setTimeout(retry, DEFAULT_TIMEOUT_MS);
}

// Bad - magic values
if (retries < 3) {
  setTimeout(retry, 5000);
}
```

Exception: `0` is acceptable for array indices, counters, and mathematical operations unless it represents a configurable default value or parameter.

No Hungarian notation prefixes:
```typescript
// Good
type ErrorCode = string;
interface UserData {...}

// Bad - avoid T/I prefixes
type TErrorCode = string;
interface IUserData {...}
```

Generic type parameters use full descriptive names:
```typescript
// Good - full names
type ParserResult<Data, Metadata> = ...;
type QueryState<Response, Error> = ...;

// Bad - single letters
type ParserResult<D, M> = ...;
type QueryState<R, E> = ...;
```

All interfaces must be flat - avoid nested interface definitions:
```typescript
// Good - separate flat interfaces
interface ResultMetadata {
  count: number;
  timestamp: string;
}

interface Result {
  data: string;
  metadata: ResultMetadata;
}

// Bad - nested interface definition
interface Result {
  data: string;
  metadata: {
    count: number;
    timestamp: string;
  };
}
```

### Modern Syntax

- Array indexing: `.at(0)` instead of `[0]`, `.at(-1)` for last element
- Type narrowing: `switch` with discriminated unions, not type assertions
- Type guards: Use `instanceof`, `typeof`, `in`, or Zod schemas instead of `as` casting
- Zod schemas: Prefer `schemas.ts` files, derive types with `z.infer`, use `.parse()` to avoid `as` casting
- Zod V4: Check https://zod.dev for documentation

Avoid `as` casting wherever possible:
```typescript
// Good - use instanceof for built-in types
if (isErr(result) && result.error instanceof Error) {
  console.log(result.error.message);
}

// Good - use Zod schema for complex runtime type validation
const customErrorSchema = z.object({
  code: z.string(),
  message: z.string(),
});

if (isErr(result)) {
  const parsed = customErrorSchema.safeParse(result.error);
  if (parsed.success) {
    console.log(parsed.data.code, parsed.data.message);
  }
}

// Good - define is predicate for simple cases
const isCustomError = (value: unknown): value is {code: string; message: string} =>
  typeof value === 'object' &&
  value !== null &&
  'code' in value &&
  'message' in value;

// Bad - avoid as casting
const error = result.error as Error;
console.log(error.message);
```

### Unicode Characters

Use these specific characters in console output, logs, comments, and test assertions:

```
success: ✓
failure: ×
warning: ⚠
info: ⓘ
arrow_right: →
arrow_left: ←
arrow_up: ↑
arrow_down: ↓
```

Never use emoji variants (✅, ❌) or alternative unicode characters (✗, ✕, ☑, ✔).

### Documentation Style

All documentation must be:
- Brief: No superfluous text or formatting
- Concise: Highest signal-to-noise ratio
- Precise: Exact terminology, no ambiguity
- Effective: Actionable information only

Follow the style of this file and @docs/ERROR_HANDLING.md: direct statements, minimal examples, no filler.

Code examples in documentation (JSDoc, README, .md files) must follow all code style conventions: arrow functions, no spaces in curly braces, no single-line blocks, British spelling, etc.

Never reference explicit values in JSDoc comments - values may change and cause documentation drift.

## File Organisation

### Naming Conventions

Component files: `PascalCase.tsx`
Utility files: `camelCase.ts`
UI components (shadcn): `kebab-case.tsx` in `src/ui/primitives/` only
Test files: `ComponentName.spec.tsx`
Fixtures: `ComponentName.fixtures.ts`

Next.js special files keep lowercase: `page.tsx`, `layout.tsx`, `route.ts`, `error.tsx`, `loading.tsx`, `not-found.tsx`, `template.tsx`

Run `npm run lint` to verify compliance.

### Testing

Files with tests use directory structure:

```
functionName/
├── index.ts                   # export {functionName} from './functionName';
├── functionName.ts            # Implementation
├── functionName.spec.ts       # Tests
└── functionName.fixtures.ts   # Fixtures (optional)
```

Test limit/capacity values using module constants, not magic numbers:

```typescript
import {MAX_BATCH_SIZE} from '../embedder';

// Good
const data = createData(MAX_BATCH_SIZE + 1);

// Bad
const data = createData(101);
```

### Barrel Files

Index files contain exports only, no implementation:

```typescript
export {buildRenderTree} from './buildRenderTree';
export {extractColumns, bindData} from './binding';
```

### Import Order

All imports use the `@sigil/*` alias (maps to project root).

Order:
1. Third-party packages
2. Internal `@sigil/*` imports
3. Parent imports by depth (`../../../`, `../../`, `../`)
4. Sibling imports (`./`)
5. CSS imports

Separate `import type` statements on their own lines. Alphabetise within groups.

Example:
```typescript
import {useState} from 'react';
import {z} from 'zod';

import type {Analysis} from '@sigil/src/common/types/analysisSchema';
import {analysisSchema} from '@sigil/src/common/types/analysisSchema';
import {formatData} from '@sigil/src/data/formatters';

import {helperFunc} from '../../../utils';

import {localHelper} from './helpers';
```

Run `npm run lint -- --fix` to auto-fix violations.

## Development Approach

This is an internal development project, not a library or production system:

- Delete duplicate or consolidated code directly, no deprecation warnings
- Internal APIs can change freely without maintaining backwards compatibility
- Refactor aggressively to improve code quality

## Tech Stack

- Next.js 15 (App Router, Turbopack)
- shadcn/ui with Tailwind CSS v4
- Claude Agent SDK (`@anthropic-ai/claude-agent-sdk`)
- Parsers: papaparse, js-yaml, fast-xml-parser

## Commands

```bash
npm run dev    # Development server
npm run build  # Production build
npm run lint   # ESLint
```
