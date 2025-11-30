---
name: coding-standards
description: Defines code standards for the Sigil project. Applies when implementing features, reviewing commits, or answering questions about project conventions. Covers architectural philosophy, error handling, type discipline, naming, code style, file organisation, and React patterns.
---

# Code Standards

Standards for Sigil development. Concise, precise, effective. Maximum signal, minimum noise.

## When to Use

Apply these standards when implementing new code, reviewing commits, refactoring existing code, or answering questions about project conventions. For code review specifically, the Review Checklist at the end provides a quick reference for common issues to flag.

## Meta-Rules

Preferences yield to functional reasons—if there's genuine technical need for an alternative approach, don't block it. However, deviations should be explicit and justified.

This is not a versioned public API. Make clean breaking changes freely; no deprecation warnings, no backwards compatibility concerns. Address architectural debt proactively rather than letting it accumulate.

ESLint handles mechanical enforcement. These standards cover judgment calls—the decisions that require understanding intent, not just syntax.

Earn your complexity. Every abstraction, type, comment, file, and function should justify its existence. Question whether each addition clarifies intent or reduces duplication significantly; if not, inline it or delete it.

Run `npm run lint` and `npm run tsc` liberally.

## Architectural Philosophy

The IR (ComponentSpec) is the single source of truth for all UI state. No state exists independently of the IR. To change the UI, change the IR—changes propagate down through RenderTree to React components.

Flag any code that stores state in localStorage, modifies the RenderTree independently of the IR, or maintains UI state not reflected in ComponentSpec. The sole exception is ephemeral client-side state like pagination page numbers or scroll positions.

The IR is foundational but not infallible. If downstream code requires workarounds because the schema is deficient, open a conversation about modifying the schema rather than building on a shaky foundation. Changes should flow upstream when the upstream design is the problem.

Favour functional patterns by default. Classes are acceptable for builders or when encapsulation genuinely helps, but the default is functions and data.

Think in systems, not isolated solutions. Before implementing new logic, ask: does this already exist elsewhere? Where does this belong in the broader architecture? Solving problems in isolation leads to duplicate code and reinvented wheels. Prefer extending or reusing existing patterns over creating new ones.

## Error Handling

Result types everywhere. Import from `@sigil/src/common/errors/result`:

```typescript
import type {Result} from '@sigil/src/common/errors/result';
import {ok, err, isOk, isErr} from '@sigil/src/common/errors/result';
```

Reserve try-catch exclusively for third-party libraries that throw: JSON.parse on malformed input, jsonpath-plus on invalid paths, and network requests. Everything else uses Result types.

When returning errors, check if ERROR_CODES (in `@sigil/src/common/errors`) already covers the case. Naked string errors should be rare—if genuinely new, consider adding to error codes. SpecError is specifically for LLM feedback when ComponentSpec input is faulty; it's formatted for model consumption, not human debugging.

### Error Strategy Selection

Different pipeline stages demand different strategies. Use early return when subsequent processing depends on the current step succeeding—structure validation, component lookup, and resource resolution are fatal if they fail. Use error accumulation when you want to report multiple issues at once—data binding and child processing should continue through siblings even if one fails, collecting all errors for a complete picture.

The accumulation pattern:

```typescript
const errors: SpecError[] = [];
for (const child of children) {
  const result = process(child);
  if (isErr(result)) {
    errors.push(...result.error);
    continue;
  }
  processed.push(result.data);
}
return errors.length > 0 ? err(errors) : ok(processed);
```

### Two-Phase Processing

Complex transformations split into a validation phase that fails fast on structural errors, followed by a processing phase that accumulates errors:

```typescript
const validated = validateStructure(input);
if (isErr(validated)) {
  return validated;
}
const result = processValidated(validated.data);
```

This pattern applies throughout: renderer pipeline, parsers, agent execution loops.

## Type Discipline

