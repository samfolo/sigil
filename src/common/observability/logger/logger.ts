import {randomUUID} from 'crypto';
import {join} from 'path';

import pino from 'pino';

import {LOGS_FILENAME} from '@sigil/src/common/run';

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
 * Extends Pino logger to expose full Pino API (flush, final, etc.) while
 * enforcing type-safe SigilLogEntry schema for log methods using discriminated
 * unions. TypeScript automatically validates event names and their corresponding
 * data shapes.
 *
 * @example
 * ```typescript
 * const runId = generateRunId();
 * const logger = createSigilLogger('DataProcessingPipeline', runId);
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
 *
 * // Use Pino utilities
 * const finalLogger = logger.final();
 * finalLogger.info({event: 'shutdown'}, 'Process exiting');
 * ```
 */
export interface SigilLogger extends Omit<pino.Logger, 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal' | 'child'> {
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
		...childPino,
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
 * In development mode with persist enabled, logs are written to both console (with pretty
 * formatting) and to JSONL files in the runs/<runId>/ directory. In production, logs
 * are always written as JSON to stdout (persist option is ignored).
 *
 * @param agentName - Name of the agent for log identification
 * @param runId - Run ID for correlating logs with other artifacts
 * @param options - Optional configuration
 * @param options.persist - Whether to persist logs to disk. Defaults to true in development. Ignored in production (logs always go to stdout).
 * @returns Typesafe SigilLogger instance with agent and traceId context
 *
 * @example
 * ```typescript
 * const runId = generateRunId();
 * const logger = createSigilLogger('AnalyserAgent', runId); // persist: true by default
 * logger.info({event: 'attempt_start', data: {attempt: 1, maxAttempts: 3, iteration: 0, maxIterations: 10}}, 'Attempt started');
 *
 * // Without persistence (console only in development)
 * const logger = createSigilLogger('AnalyserAgent', runId, {persist: false});
 * ```
 */
export const createSigilLogger = (agentName: string, runId: string, options?: {persist?: boolean}): SigilLogger => {
	const traceId = `agent_${randomUUID()}`;
	const isDevelopment = process.env.NODE_ENV === 'development';
	const consoleLogLevel = process.env.LOG_LEVEL || DEFAULT_CONSOLE_LOG_LEVEL;
	const persist = options?.persist ?? true;

	let logger: pino.Logger;

	if (isDevelopment) {
		const logFilePath = join(process.cwd(), 'runs', runId, LOGS_FILENAME);

		if (persist) {
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
		...pinoLogger,
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
