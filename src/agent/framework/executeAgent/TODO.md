# executeAgent Implementation TODO

## Current Status

**Test Suite**: 164 passing / 11 failing (93.7% pass rate)

The test suite has been split into 8 focused files:
- `executeAgent.basic.spec.ts` - Type safety and basic execution (✅ all passing)
- `executeAgent.validation.spec.ts` - Retry logic and validation (✅ all passing)
- `executeAgent.iteration.spec.ts` - Helper tool iteration (✅ all passing)
- `executeAgent.reflection.spec.ts` - Reflection mode (✅ all passing)
- `executeAgent.callbacks.spec.ts` - Tool callbacks (⚠️ 4 failures)
- `executeAgent.observability.spec.ts` - Metadata tracking (⚠️ 2 failures)
- `executeAgent.cancellation.spec.ts` - Abort signal handling (⚠️ 5 failures)
- `executeAgent.history.spec.ts` - Conversation history (✅ all passing)

## Completed Work

### Test Infrastructure
✅ Created `executeAgent.common.fixtures.ts` for shared mocks and setup
✅ Split monolithic test file into 8 focused files by concern
✅ Fixed reflection mode test mocks (wrapped `createOutputThenSubmitResponse` in `{type: 'custom'}`)
✅ Updated Output Tool Callback tests to use `AGENT_WITH_REFLECTION` instead of `AGENT_WITH_HELPER_TOOLS`

### Implementation Fixes
✅ Added `iteration` and `maxIterations` fields to `AgentExecutionState` type
✅ Initialize `state.iteration` and increment in iteration loop (`state.iteration = ++iterationCount`)
✅ Move `maxIterations` calculation before state creation to avoid "Cannot access before initialization" error

## Remaining Failures (11 tests)

### 1. Submit Tool Callbacks (4 failures in executeAgent.callbacks.spec.ts)

**Issue**: `onToolResult` callback not being invoked for submit tool

**Location**: `src/agent/framework/executeAgent/executeAgent.ts:726-738`

**Current Code**:
```typescript
if (toolUse.name === DEFAULT_SUBMIT_TOOL.name) {
  submitFound = true;
  safeInvokeCallback(
    options.callbacks?.onToolCall,
    [state, toolUse.name, toolUse.input],
    callbackErrors
  );
  // Submit tool has no result (termination signal only)
  continue;
}
```

**Fix Needed**: Add `onToolResult` callback after `onToolCall`:
```typescript
if (toolUse.name === DEFAULT_SUBMIT_TOOL.name) {
  submitFound = true;
  safeInvokeCallback(
    options.callbacks?.onToolCall,
    [state, toolUse.name, toolUse.input],
    callbackErrors
  );
  const submitMessage = 'Submitted final output for validation';
  safeInvokeCallback(
    options.callbacks?.onToolResult,
    [state, toolUse.name, submitMessage],
    callbackErrors
  );
  continue;
}
```

**Affected Tests**:
- `should invoke onToolResult for submit in reflection mode`
- `should maintain correct callback order in reflection mode`
- `should increment iteration count across tool callbacks`
- `should collect errors from onToolResult in metadata`

### 2. Cancellation/Abort Signal (5 failures in executeAgent.cancellation.spec.ts)

**Issue**: Dynamic abort scenarios not working (abort during API call, abort during iteration)

**Tests Expecting**:
- Aborting DURING an API call should cancel execution
- Aborting DURING helper tool iteration should cancel execution
- Abort reason should be included in error context
- Metadata should be populated even when aborted
- `onFailure` callback should be invoked when aborted

**Current Behaviour**: Only checks `signal.aborted` BEFORE API call, not during

**Possible Approaches**:
1. **Mock-based testing issue**: Tests may need better mock setup to simulate abort during execution
2. **Implementation gap**: May need to check abort signal in more places or handle `AbortError` from API
3. **Test expectations wrong**: PRD may not require dynamic abort, only pre-execution checks

