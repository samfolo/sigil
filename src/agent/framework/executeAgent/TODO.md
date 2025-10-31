# Two-Tier State Architecture Implementation

## Problem

Current single-tier state resets on each retry attempt. This causes:
- Wasteful re-execution of expensive operations (parsing, API calls)
- No way to track execution-level metrics across attempts
- Model relies on conversation history instead of structured state for cross-attempt context

Conversation history persists but structured state doesn't, creating asymmetry.

## Solution

Implement mandatory two-tier state structure:
- `execution`: Persists across retry attempts (expensive computations, metrics)
- `attempt`: Resets on validation failure (working state, disposables)

Framework-opinionated: Handlers explicitly decide which tier to update. Tool descriptions explain persistence semantics to model.

## Edge Cases & Defaults

If `initialExecutionState` not provided: Default to `(input) => ({})`
If `initialAttemptState` not provided: Default to `(input, exec, attempt) => ({})`
Both optional but result in empty state objects if omitted.

Input type remains separate from state types. Input is transformed into execution/attempt states via initializers.

## Type System Changes

File: `src/agent/framework/defineAgent/types.ts`

Add AgentState interface:
```typescript
export interface AgentState<Exec, Attempt> {
  execution: Exec;
  attempt: Attempt;
}
```

Update ToolReducerHandler signature:
- From: `<State>`
- To: `<Exec, Attempt>`
- State parameter becomes: `AgentState<Exec, Attempt>`
- Return type becomes: `{newState: AgentState<Exec, Attempt>; toolResult: unknown}`

File: `src/agent/framework/defineAgent/defineAgent.ts`

Update AgentDefinition generics:
- From: `<Input, Output, State = Input>`
- To: `<Input, Output, Exec, Attempt>`

Replace single initialState with two functions:
```typescript
initialExecutionState?: (input: Input) => Exec;
initialAttemptState?: (input: Input, executionState: Exec, attemptNumber: number) => Attempt;
```

Update dependent type generics:
- ToolsConfig: From `<Output, State>` to `<Output, Exec, Attempt>`
- HelperToolConfig: From `<Name, State, ToolInput>` to `<Name, Exec, Attempt, ToolInput>`

Update defineAgent function:
- Signature: From `<Input, Output, State = Input>` to `<Input, Output, Exec, Attempt>`
- Parameter: `AgentDefinition<Input, Output, Exec, Attempt>`
- Return: `Readonly<AgentDefinition<Input, Output, Exec, Attempt>>`

## Execution Logic Changes

File: `src/agent/framework/executeAgent/executeAgent.ts`

Current behaviour (line 522-523): State initialized inside attempt loop, resets each attempt.

Concrete transformations:

**Line ~520 (before attempt loop):**
```typescript
// ADD: Initialize execution state once
const executionState = agentConfig.initialExecutionState?.(input) ?? {} as Exec;
```

**Line ~522-523 (inside attempt loop):**
```typescript
// REPLACE: const currentState = agentConfig.initialState?.(input) ?? input as State;
// WITH:
const attemptState = agentConfig.initialAttemptState?.(input, executionState, attempt) ?? {} as Attempt;
let currentState: AgentState<Exec, Attempt> = {execution: executionState, attempt: attemptState};
```

**Line ~857 (after tool handler execution, inside iteration loop):**
```typescript
// EXISTING: currentState = handlerResult.data.newState;
// Keep this - it updates the combined state
```

**End of iteration loop (before validation check):**
```typescript
// ADD: Persist execution state updates back to outer scope
Object.assign(executionState, currentState.execution);
```

Key insight: executionState lives outside attempt loop, gets updated via Object.assign after each iteration. attemptState recreated fresh each attempt.

## Test Fixtures Changes

File: `src/agent/framework/executeAgent/__tests__/reducer.fixtures.ts`

Create separate Input and State types:
```typescript
// Input type (what tests pass to agent)
interface StatefulAgentInput {
  data: string;
}

// Execution state type (persists across attempts)
interface ExecutionState {
  rawData: string;
  parsedData?: unknown;
}

// Attempt state type (resets on retry)
interface AttemptState {
  callCount: number;
}
```

