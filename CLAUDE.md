# CLAUDE.md

Guidance for Claude Code when working with this repository.

## Commands

```bash
npm run dev      # Development server
npm run build    # Production build
npm run lint     # ESLint (add --fix to auto-fix)
npm run tsc      # Type check
npm run test     # Run all tests
```

## Tech Stack

Next.js 15 (App Router, Turbopack), React, TypeScript, Tailwind CSS v4, shadcn/ui, Anthropic SDK.

Parsers: papaparse (CSV), js-yaml (YAML), fast-xml-parser (XML).

## Skills

Consult **coding-standards** when implementing features, reviewing code, or refactoring. Contains detailed guidance on type discipline, naming conventions, code style, React patterns, and review checklists.

Consult **writing-unit-tests** when writing or modifying tests. Contains patterns for fixtures, mocks, type safety in tests, and test utilities.

## Error Handling

Consult @docs/ERROR_HANDLING.md before writing error handling code.

Use `Result<T, E>` for all expected errors:

```typescript
import type {Result} from '@sigil/src/common/errors/result';
import {ok, err, isOk, isErr} from '@sigil/src/common/errors/result';
```

Decision: Expected errors (validation, not found, parsing) → `Result`. Programming errors → throw.

## Async State

Use `QueryState` for request/response state:

```typescript
import type {QueryState} from '@sigil/src/common/types/queryState';

const [state, setState] = useState<QueryState<Data, Error>>({status: 'idle'});
```

## Imports

All imports use `@sigil/*` alias. Separate `import type` onto its own line, even when importing from the same path:

```typescript
import type {AgentError, SpecError} from '@sigil/src/common/errors';
import {ok, err} from '@sigil/src/common/errors';
```

Import order: third-party → `@sigil/*` → parent (`../`) → sibling (`./`) → CSS. Run `npm run lint -- --fix` to auto-organise.

## File Naming

| Type | Convention | Example |
|------|------------|---------|
| Components | PascalCase.tsx | `DataTable.tsx` |
| Utilities | camelCase.ts | `formatDate.ts` |
| Tests | Name.spec.ts | `DataTable.spec.ts` |
| Fixtures | Name.fixtures.ts | `DataTable.fixtures.ts` |
| Schemas | schemas.ts | `schemas.ts` |
| Types | types.ts | `types.ts` |
| shadcn/ui | kebab-case.tsx | `src/ui/primitives/button.tsx` |

Next.js special files: `page.tsx`, `layout.tsx`, `route.ts`, `error.tsx`, `loading.tsx`

## Documentation Style

All documentation must be:

- **Brief**: No superfluous text or formatting
- **Concise**: Highest signal-to-noise ratio
- **Precise**: Exact terminology, no ambiguity
- **Effective**: Actionable information only

Follow the style of this file and @docs/ERROR_HANDLING.md: direct statements, minimal examples, no filler.

Code examples in documentation must follow all code style conventions. Never reference explicit values in JSDoc comments—values may change and cause documentation drift.

## Development Approach

This is an internal project. Refactor aggressively, delete freely, no deprecation warnings needed. Internal APIs change without backwards compatibility concerns.
