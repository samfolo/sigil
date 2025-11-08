import type {PinoLogBase, SigilLogEntry} from '@sigil/src/common/observability/logger';
import {SigilLogEntrySchema} from '@sigil/src/common/observability/logger';
import type {ComponentSpec} from '@sigil/src/lib/generated/types/specification';
import type {TempFSNode} from '@sigil/src/testing/fs';
import {TempFSFileBuilder} from '@sigil/src/testing/fs';

const DEFAULT_LOG_LEVEL = 30;
const TEST_PROCESS_ID = 12345;
const TEST_HOSTNAME = 'test-host';
const TEST_AGENT_NAME = 'TestAgent';

export const VALID_COMPONENT_SPEC: ComponentSpec = {
	id: 'test-spec',
	created_at: '2025-11-07T10:00:00Z',
	title: 'Test Spec',
	data_shape: 'hierarchical',
	description: 'Test component spec',
	root: {
		accessor_bindings: {},
		layout: {
			id: 'root-layout',
			type: 'stack',
			direction: 'vertical',
			spacing: 'normal',
			children: [],
		},
		nodes: {},
	},
};

/**
 * Creates a SigilLogEntry with sensible defaults
 *
 * @param partial - Event-specific fields (event and data) plus optional Pino field overrides
 * @returns Complete SigilLogEntry object
 *
 * @example
 * ```typescript
 * const entry = logEntry({
 *   event: 'spec_generated',
 *   data: {spec: validSpec},
 *   time: 1000, // Optional override
 * });
 * ```
 */
export const logEntry = (
	partial: Omit<SigilLogEntry, keyof PinoLogBase> & Partial<PinoLogBase>
): SigilLogEntry => {
	const base: PinoLogBase = {
		level: DEFAULT_LOG_LEVEL,
		time: Date.now(),
		pid: TEST_PROCESS_ID,
		hostname: TEST_HOSTNAME,
		agent: TEST_AGENT_NAME,
		traceId: 'agent_test-trace',
		msg: 'Test log message',
	};

	const entry = {
		...base,
		...partial,
	};

	return SigilLogEntrySchema.parse(entry);
};

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
export const dateDir = (date: string, children: TempFSNode[]): TempFSNode => ({type: 'directory', name: date, children});
