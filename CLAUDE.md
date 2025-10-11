# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Sigil is an AI-native data analysis tool built with Next.js 15, designed to automatically detect and parse various data formats (JSON, CSV, YAML, XML) and display them in a clean interface.

## Development Commands

```bash
npm run dev        # Start development server with Turbopack
npm run build      # Production build with Turbopack
npm start          # Start production server
npm run lint       # Run ESLint
```

## Tech Stack

- **Framework**: Next.js 15 (App Router, Turbopack)
- **UI**: shadcn/ui with Tailwind CSS v4, dark theme by default
- **AI Integration**: Claude Agent SDK (`@anthropic-ai/claude-agent-sdk`)
- **Parsers**: papaparse (CSV), js-yaml (YAML), fast-xml-parser (XML)

## Architecture

### Data Flow

The application follows a unidirectional data flow:

1. **Input** (`components/DataInput.tsx`): Client component with textarea that captures user input
2. **Detection** (`lib/formatDetector.ts`): Attempts to parse input in order: JSON → XML → CSV → YAML
3. **Parsing** (`lib/parsers.ts`): Individual parser functions for each format
4. **Display** (`components/DataCanvas.tsx`): Renders parsed data as pretty-printed JSON

State management happens at the root page level (`app/page.tsx`) using React hooks, passing detection results from DataInput to DataCanvas via callbacks.

### Format Detection Logic

**Critical ordering**: Format detection tries parsers in a specific sequence because some parsers (especially YAML) are permissive and may incorrectly match other formats.

Detection order in `lib/formatDetector.ts`:
1. JSON (strict, fails fast)
2. XML (moderate strictness)
3. CSV (moderate strictness)
4. YAML (very permissive, catches most text)

**Parser validation rules** (`lib/parsers.ts`):
- All parsers return `null` on failure (never `undefined` or empty objects)
- Empty objects `{}` are treated as parse failures
- Empty arrays `[]` are treated as parse failures for CSV
- This prevents false positives where parsers succeed with meaningless results

### API Routes

- `/app/api/analyse/route.ts`: Placeholder for future Claude Agent SDK integration (not yet implemented)

## Configuration

- **Environment**: `.env.local` requires `ANTHROPIC_API_KEY` (currently unused, placeholder for future AI features)
- **Import alias**: `@sigil/*` maps to project root (use this for all internal imports, NOT `@/`)
- **Theme**: Dark mode enforced via `className="dark"` on `<html>` element in `app/layout.tsx`

## File Naming Conventions

**CRITICAL**: All file and folder names MUST follow these conventions (enforced by ESLint):

### Component Files
- **React components**: `PascalCase.tsx` (e.g., `DataInput.tsx`, `DataCanvas.tsx`)
- **UI components** (shadcn/ui): `kebab-case.tsx` in `components/ui/` only (e.g., `button.tsx`, `card.tsx`)
- **Test files**: `ComponentName.spec.tsx` (PascalCase with `.spec` suffix)
- **Fixture files**: `ComponentName.fixtures.tsx` (PascalCase with `.fixtures` suffix)

### Non-Component Files
- **Utilities**: `camelCase.ts` (e.g., `utils.ts`, `formatDetector.ts`)
- **Type definitions**: `camelCase.ts` (e.g., `types.ts`)
- **Library files**: `camelCase.ts` in `lib/` directory

### Folders
- **Component folders**: `PascalCase` (except `ui/`)
- **Common directories**: `common/` (lowercase)
- **UI directory**: `ui/` (lowercase, for shadcn/ui components)

### Next.js Special Files (Exceptions)
These files MUST keep their required lowercase names:
- `page.tsx`, `layout.tsx`, `route.ts`, `error.tsx`, `loading.tsx`, `not-found.tsx`, `template.tsx`

**Run `npm run lint` after creating new files to verify compliance.**

## Key Constraints

- CSV parser uses `header: true` and `dynamicTyping: true` - assumes first row is headers
- XML parser preserves attributes with `@_` prefix
- Client components are explicitly marked with `'use client'` directive (DataInput, root page)

## Code Style Guidelines

### Query State Management

**CRITICAL**: All async request/response states MUST use the `QueryState` type from `lib/queryState.ts`.

Use these string literal values to represent query states:
- `'idle'` - Query has not been called yet (initial state)
- `'loading'` - Query is in progress, awaiting data (first fetch)
- `'success'` - Query completed successfully
- `'errored'` - Query completed with an error
- `'reloading'` - Data is being refetched after a previous successful fetch

**Example usage:**
```typescript
import { QueryState } from '@sigil/lib/queryState';

const [queryState, setQueryState] = useState<QueryState>('idle');

// Starting a fetch
setQueryState('loading');

// On success
setQueryState('success');

// On error
setQueryState('errored');

// Refetching after previous success
setQueryState('reloading');
```

