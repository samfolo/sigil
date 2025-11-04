import {randomUUID} from 'crypto';
import {join} from 'path';

import pino from 'pino';

const LOG_LEVEL_TRACE = 'trace';
const LOG_LEVEL_DEBUG = 'debug';
const DEFAULT_CONSOLE_LOG_LEVEL = LOG_LEVEL_DEBUG;

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
 * Creates an agent logger with structured logging capabilities
 *
 * Generates a unique traceId for correlating events within a single agent execution.
 * In development mode, logs are written to both console (with pretty formatting) and
 * to timestamped JSONL files in the logs/yyyy-MM-dd/ directory. In production, logs
 * are written as JSON to stdout only.
 *
 * @param agentName - Name of the agent for log identification
 * @returns Pino logger instance with agent and traceId context
 *
 * @example
 * ```typescript
 * const logger = createAgentLogger('AnalyserAgent');
 * logger.info({event: 'attempt_start', attempt: 1}, 'Attempt started');
 * logger.trace({event: 'tool_call', toolName: 'sampler'}, 'Tool called');
 * ```
 */
export const createAgentLogger = (agentName: string): pino.Logger => {
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

	return logger.child({agent: agentName, traceId});
};
