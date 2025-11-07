import {describe, expect, it} from 'vitest';

import {isErr, isOk} from '@sigil/src/common/errors/result';
import type {ComponentSpec} from '@sigil/src/lib/generated/types/specification';

import {logEntry, VALID_COMPONENT_SPEC} from '../fixture.mock';

import {extractSpec} from './extractSpec';

describe('extractSpec', () => {
	describe('with valid spec_generated event', () => {
		it('should extract and validate ComponentSpec', () => {
			const logs = [
				logEntry({event: 'preprocessing_start', time: 1000}),
				logEntry({
					event: 'spec_generated',
					time: 2000,
					data: {spec: VALID_COMPONENT_SPEC},
				}),
			];

			const result = extractSpec(logs);

			expect(isOk(result)).toBe(true);
			if (!isOk(result)) {
				return;
			}

			expect(result.data).toEqual(VALID_COMPONENT_SPEC);
		});
	});

	describe('with multiple spec_generated events', () => {
		it('should return the last spec (most recent)', () => {
			const oldSpec: ComponentSpec = {
				...VALID_COMPONENT_SPEC,
				id: 'old-spec',
				title: 'Old Title',
			};

			const newSpec: ComponentSpec = {
				...VALID_COMPONENT_SPEC,
				id: 'new-spec',
				title: 'New Title',
			};

			const logs = [
				logEntry({
					event: 'spec_generated',
					time: 1000,
					data: {spec: oldSpec},
				}),
				logEntry({
					event: 'validation_failure',
					time: 1500,
					data: {attempt: 1, iteration: 0, errors: []},
				}),
				logEntry({
					event: 'spec_generated',
					time: 2000,
					data: {spec: newSpec},
				}),
			];

			const result = extractSpec(logs);

			expect(isOk(result)).toBe(true);
			if (!isOk(result)) {
				return;
			}

			expect(result.data.id).toBe('new-spec');
			expect(result.data.title).toBe('New Title');
		});
	});

	describe('without spec_generated event', () => {
		it('should return error', () => {
			const logs = [
				logEntry({event: 'preprocessing_start', time: 1000}),
				logEntry({
					event: 'chunking_complete',
					time: 2000,
					data: {chunkCount: 10, dataSizeKB: '50.00'},
				}),
			];

			const result = extractSpec(logs);

			expect(isErr(result)).toBe(true);
			if (!isErr(result)) {
				return;
			}

			expect(result.error).toBe('No spec_generated event found in logs');
		});
	});

	describe('with empty logs array', () => {
		it('should return error', () => {
			const result = extractSpec([]);

			expect(isErr(result)).toBe(true);
			if (!isErr(result)) {
				return;
			}

			expect(result.error).toBe('No spec_generated event found in logs');
		});
	});

	describe('with spec_generated event missing data field', () => {
		it('should return validation error', () => {
			const logs = [
				{
					level: 30,
					time: 1000,
					pid: 12345,
					hostname: 'test-host',
					agent: 'TestAgent',
					traceId: 'agent_test-trace',
					msg: 'Test log message',
					event: 'spec_generated',
				} as never,
			];

			const result = extractSpec(logs);

			expect(isErr(result)).toBe(true);
			if (!isErr(result)) {
				return;
			}

			expect(result.error).toContain('Invalid spec_generated event');
		});
	});

	describe('with spec_generated event missing spec field', () => {
		it('should return validation error', () => {
			const logs = [
				{
					level: 30,
					time: 1000,
					pid: 12345,
					hostname: 'test-host',
					agent: 'TestAgent',
					traceId: 'agent_test-trace',
					msg: 'Test log message',
					event: 'spec_generated',
					data: {other: 'field'},
				} as never,
			];

			const result = extractSpec(logs);

			expect(isErr(result)).toBe(true);
			if (!isErr(result)) {
				return;
			}

			expect(result.error).toContain('Invalid spec_generated event');
		});
	});

	describe('with invalid ComponentSpec schema', () => {
		it('should return validation error with details', () => {
			const logs = [
				{
					level: 30,
					time: 1000,
					pid: 12345,
					hostname: 'test-host',
					agent: 'TestAgent',
					traceId: 'agent_test-trace',
					msg: 'Test log message',
					event: 'spec_generated',
					data: {
						spec: {
							id: 'missing-required-fields',
						},
					},
				} as never,
			];

			const result = extractSpec(logs);

			expect(isErr(result)).toBe(true);
			if (!isErr(result)) {
				return;
			}

			expect(result.error).toContain('Invalid spec_generated event');
		});
	});
});
