# Product Requirements Document: Tool Calling Iteration Loop

**Status**: Draft
**Last Updated**: 2025-10-26
**Owner**: Engineering

---

## Problem Statement

### Current State

The `executeAgent` function currently rejects any agent responses that include helper tool calls with an error: "Model called helper tools but tool calling loop not yet implemented". This limitation exists at line 636 in `src/agent/framework/executeAgent/executeAgent.ts`.

Currently, agents can only call the output tool in a single API request. This creates two significant limitations:

1. **No Multi-Step Workflows**: Agents cannot use helper tools to explore data, gather context, or perform intermediate computations before generating their final output.

2. **No Output Reflection**: Agents cannot see their proposed output formatted/processed before it undergoes external validation. Given that validation includes multiple layers (Zod schema validation + custom validators with business logic), the model may produce outputs that fail validation in ways it couldn't internally predict.

### Why This Matters

The current single-shot approach works for simple use cases but falls short for:

- **Complex Analysis Tasks**: Agents that need to explore data structures, query information, or perform calculations before generating insights
- **Quality-Critical Outputs**: Tasks where custom validators enforce semantic or business rules that are hard for the model to predict during generation
- **Iterative Refinement**: Scenarios where seeing formatted output would help the model self-correct before burning validation attempts

The validation flow in `executeAgent` includes:
- Zod schema validation (structural correctness)
- Custom validators (business logic, semantic checks)

These external validators can fail in ways the model cannot internally predict, even with extended thinking enabled. Extended thinking helps with internal reasoning during generation but provides no visibility into how external systems will interpret and validate the output.

### Reference Implementation

A working tool calling loop exists in `src/agent/chat/chat.ts` (lines 158-230). This implementation demonstrates the core pattern:
- Loop while `stop_reason === 'tool_use'`
- Execute tool handlers
- Append assistant message with tool_use blocks
- Append user message with tool_result blocks
- Make next API call with updated conversation history
- Accumulate tokens across iterations

---

## Goals

### Primary Goals

1. **Enable Multi-Step Workflows**: Agents should be able to call helper tools, receive results, and iterate before producing final output
2. **Support Output Reflection (Opt-In)**: Agents should optionally see their proposed output formatted and have the opportunity to refine it before validation
3. **Maintain Quality Bar**: Implementation must preserve existing error handling, abort signal support, callback invocation, and validation flow
4. **Type Safety**: Invalid states (e.g., reflection without submit tool) should be unrepresentable at the type level

### Non-Goals

1. **Streaming Support**: This implementation focuses on non-streaming API calls (consistent with current `executeAgent` behaviour)
2. **Tool Result Caching**: No caching of tool execution results across attempts
3. **Backwards Compatibility**: This is an internal development project - existing agent definitions will require migration

---

## Design Decisions

### Key Architectural Choices

#### 1. Iteration vs Attempts

**Definitions**:
- **Attempt**: Complete validation cycle (build prompts → iterate until output → validate)
- **Iteration**: Single API call + tool execution within an attempt

**Behaviour**:
- Iterations continue while `stop_reason === 'tool_use'` AND output tool hasn't been called (non-reflection mode) OR submit hasn't been called (reflection mode)
- When output/submit terminates iteration → validate extracted output
- If validation fails → new attempt with error feedback in conversation history

#### 2. Reflection Mode: Opt-In Design

**Problem**: Reflection adds quality but costs tokens. Not all agents need it.

**Solution**: Make reflection opt-in via the presence of a `reflectionHandler` on the output tool configuration.

**Type-Level Enforcement**:
- When `reflectionHandler` is provided, framework automatically injects a `submit` tool
- The submit tool has a default definition (no configuration needed)
- Invalid states (reflection without submit, submit without handler) are impossible at the type level

**Behaviour**:
- **Reflection Disabled** (no handler): Output tool call terminates iteration immediately → proceed to validation
- **Reflection Enabled** (handler present): Output tool executes handler, returns formatted result to model → model can call output again to refine → model calls submit to finalize → proceed to validation

