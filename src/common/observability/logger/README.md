# Logger

Structured logging for agent execution using Pino.

## Usage

```typescript
import {createAgentLogger} from '@sigil/src/common/observability/logger';

const logger = createAgentLogger('AnalyserAgent');
logger.info({event: 'attempt_start', attempt: 1, maxAttempts: 3}, 'Attempt started');
logger.trace({event: 'tool_call', toolName: 'sampler'}, 'Tool called');
```

## Log Levels

- `trace`: Detailed execution (tool calls, results)
- `debug`: Debugging information
- `info`: Lifecycle events (attempts, success)
- `warn`: Validation failures, retries
- `error`: Fatal errors

## Environment

**Development mode** (`NODE_ENV=development`):
- Console: Pretty-formatted logs at `LOG_LEVEL` (default: `debug`)
- File: All logs at `trace` level to `logs/yyyy-MM-dd/${agentName}-${timestamp}.jsonl`
- Set `LOG_LEVEL=trace` to surface trace logs in console

**Production mode**:
- JSON logs to stdout only, no file writing

## Log Format

Console shows human-readable output. Files contain JSONL with structured fields:

```jsonl
{"level":30,"time":1730567890123,"agent":"AnalyserAgent","traceId":"agent_abc-123","event":"attempt_start","attempt":1,"maxAttempts":3,"msg":"Attempt started"}
```

Each logger instance generates a unique `traceId` for correlating events within a single execution.

Logs are organised by day in `logs/yyyy-MM-dd/` directories for easier management and cleanup.

## Error Handling

If file logging fails (permissions, disk space), logger logs a warning and continues with console-only logging.