Rigorous typing everywhere, even when complex. Use `interface` for object shapes and `type` for unions, aliases, and function signatures:

```typescript
interface ValidationResult {
  success: boolean;
  data: Output;
}

type QueryState<Data, Err> = IdleState | LoadingState | SuccessState<Data> | ErrorState<Err>;
type ValidatorFn<Out> = (output: Out) => Promise<void>;
```

Format unions multi-line with `|` prefix, discriminator field first:

```typescript
export type QueryState<Data, Err = Error> =
  | {status: 'idle'}
  | {status: 'loading'}
  | {status: 'success'; data: Data}
  | {status: 'error'; error: Err};
```

Forbidden practices: `as` casting for simplicity, `any` for convenience, `!` non-null assertion without guards, `null as never` to bypass type safety. Use instead: `satisfies` for type checking without widening, `instanceof`/`typeof`/`in` for narrowing, Zod schemas for runtime validation, and type predicates for custom guards.

Always use type guards over direct status checks:

```typescript
// Correct
if (isOk(result)) { ... }
if (isLoading(state)) { ... }

// Wrong
if (result.success) { ... }
if (state.status === 'loading') { ... }
```

Generic type parameters use descriptive names: `Data`, `Err`, `Output`—never single letters like `T`, `E`, `O`. Use `Err` rather than `Error` to avoid shadowing the built-in Error type.

Make invalid states unrepresentable. Use the type system to prevent bad states rather than checking at runtime:

```typescript
// Wrong: invalid state (verified without email) is representable
type User = {name: string; email: string | null; isVerified: boolean};

// Correct: type system enforces the invariant
type User =
  | {status: 'unverified'; name: string}
  | {status: 'verified'; name: string; email: string};
```

For unimplemented code paths, use runtime guards that fail fast with clear messages rather than type assertions that silently bypass safety:

```typescript
// Wrong
'hierarchy': null as never

// Correct
get 'hierarchy'(): never {
  throw new Error('HierarchyBuilder not yet implemented');
}
```

### Types and Schemas

Types that don't need runtime verification live in `types.ts`. Data needing runtime verification—external input, fetch responses, raw data—gets a Zod schema from the start in `schemas.ts`.

Schema file structure:

```typescript
/**
 * Module-level JSDoc describing schema purpose.
 */
import {z} from 'zod';

export const ThingSchema = z.object({
  name: z.string().describe('Human-readable name'),
  type: z.enum(['a', 'b']).describe('Type discriminator'),
});

export type Thing = z.infer<typeof ThingSchema>;
```

Schema naming follows `PascalCaseSchema`; the derived type follows immediately on the next line. Use `.describe()` on fields that become LLM tool inputs.

Implementation code always uses `.safeParse()` and wraps errors in Result:

```typescript
const parsed = ThingSchema.safeParse(input);
if (!parsed.success) {
  return err(parsed.error.message);
}
return ok(parsed.data);
```

Test code and build tooling may use `.parse()` since they control the data and prefer to fail fast.

When types accumulate: if few and not exported, keep them in the implementation file. If building up, move to `types.ts`. If `types.ts` becomes a dumping ground, split concerns into separate directories. Multiple complex functions with many types signals the need to split into separate files.

## Function Signatures

For parameter count: 1-2 parameters stay bare; 3+ parameters warrant an options object. Options objects are always the final parameter and named `{FunctionName}Options`. Keep parameter positions consistent across similar functions.

Prefer default parameters over nullish coalescing:

```typescript
// Preferred
const format = (value: string, precision: number = 2) => { ... }

// Avoid unless there's a functional reason
const format = (value: string, precision?: number) => {
  const p = precision ?? 2;
}
```

## Naming

Functions start with verbs indicating their behaviour. Common verbs (non-exhaustive):

