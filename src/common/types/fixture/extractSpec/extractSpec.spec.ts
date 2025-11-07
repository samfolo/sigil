import {describe, expect, it} from 'vitest';

import {isErr, isOk} from '@sigil/src/common/errors/result';
import type {ComponentSpec} from '@sigil/src/lib/generated/types/specification';

import {logEntry} from '../fixture.mock';

import {extractSpec} from './extractSpec';

const VALID_COMPONENT_SPEC: ComponentSpec = {
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
				logEntry({event: 'validation_failure', time: 1500}),
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
				logEntry({event: 'chunking_complete', time: 2000}),
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
				logEntry({
					event: 'spec_generated',
					time: 1000,
				}),
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
				logEntry({
					event: 'spec_generated',
					time: 1000,
					data: {other: 'field'},
				}),
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
				logEntry({
					event: 'spec_generated',
					time: 1000,
					data: {
						spec: {
							id: 'missing-required-fields',
						},
					},
				}),
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
