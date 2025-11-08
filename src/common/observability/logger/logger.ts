import {randomUUID} from 'crypto';
import {join} from 'path';

import pino from 'pino';

import type {SigilLogEntry} from './events';

const LOG_LEVEL_TRACE = 'trace';
const LOG_LEVEL_DEBUG = 'debug';
const DEFAULT_CONSOLE_LOG_LEVEL = LOG_LEVEL_DEBUG;

/**
 * Fields managed by Pino runtime (set automatically)
 */
type PinoManagedFields = 'level' | 'time' | 'pid' | 'hostname' | 'msg';

/**
 * Fields set by Sigil logger bindings (set at logger creation, never in event data)
 */
type SigilLoggerBindings = 'agent' | 'traceId';

/**
 * Event data for Sigil log entries
 *
 * Excludes Pino-managed fields and logger bindings. The agent and traceId
 * are set at logger creation time and cannot be overridden in event data.
 */
export type SigilLogEventData = Omit<SigilLogEntry, PinoManagedFields | SigilLoggerBindings>;

/**
 * Typesafe logger interface for Sigil
 *
 * Wraps Pino logger with type-safe methods that enforce SigilLogEntry schema
 * using discriminated unions. TypeScript automatically validates event names and
 * their corresponding data shapes.
 *
 * @example
 * ```typescript
 * const logger = createSigilLogger('DataProcessingPipeline');
 *
 * // Event without data
 * logger.info({event: 'preprocessing_start'}, 'Starting preprocessing');
 *
 * // Event with data - TypeScript validates the shape
 * logger.info({
 *   event: 'attempt_start',
 *   data: {
 *     attempt: 1,
 *     maxAttempts: 3,
 *     iteration: 0,
 *     maxIterations: 10,
 *   }
 * }, 'Attempt started');
 *
 * // Create child logger (shares transport and traceId)
 * const analyserLogger = logger.child('Analyser');
 * ```
 */
export interface SigilLogger {
	trace: (eventData: SigilLogEventData, msg: string) => void;
	debug: (eventData: SigilLogEventData, msg: string) => void;
	info: (eventData: SigilLogEventData, msg: string) => void;
	warn: (eventData: SigilLogEventData, msg: string) => void;
	error: (eventData: SigilLogEventData, msg: string) => void;
	fatal: (eventData: SigilLogEventData, msg: string) => void;

	/**
	 * Create a child logger with a different agent name
	 *
	 * The child logger shares the same transport and traceId as the parent,
	 * but logs with a different agent attribution.
	 *
	 * @param agentName - Agent name for the child logger
	 * @returns Child logger with new agent name
	 */
	child: (agentName: string) => SigilLogger;
}

/**
 * Formats a Date as yyyy-MM-dd
 */
const formatDateAsYYYYMMDD = (date: Date): string => {
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, '0');
	const day = String(date.getDate()).padStart(2, '0');
	return `${year}-${month}-${day}`;
};

/**
 * Creates a child logger from a parent Pino logger
 *
 * The child logger shares the parent's transport and traceId but has a different
 * agent name for attribution.
 *
 * @param parentLogger - Parent Pino logger (shares transport)
 * @param agentName - Agent name for child logger
 * @param traceId - Shared trace ID from parent
 * @returns Child SigilLogger instance
 */
const createChildLogger = (parentLogger: pino.Logger, agentName: string, traceId: string): SigilLogger => {
	const childPino = parentLogger.child({agent: agentName, traceId});

	return {
		trace: (eventData: SigilLogEventData, msg: string) => {
			childPino.trace(eventData, msg);
		},
		debug: (eventData: SigilLogEventData, msg: string) => {
			childPino.debug(eventData, msg);
		},
		info: (eventData: SigilLogEventData, msg: string) => {
			childPino.info(eventData, msg);
		},
		warn: (eventData: SigilLogEventData, msg: string) => {
			childPino.warn(eventData, msg);
		},
		error: (eventData: SigilLogEventData, msg: string) => {
			childPino.error(eventData, msg);
		},
		fatal: (eventData: SigilLogEventData, msg: string) => {
			childPino.fatal(eventData, msg);
		},
		child: (childAgentName: string) => createChildLogger(parentLogger, childAgentName, traceId),
	};
};

/**
 * Creates a Sigil logger with structured logging capabilities
 *
 * Generates a unique traceId for correlating events within a single execution context.
 * In development mode, logs are written to both console (with pretty formatting) and
 * to timestamped JSONL files in the logs/yyyy-MM-dd/ directory. In production, logs
 * are written as JSON to stdout only.
 *
 * @param agentName - Name of the agent for log identification
 * @returns Typesafe SigilLogger instance with agent and traceId context
 *
 * @example
 * ```typescript
 * const logger = createSigilLogger('AnalyserAgent');
 * logger.info({event: 'attempt_start', attempt: 1, maxAttempts: 3, iteration: 0, maxIterations: 10}, 'Attempt started');
 * logger.trace({event: 'tool_call', attempt: 1, iteration: 1, toolName: 'sampler', toolInput: {}}, 'Tool called');
 * ```
 */
export const createSigilLogger = (agentName: string): SigilLogger => {
	const traceId = `agent_${randomUUID()}`;
	const isDevelopment = process.env.NODE_ENV === 'development';
	const consoleLogLevel = process.env.LOG_LEVEL || DEFAULT_CONSOLE_LOG_LEVEL;

	let logger: pino.Logger;

	if (isDevelopment) {
		const timestamp = Date.now();
		const dateFolder = formatDateAsYYYYMMDD(new Date());
		const logFilePath = join(process.cwd(), 'logs', dateFolder, `${agentName}-${timestamp}.jsonl`);

		try {
			logger = pino(
				{level: LOG_LEVEL_TRACE},
				pino.transport({
					targets: [
						{
							target: 'pino-pretty',
							level: consoleLogLevel,
							options: {
								colorize: true,
							},
						},
						{
							target: 'pino/file',
							level: LOG_LEVEL_TRACE,
							options: {
								destination: logFilePath,
								mkdir: true,
							},
						},
					],
				})
			);
		} catch (error) {
			console.warn(`⚠ Failed to initialise file logging: ${error instanceof Error ? error.message : 'Unknown error'}`);
			console.warn('Continuing with console-only logging');

			logger = pino({
				level: LOG_LEVEL_TRACE,
				transport: {
					target: 'pino-pretty',
					options: {
						colorize: true,
					},
				},
			});
		}
	} else {
		logger = pino({level: LOG_LEVEL_TRACE});
	}

	const pinoLogger = logger.child({agent: agentName, traceId});

	return {
		trace: (eventData: SigilLogEventData, msg: string) => {
			pinoLogger.trace(eventData, msg);
		},
		debug: (eventData: SigilLogEventData, msg: string) => {
			pinoLogger.debug(eventData, msg);
		},
		info: (eventData: SigilLogEventData, msg: string) => {
			pinoLogger.info(eventData, msg);
		},
		warn: (eventData: SigilLogEventData, msg: string) => {
			pinoLogger.warn(eventData, msg);
		},
		error: (eventData: SigilLogEventData, msg: string) => {
			pinoLogger.error(eventData, msg);
		},
		fatal: (eventData: SigilLogEventData, msg: string) => {
			pinoLogger.fatal(eventData, msg);
		},
		child: (childAgentName: string) =>
			createChildLogger(logger, childAgentName, traceId),
	};
};
