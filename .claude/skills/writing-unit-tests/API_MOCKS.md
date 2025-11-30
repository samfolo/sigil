# API Mocking Infrastructure

## Contents

- Design philosophy
- Module mocking pattern
- AnthropicApiMock
- Content block helpers
- CallbackTracker
- Fixture patterns for mocks

## Design Philosophy

Mocks in this project are designed for:

1. **Type safety throughout**—Full TypeScript support, generics where appropriate, no `as` casting in tests
2. **Composable content blocks**—Explicit, future-proof test configuration using helper functions rather than raw objects
3. **Fluent chaining**—Readable test setup that expresses intent clearly
4. **Sensible defaults with full override capability**—Works out of the box, but every SDK field is overridable
5. **Deterministic control**—Stub exact responses to elicit specific behaviour

A mock setup should make the test's intent obvious. Reading the mock configuration should tell you what scenario is being tested.

## Module Mocking Pattern

Mock at module level, **before** imports that use it:

```typescript
const mockMessagesCreate = vi.fn();

vi.mock('@sigil/src/agent/clients/anthropic', () => ({
  createAnthropicClient: vi.fn(() => ({
    messages: {
      create: mockMessagesCreate,
    },
  })),
}));

// Imports AFTER vi.mock()
import {executeAgent} from '../executeAgent';
```

Order is critical—`vi.mock()` is hoisted but the mock function reference must exist.

Reset mocks in `beforeEach`:

```typescript
beforeEach(() => {
  vi.clearAllMocks();
});
```

## AnthropicApiMock

Located in `src/agent/framework/executeAgent/executeAgent.mock.ts`. Fluent builder for mocking Anthropic API responses.

### Basic Usage

```typescript
import {AnthropicApiMock, outputToolUse, helperToolUse} from '../executeAgent.mock';

const mock = new AnthropicApiMock();
mock
  .respondWith({content: [helperToolUse('query_data', {query: 'test'})]})
  .respondWith({content: [outputToolUse('success result')]})
  .install(mockMessagesCreate);
```

### Constructor Options

```typescript
const mock = new AnthropicApiMock({
  model: 'claude-sonnet-4-5-20250929',
  defaultUsage: {input: 100, output: 50},
});
```

### API

| Method | Description |
|--------|-------------|
| `respondWith(config, options?)` | Add sequential response |
| `throwWith(config, options?)` | Add error response |
| `when(matcher)` | Add conditional response |
| `install(mockFn)` | Install on vitest mock |
| `reset()` | Clear call index and tokens (not response config) |

| Property | Description |
|----------|-------------|
| `totalTokens` | Cumulative `{input, output}` token counts |
| `calls` | All `MessageCreateParams` passed to mock |

### Response Configuration

All SDK fields are overridable:

```typescript
mock.respondWith({
  content: [outputToolUse('result')],
  id: 'msg_custom',
  model: 'claude-sonnet-4-5-20250929',
  stopReason: 'end_turn',
  usage: {
    input: 150,
    output: 75,
    cacheCreationInput: 0,
    cacheReadInput: 100,
  },
});
```

### Response Options

Non-SDK options for controlling mock behaviour:

```typescript
mock.respondWith(
  {content: [outputToolUse('delayed')]},
  {delay: 1000}  // Simulate 1s latency
);
```

### Response Persistence

Responses are returned in order. **The final response persists for subsequent calls beyond the array length.** This means a single `respondWith` handles any number of calls:

```typescript
mock
  .respondWith({content: [outputToolUse('always this')]})
  .install(mockMessagesCreate);

// All calls return 'always this'
```

### Conditional Responses

Match specific requests instead of sequential order:

```typescript
mock
  .when((req) => req.messages.length > 5)
  .respondWith({content: [outputToolUse('long conversation')]})
  .respondWith({content: [outputToolUse('default')]})  // Fallback
  .install(mockMessagesCreate);
```

### Throwing Errors

```typescript
mock
  .throwWith({error: new Error('API rate limit')})
  .install(mockMessagesCreate);
```

### Token Tracking

```typescript
await executeAgent(agent, options);

expect(mock.totalTokens).toEqual({input: 250, output: 125});
```

## Content Block Helpers

Use these instead of hand-crafting response shapes. They handle ID generation and structure automatically.

```typescript
import {
  outputToolUse,
  helperToolUse,
  textBlock,
  submitToolUse,
  createCustomMessage,
} from '../executeAgent.mock';
```

### outputToolUse