**Default Submit Tool**:
- Name: `submit`
- Description: "Submit your final output for validation. Call this when you are satisfied with your output."
- Input schema: Empty object (no parameters needed)
- No handler required (it's a termination signal)

#### 3. Tool Configuration Structure

The `ToolsConfig` interface will be updated to support:

**Helper Tools** (optional):
- Array of objects, each containing:
  - `definition`: Anthropic.Tool (API schema)
  - `handler`: Function that executes the tool

**Output Tool** (required):
- `name`: String
- `description`: String
- `reflectionHandler`: Optional function that formats output for model review

**Type Safety**:
- Helper tool handlers accept `unknown` input (runtime validation via input_schema)
- Helper tool handlers return `unknown` (converted to string for tool_result)
- Reflection handler accepts typed `Output` and returns string for model consumption

#### 4. Tool Execution Error Handling

Tool handler errors (both helper and reflection) should NOT throw. Instead:
- Catch all errors in `executeAgent`
- Return tool_result with `is_error: true`
- This allows the model to see what went wrong and potentially recover

Unknown tools (tools called that don't have handlers) should also return error results, not crash execution.

#### 5. Iteration Limits

**Problem**: Prevent runaway reflection/tool loops that consume excessive tokens.

**Solution**: Add `maxIterationsPerAttempt` to `ValidationConfig`:
- Type: Optional number
- Default: 15 iterations per attempt
- When exceeded: Return `AGENT_ERROR_CODES.MAX_ITERATIONS` error

**Rationale**: 15 iterations allows generous exploration while preventing truly runaway loops. Each iteration includes at least one API call, so this caps token costs per attempt.

#### 6. Conversation History Structure

Follow Anthropic API conventions (as seen in `src/agent/chat/chat.ts`):

**After each iteration**:
1. Append assistant message with `content` array containing tool_use blocks
2. Append user message with `content` array containing all tool_result blocks for that iteration

**Structure**:
- One assistant message per iteration (contains all tool_use blocks)
- One user message per iteration (contains all tool_result blocks)
- All tool results for an iteration go in a single user message

This matches the pattern in the reference implementation.

#### 7. Callbacks for Observability

Add two new callbacks to `ExecuteCallbacks`:

**onToolCall**:
- Fires when a tool is invoked (before execution)
- Parameters: `(state: AgentExecutionState, toolName: string, toolInput: unknown)`
- Use case: Log tool invocations, show "Agent is using tool X" in UI

**onToolResult**:
- Fires when a tool execution completes (after execution)
- Parameters: `(state: AgentExecutionState, toolName: string, toolResult: string)`
- Use case: Log tool results, show "Tool X returned: Y" in UI

**Behaviour**:
- Fire for both helper tools and reflection handler invocations
- Fire even if tool execution throws (result will be error message)
- Wrapped in `safeInvokeCallback` to prevent callback errors from breaking execution

#### 8. Abort Signal Handling

Abort signal must be checked:
- Before each iteration's API call (not just at attempt level)
- Phase should be `'iteration'` when cancelled mid-iteration loop

This ensures responsive cancellation during long tool-calling sequences.

#### 9. Token Accumulation

Tokens must accumulate across:
- All iterations within an attempt
- All attempts within an execution

Token totals are included in metadata for both success and failure cases (for cost tracking).

---

## Technical Approach

### Files to Modify

#### Core Implementation
- `src/agent/framework/defineAgent/defineAgent.ts` - Update `ToolsConfig` interface
- `src/agent/framework/executeAgent/executeAgent.ts` - Implement iteration loop
- `src/agent/framework/types.ts` - Update `ValidationConfig` (add `maxIterationsPerAttempt`)

#### Error Handling
- Error codes file (wherever `AGENT_ERROR_CODES` is defined) - Add `MAX_ITERATIONS` and `SUBMIT_BEFORE_OUTPUT` codes
- Error types file (wherever error context types are defined) - Add context types for new error codes

#### Testing
- `src/agent/framework/executeAgent/executeAgent.spec.ts` - Comprehensive test coverage
- `src/agent/framework/executeAgent/executeAgent.fixtures.ts` - Test fixtures (agents with helpers, reflection mode, mock handlers)

### Implementation Phases

#### Phase 1: Type System Updates
1. Update `ToolsConfig` interface to support helpers and reflection
2. Update `ValidationConfig` to include `maxIterationsPerAttempt`
3. Add new callback types (`onToolCall`, `onToolResult`)
4. Update `AgentDefinition` to make tools generic over `Output`

#### Phase 2: Core Iteration Loop
1. Add `DEFAULT_SUBMIT_TOOL` constant
2. Update tool array construction (inject submit tool when reflection enabled)
3. Replace single API call with iteration loop:
   - Check stop_reason
   - Detect submit tool (exit with last output)
   - Detect output tool (exit immediately if no reflection, execute handler if reflection)
   - Execute helper tool handlers
   - Build and append conversation history
   - Check iteration limit
   - Check abort signal
   - Make next API call
   - Accumulate tokens

#### Phase 3: Callback Integration
1. Add `safeInvokeCallback` calls for `onToolCall` before execution
2. Add `safeInvokeCallback` calls for `onToolResult` after execution
3. Handle both success and error cases in callbacks

#### Phase 4: Error Handling
1. Add new error codes
2. Handle unknown tools gracefully
3. Handle tool execution errors (catch and return as tool_result)
4. Handle edge cases (submit before output, no tools called, etc.)

#### Phase 5: Testing
1. Helper tools: execution, multiple in sequence, errors, unknown tools
2. Reflection mode: handler invocation, multiple output calls, submit termination, errors
3. Non-reflection mode: immediate exit on output tool
4. Iteration limits: enforcement, default value, error return
5. Token accumulation: across iterations, in reflection mode
6. Abort signal: mid-iteration cancellation
7. Conversation history: structure, accumulation
8. Callbacks: invocation timing, error handling

#### Phase 6: Migration
1. Search codebase for `tools.additional` usage
2. Migrate each agent definition:
   - Replace `additional: [toolDef]` with `helpers: [{definition: toolDef, handler: handlerFn}]`
   - Implement handler functions
   - Test migrated agents

---

## Edge Cases and Considerations

### Tool Execution Scenarios

1. **Output Tool Called Immediately (No Helpers)**
   - Non-reflection: Exit immediately, validate
   - Reflection: Execute handler, wait for submit
   - Existing behaviour should be preserved for simple cases

2. **Multiple Output Tool Calls (Reflection Mode)**
   - Store last output tool input
   - Each call executes reflection handler
   - Submit extracts last stored input for validation
   - If submit called without any output calls → error

3. **Mixed Tool Uses in Single Response**
   - Model calls: `[helper_1, output, helper_2]`
   - Behaviour: Process all tools in order
   - If output tool present (non-reflection): exit after processing tools
   - If submit present: exit after processing tools
   - Order matters: use `findLast` for output tool detection

4. **Unknown Tool Called**
   - Return tool_result with `is_error: true`
   - Message: "Error: Unknown tool {name}"
   - Do NOT crash execution
   - Model may recover or try different approach

5. **Tool Handler Throws Exception**
   - Catch error in `executeAgent`
   - Return tool_result with `is_error: true`
   - Message: "Error: {error.message}"
   - Fire `onToolResult` callback with error message
   - Continue iteration (model may recover)

6. **Iteration Limit Exceeded**
   - Return `ExecuteFailure` with `MAX_ITERATIONS` error
   - Include context: `{attempt, iterationCount, maxIterations}`
   - Include accumulated tokens in metadata
   - Do NOT continue to validation

7. **Abort Signal During Iteration**
   - Check `signal.aborted` before each API call
   - Return `EXECUTION_CANCELLED` error
   - Set phase to `'iteration'`
   - Include iteration context

### Conversation History Management

1. **Structure Requirements**
   - Must match Anthropic API `MessageParam[]` format
   - Assistant messages: `{role: 'assistant', content: ContentBlock[]}`
   - User messages: `{role: 'user', content: ToolResultBlockParam[]}`

2. **Accumulation Pattern**
   - Start with initial user prompt (built once)
   - After each iteration: append assistant message, then user message
   - After validation failure: append error prompt as user message
   - Conversation persists across retry attempts

3. **Tool Result Grouping**
   - All tool results from one iteration go in one user message
   - Do NOT create separate user messages per tool result
   - This matches the pattern in `src/agent/chat/chat.ts`

### Token Cost Considerations

1. **Reflection Mode Costs**
   - Adds N iterations per attempt (model refinement)
   - Each iteration = one API call (input + output tokens)
   - Potential benefit: fewer attempts needed (early self-correction)
   - Net cost depends on: iterations vs saved attempts

2. **Helper Tool Costs**
   - Each iteration with helper tools = tokens for tool_use + tool_result
   - Tool results converted to strings (can be verbose)
   - Design handler responses to be concise but informative

3. **Cost Monitoring**
   - `metadata.tokens` includes total across all iterations and attempts
   - Use `observability.trackTokens` to enable/disable tracking
   - Callbacks can monitor per-iteration costs if needed

---

## Success Criteria

### Functional Requirements

- [ ] Helper tools execute and results feed back to model for further iterations
- [ ] Reflection mode allows output tool to be called multiple times before submit
- [ ] Submit tool properly terminates iteration loop in reflection mode
- [ ] Output tool immediately terminates loop in non-reflection mode
- [ ] Iteration limit (`maxIterationsPerAttempt`) prevents runaway loops
- [ ] Unknown tools return error results (not crash)
- [ ] Tool handler exceptions return error results (not crash)
- [ ] Conversation history structure matches Anthropic API format
- [ ] Tokens accumulate correctly across all iterations and attempts
- [ ] Abort signal cancels execution mid-iteration with correct phase context

### Callback Requirements

- [ ] `onToolCall` fires before each tool execution (helpers + reflection)
- [ ] `onToolResult` fires after each tool execution with result or error
- [ ] Callback errors caught and collected in metadata (do not break execution)
- [ ] Existing callbacks (`onAttemptStart`, `onValidationFailure`, etc.) continue to work

### Error Handling Requirements

- [ ] `MAX_ITERATIONS` error returned when iteration limit exceeded
- [ ] `SUBMIT_BEFORE_OUTPUT` error returned if submit called before output tool (reflection mode)
- [ ] `INVALID_RESPONSE` error returned if no tools called
- [ ] Tool execution errors do not crash, return `is_error: true` results
- [ ] All error paths include metadata (tokens, latency, callback errors)

### Type Safety Requirements

- [ ] `ToolsConfig` enforces helper tool structure (definition + handler)
- [ ] Reflection mode type-checks: handler present implies submit tool
- [ ] Invalid states unrepresentable (cannot have submit without handler)
- [ ] Generic `Output` type flows through tool configuration
- [ ] Callback signatures properly typed

### Testing Requirements

- [ ] Unit tests cover all tool execution scenarios (helpers, reflection, non-reflection)
- [ ] Unit tests cover all error cases (unknown tools, handler errors, iteration limit)
- [ ] Unit tests verify conversation history structure and accumulation
- [ ] Unit tests verify token accumulation across iterations
- [ ] Unit tests verify abort signal behaviour during iteration
- [ ] Unit tests verify callback invocations (timing, arguments, error handling)
- [ ] Integration tests verify end-to-end workflows with actual agent definitions

### Migration Requirements

- [ ] All existing agents using `tools.additional` migrated to new structure
- [ ] Migration guide documents transformation from old to new API
- [ ] No breaking changes to agents not using helper tools (output-only agents work unchanged)

### Documentation Requirements

- [ ] JSDoc comments updated for `ToolsConfig` interface
- [ ] JSDoc comments added for new callback types
- [ ] Inline comments explain iteration loop logic
- [ ] Error messages provide clear guidance (e.g., "Add reflectionHandler or remove submit tool")

---

## Open Questions

None at this time. All design decisions have been resolved through discussion.

---

## Future Enhancements (Out of Scope)

1. **Streaming Support**: Extend iteration loop to support streaming API calls
2. **Tool Result Caching**: Cache helper tool results within an attempt to avoid redundant execution
3. **Parallel Tool Execution**: Execute multiple independent tool calls concurrently
4. **Tool Use Analytics**: Track which tools are called most frequently, success rates, etc.
5. **Custom Submit Tool**: Allow agents to customize submit tool name/description
6. **Iteration Budget Policies**: More sophisticated iteration limits (e.g., token-based budget, time-based budget)

---

## References

### Existing Implementations
- `src/agent/chat/chat.ts` (lines 158-230) - Reference tool calling loop
- `src/agent/framework/executeAgent/executeAgent.ts` - Current implementation
- `src/agent/framework/defineAgent/defineAgent.ts` - Agent definition types

### Related Documentation
- `ERROR_HANDLING.md` - Error handling conventions
- `CLAUDE.md` - Project coding standards
- Anthropic API documentation for tool use and message structure
