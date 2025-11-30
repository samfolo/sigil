# Code Review

## Process

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

## Checklist

When reviewing code, ask these questions: What happens if data is empty? What happens if data is malformed? What happens if this operation fails? Can this be extended without modification? Will someone understand this in a week?

Flag these issues:

- Result types missing for fallible operations
- Type safety bypasses without guards—`as`, `any`, non-null assertion (!)
- Direct status checks instead of type guards
- Magic numbers or strings (extract to named constants)
- Mutable bindings (`let`) that could be restructured as `const`
- Multiple `.find()` calls that should be single-pass iteration
- Inline type literals in function signatures
- Arrays of objects that should be `Record<UnionType, Value>`
- Comments describing past or future state
- Unnecessary abstractions that don't earn their complexity
- State stored outside the IR
- Missing ARIA attributes on interactive or semantic elements
- `.parse()` in implementation code (should be `.safeParse()`)
- Workarounds for IR deficiencies (consider schema changes instead)
