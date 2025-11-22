# Standards Reference

Quick reference for code review. Extracted from CLAUDE.md and ERROR_HANDLING.md.

## Error Handling

Must use Result<T, E> for:
- Validation failures
- Not found / missing data
- Parsing errors
- External API failures
- User input errors

Throw exceptions only for:
- Programming errors (null deref, index out of bounds)
- Type mismatches that should never occur
- Assertion failures

Check:
- Result<T, E> used for expected errors (ERROR_HANDLING.md § Decision Rules)
- Specific error types: Result<User, ValidationError>, not Result<User, string>
- isOk/isErr type guards used, not result.success
- No Results wrapped in try-catch
- No throwing from functions that return Result
- SpecError[] used for renderer/tool errors with code, severity, category, path, suggestion
- Error accumulation in pipelines (collect all errors, continue where possible)

## Type Safety

Check:
- No any usage without explicit justification
- No as casting - use instanceof, typeof, in, or Zod schemas
- No type safety bypasses (null as never, ! operator without guards)
- Generic parameters use full descriptive names (Data, Error not D, E)
- All interfaces flat, no nested definitions
- Zod schemas in schemas.ts files, types derived with z.infer

Runtime guards for unimplemented code:
```typescript
// Wrong: bypasses type safety
'hierarchy': null as never

// Correct: fails fast with clear message
get 'hierarchy'(): never {
  throw new Error('HierarchyBuilder not yet implemented');
}
```

## Code Style

Check:
- Arrow functions only
- No spaces in curly braces: {useState}, {key: 'value'}
- No single-line blocks
- File-level constants use SCREAMING_SNAKE_CASE
- No magic numbers/strings/booleans (extract as named constants)
- 0 acceptable only for array indices, counters, maths (unless configurable)
- No Hungarian notation (T/I prefixes)
- Array access uses .at(0), .at(-1)
- Comments describe code as it exists, not change history
- Unicode: ✓ × ⚠ ⓘ → ← ↑ ↓ (never emoji variants)

## Imports

Check:
- All imports use @sigil/* alias
- Order: third-party, @sigil/*, parent (by depth), sibling, CSS
- import type on separate lines
- Alphabetised within groups

## File Organisation

Check:
- Component files: PascalCase.tsx
- Utility files: camelCase.ts
- Test files: ComponentName.spec.ts
- Fixtures: ComponentName.fixtures.ts
- Barrel files (index.ts) contain exports only, no implementation
- Tests use directory structure with index.ts

## Testing

Check:
- Test files exist for new functionality
- Fixtures use module constants, not magic numbers
- Tests cover error cases, not just happy path
- Edge cases identified and tested

## Documentation

Check:
- JSDoc for exported functions
- No reference to explicit values (causes drift)
- Code examples follow all style conventions
- Documentation matches implementation (no claims code doesn't support)
- Brief, concise, precise, effective (no filler)

## Architectural Soundness

Check:
- Change fits wider system architecture
- No duplicate logic (consolidate or justify)
- Clear separation of concerns
- Extensible design (adding new cases doesn't require editing existing logic)
- Error cases considered and handled
- Edge cases identified (document or handle)
- Type safety maintained (no bypasses without guards)
- Consistent with established patterns

Questions to ask:
- What happens if this data is empty?
- What happens if this data is malformed?
- What happens if this operation fails?
- Can this be extended without modification?
- Is this documented if non-obvious?
- Will someone understand this in a week?

## Production-Grade Thinking

Check:
- No TODO comments for critical functionality
- No console.log left in (use logger)
- No hardcoded values that should be configurable
- Clear error messages (include context, not just "error")
- Defensive code where appropriate (guard clauses, validation)
- Performance considered (unnecessary loops, inefficient algorithms)
- Memory considered (large arrays, unbounded growth)

## Common Violations

Type safety bypasses:
- as casting without validation
- ! operator without null checks

Documentation mismatches:
- Code doesn't support documented patterns
- Regex too strict for documented examples
- Missing edge cases in implementation

Extensibility issues:
- Hardcoded lists requiring modification to extend
- Logic buried in wrong abstraction level
- Dispatch logic using .some() when .every() needed

Pattern inconsistencies:
- Mix of Result and throwing in same module
- Mix of any and strict types
- Mix of styles (arrow vs function, spacing)