| Verb | Meaning |
|------|---------|
| `extract` | Pull data from structure |
| `build` | Construct complex objects |
| `create` | Instantiate new objects |
| `format` | Transform for display |
| `parse` | Convert string to typed |
| `bind` | Map data to props |
| `query` | Search/retrieve data |
| `validate` | Check correctness |
| `walk` | Traverse recursively |
| `enrich` | Augment with metadata |
| `process` | Transform through pipeline |
| `get` | Retrieve/accessor |

Verb always comes first: `extractColumns`, never `columnsExtract`.

Factory functions follow distinct patterns: `create` + Type for lightweight wrapping (`createCustomValidator`), `build` + Type for multi-step assembly (`buildRenderTree`), `as` + Type for type coercion/adapters (`asSystemPromptFunction` wraps a function to match an expected signature).

Booleans read as questions using `is` for identity/equality and `has` for presence: `isDisabled`, `hasResponded`, `shouldClose`, `wasProcessed`. Never use `check` or `verify` prefixes. useState follows the same pattern: `[isOpen, setIsOpen]`.

File-level constants use `SCREAMING_SNAKE_CASE`. No Hungarian notation—`ErrorCode` not `TErrorCode`, `UserData` not `IUserData`.

The only allowed abbreviations are `fn`, `config`, `ctx`, `props`, and `ref`. Avoid all others.

Result variables follow the `[context]Result` pattern:

```typescript
const layoutResult = walkLayout(spec.layout);
const propsResult = builder.build(config, data);

if (isErr(layoutResult)) {
  return layoutResult;
}
```

Use plural for arrays, singular for items: `const columns: Column[]` and `for (const column of columns)`.

## Code Style

Arrow functions only for standalone functions—no traditional `function` keyword declarations. Class methods remain as methods. ES6 imports only—no `require()`, no dynamic imports. Async/await only—no `.then()` chains:

```typescript
// Correct
const response = await fetch(url);
const data = await response.json();

// Avoid
fetch(url).then(res => res.json()).then(data => ...);
```

No spaces in curly braces: `{useState}`, `{key: 'value'}`. No single-line blocks—always use braces on separate lines:

```typescript
if (condition) {
  doSomething();
}
```

Array access uses `.at(0)` and `.at(-1)`, not bracket notation or `arr.length - 1`. Prefer modern non-mutating array methods: `.toSorted()`, `.toReversed()`, `.toSpliced()`, `.with()`.

Comments describe the current state of the code, never its history or future plans:

```typescript
// Good: Content is an array of message blocks
// Bad: Content changed to array after refactoring
// Bad: TODO: refactor this later
```

Unicode characters in output use `✓ × ⚠ ⓘ → ← ↑ ↓`—never emoji variants like ✅ or ❌.

## JSDoc

Use multi-line format even for short descriptions:

```typescript
/**
 * Brief, precise description.
 */
```

Never compress to single-line `/** description */` format.

Each constant and interface field gets its own JSDoc—the purpose is enabling IntelliSense to show context when hovering anywhere in the codebase. Module-level JSDoc at the top of every file is recommended to provide orientation.

Keep documentation concise and precise. It should not reference specific values that might change. Examples are warranted only when complexity demands them; if many examples are needed, question why the function is so complex.

## Control Flow

Use switch statements with exhaustiveness checks for enums and string unions where all cases must be handled:

```typescript
const handle = (type: SomeUnion): Result => {
  switch (type) {
    case 'a':
      return handleA();
    case 'b':
      return handleB();
    default: {
      const _exhaustive: never = type;
      throw new Error(`Unhandled type: ${type}`);
    }
  }
};
```

The `never` assignment catches additions and removals at type-check time.

## File Organisation

The directory complexity threshold: if a module needs tests or has more than one file, promote it to a directory:

```
# Complex module (has tests)
moduleName/
├── index.ts              # Barrel exports only
├── moduleName.ts         # Implementation
├── moduleName.spec.ts    # Tests
├── moduleName.fixtures.ts
├── types.ts
├── schemas.ts
├── constants.ts
└── utils.ts

# Simple utility (no tests, single concern)
utilityName.ts
```