**Never use:**
- Boolean flags like `isLoading`, `isError`, `isSuccess`
- Generic state strings that don't match the standard values
- Numeric state codes

This ensures consistent state management across all async operations in the application.

### Code Formatting

**Arrow functions only**: All functions MUST use arrow function syntax with `const`. Function declarations are prohibited.
```typescript
// ✓ Correct
const myFunc = (x: number) => x * 2;
export const handleClick = () => {...};

// × Wrong
function myFunc(x: number) { return x * 2; }
export function handleClick() {...}
```

**No spaces in curly braces**: Object destructuring, imports, and literals have no internal spacing.
```typescript
// ✓ Correct
import {useState} from 'react';
const {data, error} = result;
const obj = {key: 'value'};

// × Wrong
import { useState } from 'react';
const { data, error } = result;
const obj = { key: 'value' };
```

### Import Organisation

**CRITICAL**: All imports MUST follow this ordering (enforced by ESLint):

1. Third-party packages (e.g., `react`, `@anthropic-ai/sdk`, `zod`)
2. Blank line
3. Internal `@sigil/*` imports
4. Blank line
5. Parent imports by depth (`../../../..`, `../../..`, etc.)
6. Blank line
7. Sibling imports (`./`)
8. Blank line
9. CSS imports

**Type imports**: Use `import type {X}` on separate lines. Type imports are grouped with their corresponding module imports.

**Example:**
```typescript
import type {ReactNode} from 'react';
import {useState} from 'react';
import {z} from 'zod';

import {analysisSchema} from '@sigil/lib/analysisSchema';
import type {Analysis} from '@sigil/lib/analysisSchema';
import {formatData} from '@sigil/lib/formatters';

import {helperFunc} from '../../../utils';

import {localHelper} from './helpers';
```

Imports are alphabetised within each group.

**Run `npm run lint -- --fix` to auto-fix import ordering violations.**

### Zod Version

- This project uses Zod V4 - check https://zod.dev for documentation and/or https://zod.dev/api for the API specification when you need context.

### Modern JavaScript Syntax

**Use modern ES2022+ features:**
- Array indexing: `.at(0)` instead of `[0]`, `.at(-1)` for last element
- Type narrowing: Use `switch` statements with discriminated unions, not type assertions

### Barrel Files

**Index files (`index.ts`) are export-only:** Barrel files should only contain `export` statements, no implementation logic. Each function/class should have its own file.

```typescript
// ✓ Correct - index.ts
export {buildRenderTree} from './buildRenderTree';
export {extractColumns, bindData} from './binding';

// × Wrong - index.ts
export const buildRenderTree = () => { /* implementation */ };
```

### Error Handling

**CRITICAL**: Use the `Result<T, E>` type from `lib/errors/result.ts` for all operations that may fail.

**Never throw exceptions for expected errors.** Use Result types instead:

```typescript
import {err, ok, type Result} from '@sigil/lib/errors/result';

// ✓ Correct - Return Result type
const parseData = (input: string): Result<Data, string> => {
  if (!input) {
    return err('Input cannot be empty');
  }
  return ok(parsedData);
};

// × Wrong - Throwing exceptions
const parseData = (input: string): Data => {
  if (!input) {
    throw new Error('Input cannot be empty');
  }
  return parsedData;
};
```

**When to use Result vs throw:**
- **Use Result**: Expected errors (validation, parsing, not found, user input errors)
- **Use throw**: Unexpected errors (programming errors, assertion failures, impossible states)

**Result utilities available:**
- `ok(data)` - Create successful result
- `err(error)` - Create error result
- `mapResult()` - Transform success value
- `mapError()` - Transform error value
- `chain()` - Compose operations that return Results
- `unwrapOr()` - Extract value with default
- `unwrapOrElse()` - Extract value with error handler
- `all()` - Combine multiple Results
- `isOk()` / `isErr()` - Type guards

## Refactoring Guidelines

**IMPORTANT**: This is an internal development project, not a library or production system:
- **No deprecation needed**: When consolidating or removing duplicate code, delete it directly without deprecation warnings
- **No backward compatibility**: Internal APIs can be changed freely without maintaining backwards compatibility
- **Prefer clarity over compatibility**: Refactor aggressively to improve code quality without worrying about breaking changes

## Unicode Character Usage

**CRITICAL**: Always use these specific unicode characters for checks and crosses:
- **Check/success**: `✓` (U+2713) - NOT ✅ or ☑
- **Cross/error**: `×` (U+00D7) - NOT ❌ or ✗

**Usage:**
- Console output for success/failure states
- Logger messages
- Test assertions
- Documentation examples
- Comments indicating correctness

**Never use:**
- Emoji variants (✅, ❌)
- Alternative unicode crosses (✗, ✕)
- Alternative unicode checks (☑, ✔)

This ensures consistent, clean output across terminals and maintains a professional appearance in logs and documentation.