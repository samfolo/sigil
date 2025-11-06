/**
 * Type verification tests for Sigil log event schemas
 *
 * Validates that schemas correctly parse log events and provide type safety.
 */

import {describe, expect, it} from 'vitest';

import {
	SigilLogEntrySchema,
	isSigilLogEntry,
} from './events';
import {AttemptStartEventSchema, ToolCallEventSchema} from './frameworkEvents';

describe('Sigil log event schemas', () => {
	describe('AttemptStartEventSchema', () => {
		it('should parse valid attempt_start event', () => {
			const validEvent = {
				level: 30,
				time: 1762297706995,
				pid: 20145,
				hostname: 'test-host',
				agent: 'Analyser',
				traceId: 'agent_test-uuid',
				event: 'attempt_start',
				data: {
					attempt: 1,
					maxAttempts: 3,
					iteration: 0,
					maxIterations: 15,
				},
				msg: 'Attempt started',
			};

			const result = AttemptStartEventSchema.safeParse(validEvent);
			expect(result.success).toBe(true);
		});

		it('should reject attempt_start event with missing iteration', () => {
			const invalidEvent = {
				level: 30,
				time: 1762297706995,
				agent: 'Analyser',
				traceId: 'agent_test-uuid',
				event: 'attempt_start',
				data: {
					attempt: 1,
					maxAttempts: 3,
					// Missing iteration and maxIterations
				},
				msg: 'Attempt started',
			};

			const result = AttemptStartEventSchema.safeParse(invalidEvent);
			expect(result.success).toBe(false);
		});
	});

	describe('ToolCallEventSchema', () => {
		it('should parse valid tool_call event', () => {
			const validEvent = {
				level: 10,
				time: 1762297708734,
				pid: 20145,
				hostname: 'test-host',
				agent: 'Analyser',
				traceId: 'agent_test-uuid',
				event: 'tool_call',
				data: {
					attempt: 1,
					iteration: 1,
					toolName: 'parse_yaml',
					toolInput: {},
				},
				msg: 'Tool called',
			};

			const result = ToolCallEventSchema.safeParse(validEvent);
			expect(result.success).toBe(true);
		});
	});

	describe('SigilLogEntrySchema discriminated union', () => {
		it('should parse different event types', () => {
			const attemptStart = {
				level: 30,
				time: Date.now(),
				agent: 'TestAgent',
				traceId: 'agent_test',
				event: 'attempt_start',
				data: {
					attempt: 1,
					maxAttempts: 3,
					iteration: 0,
					maxIterations: 15,
				},
				msg: 'Test',
			};

			const success = {
				level: 30,
				time: Date.now(),
				agent: 'TestAgent',
				traceId: 'agent_test',
				event: 'success',
				data: {
					tokens: {
						input: 100,
						output: 200,
					},
					latency: 1000,
				},
				msg: 'Success',
			};

			expect(SigilLogEntrySchema.safeParse(attemptStart).success).toBe(true);
			expect(SigilLogEntrySchema.safeParse(success).success).toBe(true);
		});
	});

	describe('isSigilLogEntry type guard', () => {
		it('should return true for valid log entry', () => {
			const validEntry = {
				level: 30,
				time: Date.now(),
				agent: 'TestAgent',
				traceId: 'agent_test',
				event: 'preprocessing_start',
				msg: 'Starting preprocessing',
			};

			expect(isSigilLogEntry(validEntry)).toBe(true);
		});

		it('should return false for invalid log entry', () => {
			const invalidEntry = {
				event: 'unknown_event',
				msg: 'Test',
			};

			expect(isSigilLogEntry(invalidEntry)).toBe(false);
		});
	});
});