Update all handlers (mockParseReducerHandler, mockQueryReducerHandler, mockTransformReducerHandler, mockThrowingReducerHandler):
- Parameter: `state: AgentState<ExecutionState, AttemptState>`
- Return: `newState: {execution: {...}, attempt: {...}}`
- Parse result → execution.parsedData (persists)
- Call counter → attempt.callCount (resets)

Update STATEFUL_AGENT generic parameters:
- From: `AgentDefinition<StatefulAgentInput, StatefulTestOutput, StatefulAgentInput>`
- To: `AgentDefinition<StatefulAgentInput, StatefulTestOutput, ExecutionState, AttemptState>`

Update STATEFUL_AGENT initializers:
- Add initialExecutionState: `(input) => ({rawData: input.data, parsedData: undefined})`
- Add initialAttemptState: `(input, exec, attemptNum) => ({callCount: 0})`
- Remove old initialState field

Update tool descriptions to explain persistence:
```
PERSISTENCE: Parsed data stored at EXECUTION level (survives retries).
Call count stored at ATTEMPT level (resets on retry).
```

Update MOCK_THROWING_TOOL similarly.

## Test Suite Changes

File: `src/agent/framework/executeAgent/__tests__/reducer.spec.ts`

Delete: "should reset state between retry attempts" test (lines 657-720) - broken, mock system doesn't properly simulate attempt boundaries.

Systematic test updates (apply these grep replacements):
1. State access in handler tests: `\.parsedData` → `.execution.parsedData`
2. State access in handler tests: `\.callCount` → `.attempt.callCount`
3. Input construction: Keep `const input: StatefulAgentInput = {data: '...'}`
4. newState access in assertions: `newState\.parsedData` → `newState.execution.parsedData`
5. newState access in assertions: `newState\.callCount` → `newState.attempt.callCount`

Handler unit tests (lines ~182-240):
- Update parameter access patterns in assertions
- mockParseReducerHandler results check execution.parsedData
- Immutability test checks both state.execution and state.attempt unchanged

Integration tests:
- getToolResult() extracts from toolResult (unchanged)
- State is internal to handlers, tests verify via toolResult downstream effects

Update "Custom Initial State" test (lines ~562-611):
- Change to: initialExecutionState sets execution.parsedData
- Verify query succeeds without parse (proves execution state used)
- Don't need to verify function calls (implementation detail)

Add new test (optional, if mock system supports it): "should preserve execution state across retries"
- Attempt 1: parse + invalid validation
- Attempt 2: query without parse succeeds
- Only add if confident mocks simulate attempt boundaries correctly

## Testing Strategy

Incremental verification (run after each step):
1. After types.ts: `npx tsc --noEmit` - expect errors in defineAgent.ts (not updated yet)
2. After defineAgent.ts: `npx tsc --noEmit` - expect errors in executeAgent.ts
3. After executeAgent.ts: `npx tsc --noEmit` - expect errors in fixtures
4. After fixtures: `npx tsc --noEmit` - expect errors in tests
5. After tests: `npx tsc --noEmit` - should pass (no TypeScript errors)
6. Final: `npm test -- reducer.spec.ts` - expect 15 tests passing

Expected final state:
- 15 tests passing (14 existing + 1 updated Custom Initial State, minus 1 deleted)
- Optional: +1 if execution persistence test added
- Zero TypeScript compilation errors

## Migration Notes

Breaking change for existing agents - must update to two-tier structure. Acceptable per CLAUDE.md (internal dev project).

No backward compatibility layer needed - clean break preferred for internal codebase.

## Implementation Order

1. types.ts: Add AgentState, update ToolReducerHandler
2. defineAgent.ts: Update AgentDefinition generics, split initialState
3. executeAgent.ts: Split state initialization, preserve execution across attempts
4. reducer.fixtures.ts: Split types, update all handlers, update STATEFUL_AGENT
5. reducer.spec.ts: Delete broken test, update all tests, add new test
6. Run tests, fix any TypeScript errors
