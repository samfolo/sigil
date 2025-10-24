/**
 * Tests for validateLayers function
 */

import {describe, expect, it, vi} from 'vitest';
import {ZodError} from 'zod';

import type {ValidationFailedContext} from '@sigil/src/common/errors';
import {err, isErr, isOk} from '@sigil/src/common/errors';

import type {ValidationLayerCallbacks} from '../types';
import {ZOD_LAYER_METADATA} from '../validators';

import {validateLayers} from './validateLayers';
import {
	DEFAULT_PASSING_VALIDATOR_DESCRIPTION,
	INVALID_OUTPUT_MISSING_FIELD,
	INVALID_OUTPUT_WRONG_TYPE,
	VALID_OUTPUT,
	ValidOutputSchema,
	createConditionalValidator,
	createFailingValidator,
	createPassingValidator,
} from './validateLayers.fixtures';

describe('validateLayers', () => {
	describe('Zod Validation (Layer 1)', () => {
		it('should return success Result for valid output', async () => {
			const result = await validateLayers(VALID_OUTPUT, ValidOutputSchema, []);

			expect(isOk(result)).toBe(true);

			if (isOk(result)) {
				expect(result.data).toEqual(VALID_OUTPUT);
			}
		});

		it('should return error Result for output with wrong types', async () => {
			const result = await validateLayers(
				INVALID_OUTPUT_WRONG_TYPE,
				ValidOutputSchema,
				[]
			);

			expect(isErr(result)).toBe(true);

			if (isErr(result)) {
				expect(result.error).toBeInstanceOf(ZodError);
			}
		});

		it('should return error Result for output with missing fields', async () => {
			const result = await validateLayers(
				INVALID_OUTPUT_MISSING_FIELD,
				ValidOutputSchema,
				[]
			);

			expect(isErr(result)).toBe(true);

			if (isErr(result)) {
				expect(result.error).toBeInstanceOf(ZodError);
			}
		});

		it('should preserve validated output in success case', async () => {
			const result = await validateLayers(VALID_OUTPUT, ValidOutputSchema, []);

			expect(isOk(result)).toBe(true);

			if (isOk(result)) {
				expect(result.data.result).toBe('success');
				expect(result.data.value).toBe(42);
			}
		});

		it('should include ZodError details in failure case', async () => {
			const result = await validateLayers(
				INVALID_OUTPUT_WRONG_TYPE,
				ValidOutputSchema,
				[]
			);

			expect(isErr(result)).toBe(true);

			if (isErr(result) && result.error instanceof ZodError) {
				expect(result.error.issues).toBeDefined();
				expect(result.error.issues.length).toBeGreaterThan(0);
			}
		});
	});

	describe('Custom Validators (Layers 2+)', () => {
		it('should run custom validator after successful Zod validation', async () => {
			const passingValidator = createPassingValidator('test-validator');

			const result = await validateLayers(VALID_OUTPUT, ValidOutputSchema, [
				passingValidator,
			]);

			expect(isOk(result)).toBe(true);
		});

		it('should return success when custom validator passes', async () => {
			const conditionalValidator = createConditionalValidator(
				'value-check',
				(output) => output.value === 42
			);

			const result = await validateLayers(VALID_OUTPUT, ValidOutputSchema, [
				conditionalValidator,
			]);

			expect(isOk(result)).toBe(true);

			if (isOk(result)) {
				expect(result.data).toEqual(VALID_OUTPUT);
			}
		});

		it('should return error when custom validator fails', async () => {
			const failingValidator = createFailingValidator(
				'strict-validator',
				'Custom validation failed'
			);

			const result = await validateLayers(VALID_OUTPUT, ValidOutputSchema, [
				failingValidator,
			]);

			expect(isErr(result)).toBe(true);

			if (isErr(result) && result.error instanceof Error) {
				expect(result.error.message).toBe('Custom validation failed');
			}
		});

		it('should NOT run custom validator if Zod validation fails (fail fast)', async () => {
			let customValidatorRan = false;

			const trackingValidator = createConditionalValidator('tracking', () => {
				customValidatorRan = true;
				return true;
			});

			const result = await validateLayers(
				INVALID_OUTPUT_WRONG_TYPE,
				ValidOutputSchema,
				[trackingValidator]
			);

			expect(isErr(result)).toBe(true);
			expect(customValidatorRan).toBe(false);
		});
	});

	describe('Sequential Validation', () => {
		it('should run all validators in order when all pass', async () => {
			const executionOrder: string[] = [];

			const validator1 = createConditionalValidator('first', (output) => {
				executionOrder.push('first');
				return output.value > 0;
			});

			const validator2 = createConditionalValidator('second', (output) => {
				executionOrder.push('second');
				return output.result.length > 0;
			});

			const validator3 = createConditionalValidator('third', (output) => {
				executionOrder.push('third');
				return output.value < 100;
			});

			const result = await validateLayers(VALID_OUTPUT, ValidOutputSchema, [
				validator1,
				validator2,
				validator3,
			]);

			expect(isOk(result)).toBe(true);
			expect(executionOrder).toEqual(['first', 'second', 'third']);
		});

		it('should stop at first failing validator (fail fast)', async () => {
			const executionOrder: string[] = [];

			const validator1 = createConditionalValidator('first', (output) => {
				executionOrder.push('first');
				return output.value > 0;
			});

			const validator2 = createConditionalValidator('second', () => {
				executionOrder.push('second');
				return false; // This will fail
			});

			const validator3 = createConditionalValidator('third', (output) => {
				executionOrder.push('third');
				return output.value < 100;
			});

			const result = await validateLayers(VALID_OUTPUT, ValidOutputSchema, [
				validator1,
				validator2,
				validator3,
			]);

			expect(isErr(result)).toBe(true);
			expect(executionOrder).toEqual(['first', 'second']); // third should not run
		});

		it('should not run remaining validators after failure', async () => {
			let validator3Ran = false;

			const validator1 = createPassingValidator('first');
			const validator2 = createFailingValidator('second', 'Second failed');
			const validator3 = createConditionalValidator('third', () => {
				validator3Ran = true;
				return true;
			});

			const result = await validateLayers(VALID_OUTPUT, ValidOutputSchema, [
				validator1,
				validator2,
				validator3,
			]);

			expect(isErr(result)).toBe(true);
			expect(validator3Ran).toBe(false);
		});

		it('should track which layer failed', async () => {
			const validator1 = createPassingValidator('first');
			const validator2 = createFailingValidator('second', 'Second layer failed');
			const validator3 = createPassingValidator('third');

			const result = await validateLayers(VALID_OUTPUT, ValidOutputSchema, [
				validator1,
				validator2,
				validator3,
			]);

			expect(isErr(result)).toBe(true);

			if (isErr(result) && result.error instanceof Error) {
				expect(result.error.message).toBe('Second layer failed');
			}
		});
	});

	describe('Empty Custom Validators', () => {
		it('should succeed with empty custom validators array', async () => {
			const result = await validateLayers(VALID_OUTPUT, ValidOutputSchema, []);

			expect(isOk(result)).toBe(true);

			if (isOk(result)) {
				expect(result.data).toEqual(VALID_OUTPUT);
			}
		});

		it('should only run Zod validation when no custom validators provided', async () => {
			const result = await validateLayers(VALID_OUTPUT, ValidOutputSchema, []);

			expect(isOk(result)).toBe(true);
		});
	});

	describe('Error Types', () => {
		it('should return ZodError for schema failures', async () => {
			const result = await validateLayers(
				INVALID_OUTPUT_WRONG_TYPE,
				ValidOutputSchema,
				[]
			);

			expect(isErr(result)).toBe(true);

			if (isErr(result)) {
				expect(result.error).toBeInstanceOf(ZodError);
			}
		});

		it('should return Error for custom validator failures', async () => {
			const failingValidator = createFailingValidator(
				'test',
				'Custom error message'
			);

			const result = await validateLayers(VALID_OUTPUT, ValidOutputSchema, [
				failingValidator,
			]);

			expect(isErr(result)).toBe(true);

			if (isErr(result) && result.error instanceof Error) {
				expect(result.error.message).toBe('Custom error message');
			}
		});

		it('should preserve original error type from validators', async () => {
			const customErrorValidator = createConditionalValidator('custom', () => {
				throw new TypeError('Type error occurred');
			});

			const result = await validateLayers(VALID_OUTPUT, ValidOutputSchema, [
				customErrorValidator,
			]);

			expect(isErr(result)).toBe(true);

			if (isErr(result)) {
				expect(result.error).toBeInstanceOf(TypeError);
			}
		});

		it('should work with different error types (Error, custom objects, etc.)', async () => {
			const customObjectErrorValidator: typeof createConditionalValidator = (
				name
			) => ({
					name,
					validate: async () => err({code: 'CUSTOM_ERROR', message: 'Custom object error'}),
				});

			const validator = customObjectErrorValidator('custom-object');

			const result = await validateLayers(VALID_OUTPUT, ValidOutputSchema, [
				validator,
			]);

			expect(isErr(result)).toBe(true);

			if (
				isErr(result) &&
				typeof result.error === 'object' &&
				result.error !== null &&
				'code' in result.error &&
				'message' in result.error
			) {
				expect(result.error.code).toBe('CUSTOM_ERROR');
				expect(result.error.message).toBe('Custom object error');
			}
		});
	});

	describe('Validation Layer Callbacks', () => {
		it('should call onLayerStart for Zod validation', async () => {
			const onLayerStart = vi.fn();
			const callbacks: ValidationLayerCallbacks = {
				onLayerStart,
			};

			await validateLayers(VALID_OUTPUT, ValidOutputSchema, [], callbacks);

			expect(onLayerStart).toHaveBeenCalledWith({
				...ZOD_LAYER_METADATA,
				type: 'zod',
			});
		});

		it('should call onLayerComplete with success for passing Zod validation', async () => {
			const onLayerComplete = vi.fn();
			const callbacks: ValidationLayerCallbacks = {
				onLayerComplete,
			};

			await validateLayers(VALID_OUTPUT, ValidOutputSchema, [], callbacks);

			expect(onLayerComplete).toHaveBeenCalledWith({
				...ZOD_LAYER_METADATA,
				type: 'zod',
				success: true,
			});
		});

		it('should call onLayerComplete with error for failing Zod validation', async () => {
			const onLayerComplete = vi.fn();
			const callbacks: ValidationLayerCallbacks = {
				onLayerComplete,
			};

			await validateLayers(
				INVALID_OUTPUT_WRONG_TYPE,
				ValidOutputSchema,
				[],
				callbacks
			);

			expect(onLayerComplete).toHaveBeenCalledOnce();

			const call = onLayerComplete.mock.calls.at(0)?.at(0);

			if (call && !call.success) {
				expect(call.name).toBe(ZOD_LAYER_METADATA.name);
				expect(call.description).toBe(ZOD_LAYER_METADATA.description);
				expect(call.type).toBe('zod');
				expect(call.error).toBeInstanceOf(ZodError);
			} else {
				throw new Error('Expected failure result');
			}
		});

		it('should call onLayerStart and onLayerComplete for each custom validator', async () => {
			const onLayerStart = vi.fn();
			const onLayerComplete = vi.fn();
			const callbacks: ValidationLayerCallbacks = {
				onLayerStart,
				onLayerComplete,
			};

			const validator1 = createPassingValidator('first-validator');
			const validator2 = createPassingValidator('second-validator');

			await validateLayers(
				VALID_OUTPUT,
				ValidOutputSchema,
				[validator1, validator2],
				callbacks
			);

			// Called for Zod + 2 custom validators
			expect(onLayerStart).toHaveBeenCalledTimes(3);
			expect(onLayerComplete).toHaveBeenCalledTimes(3);

			// Check custom validator calls
			expect(onLayerStart).toHaveBeenCalledWith({
				name: 'first-validator',
				description: DEFAULT_PASSING_VALIDATOR_DESCRIPTION,
				type: 'custom',
			});
			expect(onLayerStart).toHaveBeenCalledWith({
				name: 'second-validator',
				description: DEFAULT_PASSING_VALIDATOR_DESCRIPTION,
				type: 'custom',
			});
		});

		it('should call onLayerComplete with success for passing custom validators', async () => {
			const onLayerComplete = vi.fn();
			const callbacks: ValidationLayerCallbacks = {
				onLayerComplete,
			};

			const validator = createPassingValidator('test-validator');

			await validateLayers(
				VALID_OUTPUT,
				ValidOutputSchema,
				[validator],
				callbacks
			);

			const customValidatorCall = onLayerComplete.mock.calls.at(1)?.at(0);

			if (customValidatorCall && customValidatorCall.success) {
				expect(customValidatorCall.name).toBe('test-validator');
				expect(customValidatorCall.type).toBe('custom');
			} else {
				throw new Error('Expected success result');
			}
		});

		it('should call onLayerComplete with error for failing custom validators', async () => {
			const onLayerComplete = vi.fn();
			const callbacks: ValidationLayerCallbacks = {
				onLayerComplete,
			};

			const validator = createFailingValidator('test-validator', 'Test error');

			await validateLayers(
				VALID_OUTPUT,
				ValidOutputSchema,
				[validator],
				callbacks
			);

			const customValidatorCall = onLayerComplete.mock.calls.at(1)?.at(0);

			if (customValidatorCall && !customValidatorCall.success) {
				expect(customValidatorCall.name).toBe('test-validator');
				expect(customValidatorCall.type).toBe('custom');
				expect(customValidatorCall.error).toBeInstanceOf(Error);
			} else {
				throw new Error('Expected failure result');
			}
		});

		it('should stop calling callbacks after first failure', async () => {
			const onLayerStart = vi.fn();
			const onLayerComplete = vi.fn();
			const callbacks: ValidationLayerCallbacks = {
				onLayerStart,
				onLayerComplete,
			};

			const validator1 = createPassingValidator('first');
			const validator2 = createFailingValidator('second', 'Failed');
			const validator3 = createPassingValidator('third');

			await validateLayers(
				VALID_OUTPUT,
				ValidOutputSchema,
				[validator1, validator2, validator3],
				callbacks
			);

			// Zod + first + second (third should not be called)
			expect(onLayerStart).toHaveBeenCalledTimes(3);
			expect(onLayerComplete).toHaveBeenCalledTimes(3);

			// Verify third was not called
			expect(onLayerStart).not.toHaveBeenCalledWith({
				name: 'third',
				type: 'custom',
			});
		});
	});

	describe('Mutation Detection', () => {
		const isValidationFailedContext = (
			value: unknown
		): value is ValidationFailedContext => (
				typeof value === 'object' &&
				value !== null &&
				'layer' in value &&
				'reason' in value
			);

		it('should prevent validators from mutating output properties', async () => {
			const mutatingValidator = createConditionalValidator('mutating', (output) => {
				// Intentionally bypass TypeScript to test runtime mutation detection
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				(output as any).result = 'mutated';
				return true;
			});

			const result = await validateLayers(VALID_OUTPUT, ValidOutputSchema, [
				mutatingValidator,
			]);

			expect(isErr(result)).toBe(true);

			if (isErr(result) && isValidationFailedContext(result.error)) {
				expect(result.error.layer).toBe('mutating');
				expect(result.error.reason).toContain('mutate input');
			} else {
				throw new Error('Expected ValidationFailedContext error');
			}
		});

		it('should prevent validators from adding new properties', async () => {
			const mutatingValidator = createConditionalValidator('mutating', (output) => {
				// Intentionally bypass TypeScript to test runtime mutation detection
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				(output as any).newProp = 'added';
				return true;
			});

			const result = await validateLayers(VALID_OUTPUT, ValidOutputSchema, [
				mutatingValidator,
			]);

			expect(isErr(result)).toBe(true);

			if (isErr(result) && isValidationFailedContext(result.error)) {
				expect(result.error.layer).toBe('mutating');
			} else {
				throw new Error('Expected ValidationFailedContext error');
			}
		});

		it('should prevent validators from mutating nested objects', async () => {
			const nestedOutput = {result: 'success', value: 42, nested: {value: 42}};
			const nestedSchema = ValidOutputSchema.extend({
				nested: ValidOutputSchema.pick({value: true}),
			});

			const mutatingValidator = createConditionalValidator('mutating', (output) => {
				// Intentionally bypass TypeScript to test runtime mutation detection
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				(output as any).nested.value = 100;
				return true;
			});

			const result = await validateLayers(nestedOutput, nestedSchema, [
				mutatingValidator,
			]);

			expect(isErr(result)).toBe(true);

			if (isErr(result) && isValidationFailedContext(result.error)) {
				expect(result.error.layer).toBe('mutating');
			} else {
				throw new Error(
					`Expected ValidationFailedContext error, got: ${JSON.stringify(result)}`
				);
			}
		});

		it('should prevent validators from mutating arrays', async () => {
			const arrayOutput = {result: 'success', value: 42, items: [1, 2, 3]};
			const arraySchema = ValidOutputSchema.extend({
				items: ValidOutputSchema.shape.value.array(),
			});

			const mutatingValidator = createConditionalValidator('mutating', (output) => {
				// Intentionally bypass TypeScript to test runtime mutation detection
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				(output as any).items.push(4);
				return true;
			});

			const result = await validateLayers(arrayOutput, arraySchema, [
				mutatingValidator,
			]);

			expect(isErr(result)).toBe(true);

			if (isErr(result) && isValidationFailedContext(result.error)) {
				expect(result.error.layer).toBe('mutating');
			} else {
				throw new Error('Expected ValidationFailedContext error');
			}
		});

		it('should allow validators to read properties', async () => {
			const readingValidator = createConditionalValidator('reading', (output) => {
				const _value = output.result;
				const _number = output.value;
				return true;
			});

			const result = await validateLayers(VALID_OUTPUT, ValidOutputSchema, [
				readingValidator,
			]);

			expect(isOk(result)).toBe(true);
		});

		it('should call onLayerComplete with mutation error details', async () => {
			const onLayerComplete = vi.fn();
			const callbacks: ValidationLayerCallbacks = {
				onLayerComplete,
			};

			const mutatingValidator = createConditionalValidator('mutating', (output) => {
				// Intentionally bypass TypeScript to test runtime mutation detection
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				(output as any).result = 'mutated';
				return true;
			});

			await validateLayers(
				VALID_OUTPUT,
				ValidOutputSchema,
				[mutatingValidator],
				callbacks
			);

			const customValidatorCall = onLayerComplete.mock.calls.at(1)?.at(0);

			if (customValidatorCall && !customValidatorCall.success) {
				expect(customValidatorCall.name).toBe('mutating');
				expect(customValidatorCall.type).toBe('custom');

				if (isValidationFailedContext(customValidatorCall.error)) {
					expect(customValidatorCall.error.layer).toBe('mutating');
					expect(customValidatorCall.error.reason).toContain('mutate input');
				} else {
					throw new Error('Expected ValidationFailedContext error');
				}
			} else {
				throw new Error('Expected failure result');
			}
		});
	});
});
