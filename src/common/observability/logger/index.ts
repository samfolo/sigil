export {createSigilLogger} from './logger';
export type {SigilLogger, SigilLogEventData} from './logger';

// Base schema and combined log entry types
export type {PinoLogBase} from './baseSchema';
export {PinoLogBaseSchema} from './baseSchema';
export type {SigilLogEntry} from './events';
export {SigilLogEntrySchema, isSigilLogEntry} from './events';

// Framework event types and schemas
export type {
	AttemptCompleteEvent,
	AttemptStartEvent,
	FailureEvent,
	FrameworkLogEvent,
	SuccessEvent,
	ToolCallEvent,
	ToolResultEvent,
	ValidationFailureEvent,
	ValidationLayerCompleteEvent,
	ValidationLayerStartEvent,
} from './frameworkEvents';

export {
	AttemptCompleteEventSchema,
	AttemptStartEventSchema,
	FailureEventSchema,
	FrameworkLogEventSchema,
	SuccessEventSchema,
	ToolCallEventSchema,
	ToolResultEventSchema,
	ValidationFailureEventSchema,
	ValidationLayerCompleteEventSchema,
	ValidationLayerStartEventSchema,
} from './frameworkEvents';

// Application event types and schemas
export type {
	AnalyserCompleteEvent,
	ApplicationLogEvent,
	ChunkingCompleteEvent,
	ClientDisconnectedEvent,
	EmbeddingProgressEvent,
	PreprocessingStartEvent,
	RequestCancelledEvent,
	SpecGeneratedEvent,
	UnexpectedErrorEvent,
	VignettesGeneratedEvent,
} from './applicationEvents';

export {
	AnalyserCompleteEventSchema,
	ApplicationLogEventSchema,
	ChunkingCompleteEventSchema,
	ClientDisconnectedEventSchema,
	EmbeddingProgressEventSchema,
	PreprocessingStartEventSchema,
	RequestCancelledEventSchema,
	SpecGeneratedEventSchema,
	UnexpectedErrorEventSchema,
	VignettesGeneratedEventSchema,
} from './applicationEvents';
