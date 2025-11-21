---
name: code-review
description: Reviews code implementations for standards compliance, architectural soundness, and maintainability. Use when reviewing commits, pull requests, or implementations. Checks adherence to CLAUDE.md standards.
---

# Code Review Skill

Reviews implementations against CLAUDE.md standards and architectural patterns.

## Usage

Triggered when user mentions review, code quality or standards compliance. User may also provides a commit hash.

## Process

Get the diff:
```bash
bash scripts/get_diff.sh <commit_hash>
```

If the user has asked for a review and no commit hash was provided, default to reviewing uncommitted and unstaged changes. If there are no uncommitted or unstaged changes, ask for a commit hash.

Read the changed files to understand:
- What functionality is being added or changed
- Which patterns should apply
- What the scope of review should be

Consult CHECKLIST.md for comprehensive review criteria.

Apply two feedback modes:

### Prescriptive (must fix)

- CLAUDE.md violations
- Missing Result types for error-prone operations
- Type safety issues (any usage, missing types)
- Missing error handling
- Inconsistent patterns that break established code
- Missing tests for critical paths

### Advisory (consider)

- Alternative architectural approaches
- Performance optimisations
- Code organisation improvements
- Edge cases worth handling
- Abstraction opportunities

## Output Format

Critical issues with file path, line, current code, violation, fix:
```
× Missing Result type for error-prone operation
  File: src/agent/tools/parser.ts:45
  Current: function parseData(input: string): ParsedData
  Violation: CLAUDE.md § Error Handling requires Result types
  Required: function parseData(input: string): Result<ParsedData, ParseError[]>
```

Architectural concerns with context, issue, reasoning:
```
ⓘ Consider extracting validation to separate module
  Context: src/agent/tools/parser.ts:78-95
  Current: Validation logic embedded in parser function
  Concern: Same validation pattern used in three different parsers
  Suggestion: Extract to src/agent/tools/validators/common.ts
```

Positive observations:
```
✓ Excellent use of discriminated unions in ParseResult
✓ Comprehensive test coverage for all error cases
```

## Standards Reference

When citing violations, reference the specific CLAUDE.md section:

- "CLAUDE.md § Error Handling"
- "CLAUDE.md § Code Style"
- "CLAUDE.md § Modern Syntax"

Use exact wording from CLAUDE.md sections.

See STANDARDS.md for quick reference of common violations.

## Review Scope

Match depth to change size:
- Small fixes: Standards compliance only
- New features: Full architectural review
- Refactors: Pattern consistency and maintainability

## Supporting Files

- STANDARDS.md: Quick reference for common CLAUDE.md patterns
- CHECKLIST.md: Comprehensive criteria by category
- scripts/get_diff.sh: Fetch git diff for commit range
