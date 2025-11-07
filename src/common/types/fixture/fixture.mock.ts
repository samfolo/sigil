import type {SigilLogEntry} from '@sigil/src/common/observability/logger';
import type {TempFSNode} from '@sigil/src/testing/fs';
import {TempFSFileBuilder} from '@sigil/src/testing/fs';

/**
 * Creates a SigilLogEntry with sensible defaults
 *
 * @param partial - Partial log entry properties to override defaults
 * @returns Complete SigilLogEntry object
 *
 * @example
 * ```typescript
 * const entry = logEntry({
 *   event: 'spec_generated',
 *   data: {spec: validSpec},
 * });
 * ```
 */
export const logEntry = (partial: Partial<SigilLogEntry> & {event: string}): SigilLogEntry => ({
	level: 30,
	time: Date.now(),
	pid: 12345,
	hostname: 'test-host',
	agent: 'TestAgent',
	traceId: 'agent_test-trace',
	msg: 'Test log message',
	...partial,
});

/**
 * Creates a file node with JSONL content from log entries
 *
 * @param name - File name (should end with .jsonl)
 * @param entries - Array of SigilLogEntry objects to serialise
 * @returns TempFSNode file node
 *
 * @example
 * ```typescript
 * logFile('test.jsonl', [
 *   logEntry({event: 'preprocessing_start'}),
 *   logEntry({event: 'spec_generated', data: {spec: validSpec}}),
 * ])
 * ```
 */
export const logFile = (name: string, entries: SigilLogEntry[]): TempFSNode => {
	const content = entries.map((entry) => JSON.stringify(entry)).join('\n');
	const builder = new TempFSFileBuilder().withContent(content);
	return {type: 'file', name, content: builder};
};

/**
 * Creates a directory node for a yyyy-MM-dd date directory with children
 *
 * @param date - Date string in yyyy-MM-dd format (used as directory name)
 * @param children - Array of TempFSNode children (files and subdirectories)
 * @returns TempFSNode directory node
 *
 * @example
 * ```typescript
 * .withDirectory('logs', [
 *   dateDir('2025-11-07', [
 *     logFile('test1.jsonl', [logEntry({event: 'preprocessing_start'})]),
 *     logFile('test2.jsonl', [logEntry({event: 'success'})]),
 *   ]),
 * ])
 * ```
 */
export const dateDir = (date: string, children: TempFSNode[]): TempFSNode => {
	return {type: 'directory', name: date, children};
};
