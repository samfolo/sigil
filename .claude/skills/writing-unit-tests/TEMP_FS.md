# Filesystem Testing Utilities

## Contents

- TempFSBuilder
- TempFSNode structure
- Cleanup patterns
- Environment + filesystem setup
- Test data generators

## TempFSBuilder

Located in `src/testing/fs`. Creates temporary directory structures with automatic cleanup using the `tmp` library. Never create real files on the system—always use this builder.

### Basic Usage

```typescript
import {TempFSBuilder} from '@sigil/src/testing/fs';
import {isOk, isErr} from '@sigil/src/common/errors/result';

const result = new TempFSBuilder()
  .withFile('config.json', '{}')
  .withDirectory('logs', [
    {type: 'file', name: 'app.log', content: 'log data'},
  ])
  .build();

if (isOk(result)) {
  const {root, cleanup} = result.data;
  // Use root path in tests
  cleanup(); // Remove temp directory
}
```

### API

| Method | Description |
|--------|-------------|
| `withFile(name, content)` | Add file to root directory |
| `withDirectory(name, children)` | Add directory with child nodes |
| `with(...nodes)` | Add multiple nodes at once |
| `build()` | Returns `Result<TempFSResult, string>` |

### TempFSResult

```typescript
interface TempFSResult {
  root: string;      // Absolute path to temp root directory
  cleanup: () => void; // Call in test teardown
}
```

## TempFSNode Structure

Nodes are a discriminated union—either files or directories:

```typescript
type TempFSNode =
  | {type: 'file'; name: string; content: string | TempFSFileBuilder}
  | {type: 'directory'; name: string; children: TempFSNode[]};
```

### Inline Node Definition

```typescript
new TempFSBuilder()
  .with(
    {type: 'file', name: 'root.txt', content: 'root content'},
    {type: 'directory', name: 'nested', children: [
      {type: 'file', name: 'child.txt', content: 'nested content'},
    ]},
  )
  .build();
```

### Domain-Specific Helpers

Create reusable helpers for your test domain:

```typescript
// Helper for date-based log directories
const dateDir = (date: string, children: TempFSNode[]): TempFSNode => ({
  type: 'directory',
  name: date,
  children,
});

// Helper for JSONL log files
const logFile = (name: string, entries: object[]): TempFSNode => ({
  type: 'file',
  name,
  content: entries.map((e) => JSON.stringify(e)).join('\n'),
});

// Usage
new TempFSBuilder()
  .withDirectory('logs', [
    dateDir('2025-11-07', [
      logFile('events.jsonl', [{event: 'start'}, {event: 'end'}]),
    ]),
  ])
  .build();
```

### TempFSFileBuilder

For complex file content that benefits from a builder pattern:

```typescript
import {TempFSFileBuilder} from '@sigil/src/testing/fs';

const fileBuilder = new TempFSFileBuilder()
  .withContent('complex content here');

new TempFSBuilder()
  .withFile('config.json', fileBuilder)
  .build();
```

## Cleanup Pattern

Always call `cleanup()` in `afterEach`. Store the result in a variable that can be null-checked:

```typescript
let tempFS: TempFSResult | null = null;

beforeEach(() => {
  const fsResult = new TempFSBuilder()
    .withFile('test.txt', 'content')
    .build();
  if (isErr(fsResult)) {
    throw new Error(`Failed to create temp filesystem: ${fsResult.error}`);
  }
  tempFS = fsResult.data;
});

afterEach(() => {
  if (tempFS) {
    tempFS.cleanup();
    tempFS = null;
  }
});
```

## Environment + Filesystem Pattern

For tests requiring both environment variables and filesystem:

```typescript
let originalEnv: NodeJS.ProcessEnv;
let tempFS: TempFSResult | null = null;

beforeEach(() => {
  originalEnv = {...process.env};
  const fsResult = new TempFSBuilder().build();
  if (isErr(fsResult)) {
    throw new Error(`Failed to create temp filesystem: ${fsResult.error}`);
  }
  tempFS = fsResult.data;
  process.env.SIGIL_TEST_RUN_DIR = tempFS.root;
});

afterEach(() => {
  process.env = originalEnv;
  vi.unstubAllEnvs();
  if (tempFS) {
    tempFS.cleanup();
    tempFS = null;
  }
});
```

## Test Data Generators

Located in `src/testing/generators/`. Generate realistic test data with deterministic seeding for reproducibility.

```typescript
import {generateCSV, generateJSON, generateXML, generateYAML} from '@sigil/src/testing';

const csv = generateCSV({
  rows: 100,
  columns: [
    {name: 'id', type: 'uuid'},
    {name: 'score', type: 'number', options: {min: 0, max: 100}},
  ],
  seed: 42,
});

const json = generateJSON({
  depth: 4,
  minBreadth: 3,
  maxBreadth: 5,
  includeArrays: true,
  seed: 42,
});
```

### Available Generators

| Generator | Description |
|-----------|-------------|
| `generateCSV(config)` | Tabular data with typed columns |
| `generateJSON(config)` | Nested objects with realistic property names |
| `generateXML(config)` | XML documents with optional attributes |
| `generateYAML(config)` | Configuration-style YAML |
| `generateGeoJSON(config)` | GeoJSON features with geometry types |

Always use `seed` parameter for reproducible tests.
