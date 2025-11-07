import {describe, expect, it} from 'vitest';

import {isErr, isOk} from '@sigil/src/common/errors/result';

import {extractSpec} from './extractSpec';
import {
	LOGS_WITHOUT_SPEC,
	LOGS_WITH_MULTIPLE_SPECS,
	LOGS_WITH_SPEC,
	SPEC_EVENT_INVALID_SPEC,
	SPEC_EVENT_MISSING_DATA_FIELD,
	SPEC_EVENT_MISSING_SPEC_FIELD,
	VALID_COMPONENT_SPEC,
} from './extractSpec.fixtures';

describe('extractSpec', () => {
	describe('with valid spec_generated event', () => {
		it('should extract and validate ComponentSpec', () => {
			const result = extractSpec(LOGS_WITH_SPEC);

			expect(isOk(result)).toBe(true);
			if (!isOk(result)) {
				return;
			}

			expect(result.data).toEqual(VALID_COMPONENT_SPEC);
		});
	});

	describe('with multiple spec_generated events', () => {
		it('should return the last spec (most recent)', () => {
			const result = extractSpec(LOGS_WITH_MULTIPLE_SPECS);

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
			const result = extractSpec(LOGS_WITHOUT_SPEC);

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
			const result = extractSpec([SPEC_EVENT_MISSING_DATA_FIELD]);

			expect(isErr(result)).toBe(true);
			if (!isErr(result)) {
				return;
			}

			expect(result.error).toContain('Invalid spec_generated event');
		});
	});

	describe('with spec_generated event missing spec field', () => {
		it('should return validation error', () => {
			const result = extractSpec([SPEC_EVENT_MISSING_SPEC_FIELD]);

			expect(isErr(result)).toBe(true);
			if (!isErr(result)) {
				return;
			}

			expect(result.error).toContain('Invalid spec_generated event');
		});
	});

	describe('with invalid ComponentSpec schema', () => {
		it('should return validation error with details', () => {
			const result = extractSpec([SPEC_EVENT_INVALID_SPEC]);

			expect(isErr(result)).toBe(true);
			if (!isErr(result)) {
				return;
			}

			expect(result.error).toContain('Invalid spec_generated event');
		});
	});
});
