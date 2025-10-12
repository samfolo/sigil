# CLAUDE.md

Guidance for Claude Code when working with this repository. Ordered by decision frequency: patterns used in every file first, organisational rules second, reference material last.

## Core Patterns

### Error Handling

MANDATORY: Consult @ERROR_HANDLING.md before writing any error handling code.

Use `Result<T, E>` from @lib/errors/result.ts for ALL expected errors.

Decision rule:
- Expected errors (validation, not found, parsing) → Return `Result<T, E>`
- Programming errors (null deref, type mismatch) → Throw exception

```typescript
import type {Result} from '@sigil/lib/errors/result';
import {ok, err} from '@sigil/lib/errors/result';

const parse = (input: string): Result<Data, string> => {
  if (!input) {
    return err('Input cannot be empty');
  }

  // Parse logic...

  return ok(parsedData);
};
```

See @ERROR_HANDLING.md for complete decision flowchart, utility functions (mapResult, chain, all), and type patterns.

### State Management

All async request/response states use `QueryState` from `lib/queryState.ts`:

```typescript
import {QueryState} from '@sigil/lib/queryState';

const [state, setState] = useState<QueryState>('idle');
```

Valid states: `'idle'` | `'loading'` | `'success'` | `'errored'` | `'reloading'`

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

File-level constants use SCREAMING_SNAKE_CASE:
```typescript
export const MAX_RETRY_COUNT = 3;
export const DEFAULT_TIMEOUT_MS = 5000;
export const BASIC_TABLE: TableProps = {...};
```

Exceptions: React APIs (Context, memo, forwardRef), functions (camelCase), classes (PascalCase)

### Modern Syntax

- Array indexing: `.at(0)` instead of `[0]`, `.at(-1)` for last element
- Type narrowing: `switch` with discriminated unions, not type assertions
- Zod V4: Check https://zod.dev for documentation

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

## File Organization

### Naming Conventions

Component files: `PascalCase.tsx`
Utility files: `camelCase.ts`
UI components (shadcn): `kebab-case.tsx` in `components/ui/` only
Test files: `ComponentName.spec.tsx`
Fixtures: `ComponentName.fixtures.ts`

Next.js special files keep lowercase: `page.tsx`, `layout.tsx`, `route.ts`, `error.tsx`, `loading.tsx`, `not-found.tsx`, `template.tsx`

Run `npm run lint` to verify compliance.

### Test Structure

Files with tests use directory structure:

```
functionName/
├── index.ts                   # export {functionName} from './functionName';
├── functionName.ts            # Implementation
├── functionName.spec.ts       # Tests
└── functionName.fixtures.ts   # Fixtures (optional)
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

import type {Analysis} from '@sigil/lib/analysisSchema';
import {analysisSchema} from '@sigil/lib/analysisSchema';
import {formatData} from '@sigil/lib/formatters';

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
