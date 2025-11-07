import type {SigilLogEntry} from '@sigil/src/common/observability/logger';
import type {ComponentSpec} from '@sigil/src/lib/generated/types/specification';

export const VALID_COMPONENT_SPEC: ComponentSpec = {
	id: 'test-spec-123',
	created_at: '2025-11-07T10:00:00Z',
	title: 'Test Visualisation',
	description: 'A test component spec',
	data_shape: {
		type: 'array',
		items: {
			type: 'object',
			properties: {
				name: {type: 'string'},
				value: {type: 'number'},
			},
		},
	},
	root: {
		component: 'data-table',
		props: {
			columns: [],
		},
	},
};

export const SPEC_GENERATED_LOG_ENTRY: SigilLogEntry = {
	level: 10,
	time: 1762510231900,
	pid: 9373,
	hostname: 'test-machine',
	agent: 'GenerateSigilIR',
	traceId: 'agent_test-456',
	event: 'spec_generated',
	data: {
		spec: VALID_COMPONENT_SPEC,
	},
	msg: 'ComponentSpec generated',
};

export const LOGS_WITH_SPEC: SigilLogEntry[] = [
	{
		level: 30,
		time: 1762510231800,
		pid: 9373,
		hostname: 'test-machine',
		agent: 'Analyser',
		traceId: 'agent_test-123',
		event: 'preprocessing_start',
		msg: 'Starting preprocessing',
	},
	SPEC_GENERATED_LOG_ENTRY,
];

export const LOGS_WITH_MULTIPLE_SPECS: SigilLogEntry[] = [
	{
		level: 10,
		time: 1762510231800,
		pid: 9373,
		hostname: 'test-machine',
		agent: 'GenerateSigilIR',
		traceId: 'agent_test-123',
		event: 'spec_generated',
		data: {
			spec: {
				...VALID_COMPONENT_SPEC,
				id: 'old-spec',
				title: 'Old Title',
			},
		},
		msg: 'First spec generated',
	},
	{
		level: 10,
		time: 1762510231900,
		pid: 9373,
		hostname: 'test-machine',
		agent: 'GenerateSigilIR',
		traceId: 'agent_test-456',
		event: 'spec_generated',
		data: {
			spec: {
				...VALID_COMPONENT_SPEC,
				id: 'new-spec',
				title: 'New Title',
			},
		},
		msg: 'Second spec generated',
	},
];

export const LOGS_WITHOUT_SPEC: SigilLogEntry[] = [
	{
		level: 30,
		time: 1762510231800,
		pid: 9373,
		hostname: 'test-machine',
		agent: 'Analyser',
		traceId: 'agent_test-123',
		event: 'preprocessing_start',
		msg: 'Starting preprocessing',
	},
	{
		level: 30,
		time: 1762510231850,
		pid: 9373,
		hostname: 'test-machine',
		agent: 'Analyser',
		traceId: 'agent_test-123',
		event: 'chunking_complete',
		msg: 'Chunking complete',
	},
];

export const SPEC_EVENT_MISSING_DATA_FIELD: SigilLogEntry = {
	level: 10,
	time: 1762510231900,
	pid: 9373,
	hostname: 'test-machine',
	agent: 'GenerateSigilIR',
	traceId: 'agent_test-456',
	event: 'spec_generated',
	msg: 'Spec generated without data',
};

export const SPEC_EVENT_MISSING_SPEC_FIELD: SigilLogEntry = {
	level: 10,
	time: 1762510231900,
	pid: 9373,
	hostname: 'test-machine',
	agent: 'GenerateSigilIR',
	traceId: 'agent_test-456',
	event: 'spec_generated',
	data: {
		other: 'field',
	},
	msg: 'Spec generated without spec field',
};

export const SPEC_EVENT_INVALID_SPEC: SigilLogEntry = {
	level: 10,
	time: 1762510231900,
	pid: 9373,
	hostname: 'test-machine',
	agent: 'GenerateSigilIR',
	traceId: 'agent_test-456',
	event: 'spec_generated',
	data: {
		spec: {
			id: 'missing-required-fields',
		},
	},
	msg: 'Spec generated with invalid spec',
};