**Investigation Needed**: Check PRD requirements for abort signal behaviour. Current implementation checks before API call (line 651) and propagates signal to API (line 675), but tests expect mid-execution abort.

### 3. Callback Error Collection (2 failures in executeAgent.observability.spec.ts)

**Issue**: Callback errors not being collected in metadata correctly

**Test**: `should collect callback errors in metadata`
- Expected: 2 errors collected
- Actual: 4 errors collected (possibly double-counting)

**Test**: `should include error messages in callback errors`
- Expected: Array containing error message
- Actual: Empty array

**Investigation Needed**:
- Check `buildMetadata` function - does it properly include `callbackErrors`?
- Verify `safeInvokeCallback` is catching errors and appending to `callbackErrors` array
- May be architecture issue - are we collecting errors in the right scope?

## Implementation Tasks

### High Priority (Fix Failing Tests)
1. ✅ Add iteration tracking to `AgentExecutionState`
2. ⬜ Add `onToolResult` callback for submit tool (trivial, 1-line fix)
3. ⬜ Investigate and fix callback error collection in metadata
4. ⬜ Investigate abort signal behaviour (clarify requirements vs implementation)

### Medium Priority (Code Quality)
5. ⬜ Delete original `executeAgent.spec.ts` after verification
6. ⬜ Add helper tool input validation (per PRD)
7. ⬜ Add JSDoc documentation to implementation functions
8. ⬜ Code quality improvements and refactoring

### Low Priority (Future Enhancements)
9. ⬜ Review test coverage for edge cases
10. ⬜ Consider adding integration tests beyond unit tests

## Notes for Continuation

### Key Files
- **Implementation**: `src/agent/framework/executeAgent/executeAgent.ts`
- **Types**: `src/agent/framework/types.ts`
- **Fixtures**: `src/agent/framework/executeAgent/executeAgent.fixtures.ts`
- **Agent Fixtures**: `src/agent/framework/defineAgent/defineAgent.fixtures.ts`
- **PRD**: `src/agent/framework/executeAgent/PRD.md`

### Common Patterns

**Running specific test file**:
```bash
npm test -- src/agent/framework/executeAgent/executeAgent.callbacks.spec.ts
```

**Running specific test**:
```bash
npm test -- src/agent/framework/executeAgent/executeAgent.callbacks.spec.ts -t "should invoke onToolResult"
```

**Mock response types**:
- `{type: 'success'}` - Output tool only
- `{type: 'helper', helperToolName: 'tool_name'}` - Helper tool
- `{type: 'submit'}` - Submit tool only
- `{type: 'custom', response: createOutputThenSubmitResponse()}` - Raw response
- `{type: 'invalid'}` - Validation failure
- `{type: 'error', error: new Error('...')}` - API error

### Recent Fixes Applied

1. **Reflection mode infinite loops**: Wrapped `createOutputThenSubmitResponse()` in `{type: 'custom', response: ...}`
2. **Missing iteration tracking**: Added `iteration` and `maxIterations` to `AgentExecutionState`
3. **Initialization order**: Moved `maxIterations` calculation before state creation
4. **Wrong agent in tests**: Changed Output Tool Callback tests from `AGENT_WITH_HELPER_TOOLS` to `AGENT_WITH_REFLECTION`

### Test File Organization

Each test file imports from `executeAgent.common.fixtures.ts` which re-exports:
- Agent fixtures (from `defineAgent.fixtures.ts`)
- Execution fixtures (from `executeAgent.fixtures.ts`)
- The `executeAgent` function
- Error utilities (`isOk`, `isErr`, `AGENT_ERROR_CODES`)

Each test file sets up its own mock:
```typescript
const mockMessagesCreate = vi.fn();

vi.mock('@sigil/src/agent/clients/anthropic', () => ({
  createAnthropicClient: vi.fn(() => ({
    messages: {create: mockMessagesCreate},
  })),
}));
```

Then calls `setupExecuteAgentMocks(mockMessagesCreate)` in `beforeEach`.