Barrel files contain exports only, never implementation. Constants files are named `constants.ts`, never `const.ts`. If constants are few and not exported, keep them in the implementation file. Logic shared across directories lives in a `common/` directory at the shared parent level.

### Imports

All imports use the `@sigil/*` alias (configured in tsconfig). Run `npm run lint -- --fix` to auto-organise import order.

Separate `import type` statements onto their own lines:

```typescript
import {useState} from 'react';

import type {Analysis} from '@sigil/src/types';
import {formatData} from '@sigil/src/utils';
```

For imports and exports, write `export type {Foo}` not `export {type Foo}`.

## Testing

Test files use `Name.spec.ts`; fixtures use `Name.fixtures.ts`. Fixtures reference module constants rather than magic numbers:

```typescript
import {MAX_BATCH_SIZE} from '../embedder';
const data = createData(MAX_BATCH_SIZE + 1);
```

Test error cases and edge cases, not just the happy path.

## React Components

Destructure props in the function signature:

```typescript
// Correct
const List = ({items, onSelect}: ListProps): ReactElement => { ... }

// Wrong
const List = (props: ListProps): ReactElement => {
  const {items} = props;
}
```

Props types are named `{ComponentName}Props`—no Hungarian notation like `IListProps`. Never use `React.FC` as it auto-injects children.

Presentational components use memo with displayName:

```typescript
const DataTableComponent = ({columns, data}: DataTableProps): ReactElement => { ... };

export const DataTable = memo(DataTableComponent);
DataTable.displayName = 'DataTable';
```

Accessibility is non-negotiable: WCAG AA and WAI-ARIA compliance. Apply ARIA attributes wherever applicable—roles (`role="table"`, `role="grid"`), states (`aria-expanded`, `aria-busy`), properties (`aria-label`, `aria-describedby`, `aria-errormessage`), relationships (`aria-controls`, `aria-labelledby`), grid/table attributes (`aria-colindex`, `aria-rowindex`), and live regions (`aria-live`, `aria-atomic`). Don't omit accessibility attributes where they can be sensibly applied.

## Code Review Process

When reviewing code, first obtain the diff. If a commit hash is provided, use it; otherwise default to uncommitted and unstaged changes. If there are no changes to review, ask for a commit hash or file path.

Calibrate review depth to change size: small fixes warrant standards compliance checks only; new features warrant full architectural review; refactors focus on pattern consistency and maintainability.

Beyond flagging violations, actively look for opportunities to consolidate duplicate logic, extract shared utilities, and simplify complex code. Ask whether new code could reuse existing patterns or whether similar logic elsewhere should be unified. These improvements strengthen the codebase even when nothing is technically wrong.

Present findings with file paths and line numbers. Use `×` for violations that must be fixed, `ⓘ` for suggestions to consider, and `✓` for positive observations:

```
× Result type missing for fallible operation
  path/to/module.ts:45
  Current: const data = JSON.parse(input)
  Required: Wrap in try-catch, return Result

ⓘ Consider extracting to shared utility
  path/to/module.ts:78-95
  Same validation pattern appears in three places

✓ Good use of discriminated union for ParseResult
```

## Review Checklist

When reviewing code, ask these questions: What happens if data is empty? What happens if data is malformed? What happens if this operation fails? Can this be extended without modification? Will someone understand this in a week?

Flag these issues:

- Result types missing for fallible operations
- Type safety bypasses without guards (`as`, `any`, `!`)
- Direct status checks instead of type guards
- Magic numbers or strings (extract to named constants)
- Comments describing past or future state
- Unnecessary abstractions that don't earn their complexity
- State stored outside the IR
- Missing ARIA attributes on interactive or semantic elements
- `.parse()` in implementation code (should be `.safeParse()`)
- Workarounds for IR deficiencies (consider schema changes instead)
