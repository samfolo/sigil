import type {SigilLogEntry} from '@sigil/src/common/observability/logger';

export const VALID_LOG_ENTRY: SigilLogEntry = {
	level: 30,
	time: 1762510231808,
	pid: 9373,
	hostname: 'test-machine',
	agent: 'TestAgent',
	traceId: 'agent_test-123',
	event: 'test_event',
	msg: 'Test message',
};

export const VALID_LOG_ENTRY_WITH_DATA: SigilLogEntry = {
	level: 10,
	time: 1762510231900,
	pid: 9373,
	hostname: 'test-machine',
	agent: 'GenerateSigilIR',
	traceId: 'agent_test-456',
	event: 'spec_generated',
	data: {
		spec: {
			id: 'test-spec',
			title: 'Test Spec',
		},
	},
	msg: 'Spec generated',
};

export const VALID_JSONL_CONTENT = `${JSON.stringify(VALID_LOG_ENTRY)}
${JSON.stringify(VALID_LOG_ENTRY_WITH_DATA)}`;

export const MALFORMED_JSON_CONTENT = `${JSON.stringify(VALID_LOG_ENTRY)}
{this is not valid json}
${JSON.stringify(VALID_LOG_ENTRY_WITH_DATA)}`;

export const INVALID_LOG_ENTRY_CONTENT = `${JSON.stringify(VALID_LOG_ENTRY)}
${JSON.stringify({some: 'invalid', structure: true})}
${JSON.stringify(VALID_LOG_ENTRY_WITH_DATA)}`;

export const EMPTY_CONTENT = '';

export const WHITESPACE_ONLY_CONTENT = '   \n\n  \n';