```typescript
// String result—wraps in {result: 'value'}
outputToolUse('success');
// → {type: 'tool_use', id: 'toolu_1', name: 'generate_output', input: {result: 'success'}}

// Object result—used directly (e.g., for reducer tests with state)
outputToolUse({result: 'success', finalCount: 1});
// → {type: 'tool_use', id: 'toolu_2', name: 'generate_output', input: {result: 'success', finalCount: 1}}

// Custom tool ID
outputToolUse('result', 'toolu_custom');
```

### helperToolUse

```typescript
helperToolUse('query_data', {query: 'test'});
// → {type: 'tool_use', id: 'toolu_3', name: 'query_data', input: {query: 'test'}}
```

### textBlock

```typescript
textBlock('Model thinking text');
// → {type: 'text', text: 'Model thinking text', citations: []}
```

### submitToolUse

For reflection mode testing:

```typescript
submitToolUse();
// → {type: 'tool_use', id: 'toolu_4', name: 'submit', input: {}}
```

### createCustomMessage

For edge cases needing full control over Message structure:

```typescript
const message = createCustomMessage({
  content: [textBlock('thinking'), outputToolUse('result')],
  usage: {input: 200, output: 100},
  stopReason: 'end_turn',
});
```

## CallbackTracker

Tracks callback invocations during agent execution. Generic over output type.

### Basic Usage

```typescript
import {CallbackTracker} from '../executeAgent.mock';

const tracker = new CallbackTracker<TestOutput>();

await executeAgent(agent, {
  input: 'test',
  callbacks: tracker.createCallbacks(),
});

expect(tracker.helperToolCalls).toHaveLength(1);
expect(tracker.invocations.at(0)?.type).toBe('onAttemptStart');
```

### With Callback Overrides

Provide handlers while still tracking invocations:

```typescript
const tracker = new CallbackTracker<TestOutput>();

await executeAgent(agent, {
  input: 'test',
  callbacks: tracker.createCallbacks({
    onHelperTool: (name, input) => ok({result: 'mocked data'}),
  }),
});
```

### Properties

| Property | Type | Description |
|----------|------|-------------|
| `invocations` | `ReadonlyArray<CallbackInvocation>` | All invocations in order |
| `helperToolCalls` | `OnToolCallInvocation[]` | Helper tool calls only |
| `outputToolCalls` | `OnToolCallInvocation[]` | Output tool calls only |
| `submitToolCalls` | `OnToolCallInvocation[]` | Submit tool calls only |
| `errors` | `ReadonlyArray<unknown>` | Errors thrown by callbacks |

### Invocation Types

`CallbackInvocation` is a discriminated union with these variants:

- `onAttemptStart`—`{type, context}`
- `onAttemptComplete`—`{type, context, success}`
- `onValidationFailure`—`{type, errors, context}`
- `onValidationLayerStart`—`{type, layer, context}`
- `onValidationLayerComplete`—`{type, layer, context}`
- `onToolCall`—`{type, context, toolName, toolInput}`
- `onToolResult`—`{type, context, toolName, toolResult}`
- `onSuccess`—`{type, output, metadata?}`
- `onFailure`—`{type, errors, metadata?}`

### Reset

For reusing tracker across multiple tests:

```typescript
afterEach(() => {
  tracker.reset();
});
```

## Fixture Patterns for Mocks

### Factory with Closure (State Tracking)

For mocks that need to track state across calls:

```typescript
export const createAttemptTrackingValidator = () => {
  let attemptCount = 0;

  return {
    name: 'attempt_tracker',
    validate: async (output) => {
      attemptCount++;
      if (attemptCount === 1) {
        return err('First attempt must fail');
      }
      return ok(output);
    },
  };
};
```

### Builder Pattern

For complex mock configuration:

```typescript
export const VALID_COMPLETE_AGENT = agentBuilder(BASE_MINIMAL_AGENT)
  .withName('CompleteAgent')
  .withDescription('Agent with all observability flags')
  .withMaxAttempts(5)
  .build();
```

### IIFE for Computed Fixtures

For fixtures requiring complex initialisation:

```typescript
export const SAMPLE_ZOD_ERROR = (() => {
  const schema = z.object({name: z.string(), age: z.number()});
  const result = schema.safeParse({name: 123, age: 'invalid'});
  if (!result.success) {
    return result.error;
  }
  return new ZodError([]);
})();
```

### Setup Helper Pattern

For common setup across multiple test files:

```typescript
import {setupExecuteAgentMocks} from '../executeAgent.common.fixtures';

beforeEach(() => {
  setupExecuteAgentMocks(mockMessagesCreate);
});
```
