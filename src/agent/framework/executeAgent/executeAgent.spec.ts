/**
 * Tests for executeAgent function
 */

import {describe, expect, it, vi} from 'vitest';

import {
	isErr,
	isOk,
	AGENT_ERROR_CODES,
} from '@sigil/src/common/errors';

// Mock the Anthropic client to avoid real API calls in tests
vi.mock('@sigil/src/agent/clients/anthropic', () => ({
	createAnthropicClient: vi.fn(() => ({
		messages: {
			create: vi.fn(async () => ({
				id: 'msg_test123',
				type: 'message',
				role: 'assistant',
				model: 'claude-sonnet-4-5-20250929',
				content: [
					{
						type: 'tool_use',
						id: 'toolu_test123',
						name: 'generate_output',
						input: {result: 'success result'},
					},
				],
				stop_reason: 'end_turn',
				stop_sequence: null,
				usage: {
					input_tokens: 100,
					output_tokens: 50,
				},
			})),
		},
	})),
}));

import {VALID_MINIMAL_AGENT} from '../defineAgent/defineAgent.fixtures';

import {executeAgent} from './executeAgent';
import {
	VALID_EXECUTE_OPTIONS,
	VALID_EXECUTE_OPTIONS_WITH_MAX_ATTEMPTS_OVERRIDE,
	EXPECTED_SUCCESS,
	createExecuteOptionsWithCallbackTracking,
} from './executeAgent.fixtures';

describe('executeAgent', () => {
	describe('Type Safety', () => {
		it('should preserve generic type parameters', async () => {
			const result = await executeAgent(
				VALID_MINIMAL_AGENT,
				VALID_EXECUTE_OPTIONS
			);

			// Type narrowing should work correctly with isErr
			if (isErr(result)) {
				// If types are preserved correctly, this should compile without errors
				const errors = result.error;
				const firstError = errors.at(0);

				expect(Array.isArray(errors)).toBe(true);
				expect(firstError).toBeDefined();
			} else {
				// If types are preserved correctly, this should compile without errors
				const output = result.data.output;
				const attempts = result.data.attempts;

				expect(output).toBeDefined();
				expect(typeof attempts).toBe('number');
			}
		});
	});

	describe.skip('Future Implementation Tests', () => {
		// These tests define expected behaviour for the full implementation.
		// Unskip and implement when executeAgent logic is added.

		describe('Successful execution', () => {
			it('should return success Result on first attempt', async () => {
				const result = await executeAgent(
					VALID_MINIMAL_AGENT,
					VALID_EXECUTE_OPTIONS
				);

				expect(isOk(result)).toBe(true);

				if (isOk(result)) {
					expect(result.data.output).toBeDefined();
					expect(result.data.attempts).toBe(1);
				}
			});

			it('should include output in ExecuteSuccess', async () => {
				const result = await executeAgent(
					VALID_MINIMAL_AGENT,
					VALID_EXECUTE_OPTIONS
				);

				expect(isOk(result)).toBe(true);

				if (isOk(result)) {
					expect(result.data.output).toEqual(EXPECTED_SUCCESS.output);
					expect(result.data.output.result).toBe('success result');
				}
			});

			it('should track attempts correctly', async () => {
				const result = await executeAgent(
					VALID_MINIMAL_AGENT,
					VALID_EXECUTE_OPTIONS
				);

				expect(isOk(result)).toBe(true);

				if (isOk(result)) {
					expect(result.data.attempts).toBe(1);
					expect(result.data.attempts).toBeGreaterThan(0);
					expect(result.data.attempts).toBeLessThanOrEqual(3);
				}
			});

			it('should populate metadata (cost, latency, tokens)', async () => {
				const result = await executeAgent(
					VALID_MINIMAL_AGENT,
					VALID_EXECUTE_OPTIONS
				);

				expect(isOk(result)).toBe(true);

				if (isOk(result)) {
					expect(result.data.metadata).toBeDefined();
					expect(result.data.metadata?.cost).toBeTypeOf('number');
					expect(result.data.metadata?.latency).toBeTypeOf('number');
					expect(result.data.metadata?.tokens).toBeDefined();
					expect(result.data.metadata?.tokens?.input).toBeTypeOf('number');
					expect(result.data.metadata?.tokens?.output).toBeTypeOf('number');
				}
			});
		});

		describe('Retry logic', () => {
			it('should retry on validation failure', async () => {
				// Mock validation failure on first attempt, success on second
				const result = await executeAgent(
					VALID_MINIMAL_AGENT,
					VALID_EXECUTE_OPTIONS
				);

				expect(isOk(result)).toBe(true);

				if (isOk(result)) {
					expect(result.data.attempts).toBeGreaterThan(1);
				}
			});

			it('should increment attempt counter', async () => {
				// Mock multiple validation failures
				const result = await executeAgent(
					VALID_MINIMAL_AGENT,
					VALID_EXECUTE_OPTIONS
				);

				expect(isOk(result)).toBe(true);

				if (isOk(result)) {
					expect(result.data.attempts).toBe(3); // After 2 failures
				}
			});

			it('should invoke onAttemptStart callback for each attempt', async () => {
				const {options, invocations} =
					createExecuteOptionsWithCallbackTracking();

				await executeAgent(VALID_MINIMAL_AGENT, options);

				const attemptStarts = invocations.filter(
					(i) => i.type === 'onAttemptStart'
				);

				expect(attemptStarts.length).toBeGreaterThan(0);
				expect(attemptStarts.at(0)?.state.attempt).toBe(1);
			});

			it('should invoke onValidationFailure callback', async () => {
				const {options, invocations} =
					createExecuteOptionsWithCallbackTracking();

				await executeAgent(VALID_MINIMAL_AGENT, options);

				const validationFailures = invocations.filter(
					(i) => i.type === 'onValidationFailure'
				);

				expect(validationFailures.length).toBeGreaterThan(0);
			});
		});

		describe('Max attempts exceeded', () => {
			it('should return error Result after max attempts', async () => {
				// Mock validation failure on all attempts
				const result = await executeAgent(
					VALID_MINIMAL_AGENT,
					VALID_EXECUTE_OPTIONS
				);

				expect(isErr(result)).toBe(true);
			});

			it('should return AgentError with MAX_ATTEMPTS_EXCEEDED code', async () => {
				// Mock validation failure on all attempts
				const result = await executeAgent(
					VALID_MINIMAL_AGENT,
					VALID_EXECUTE_OPTIONS
				);

				expect(isErr(result)).toBe(true);

				if (isErr(result)) {
					const error = result.error.at(0);
					expect(error?.code).toBe(AGENT_ERROR_CODES.MAX_ATTEMPTS_EXCEEDED);
					expect(error?.category).toBe('execution');

					// Use error code to narrow type for context access
					if (error?.code === AGENT_ERROR_CODES.MAX_ATTEMPTS_EXCEEDED) {
						expect(error.context.attempts).toBe(3);
						expect(error.context.maxAttempts).toBe(3);
					}
				}
			});

			it('should invoke onFailure callback', async () => {
				const {options, invocations} =
					createExecuteOptionsWithCallbackTracking();

				await executeAgent(VALID_MINIMAL_AGENT, options);

				const failures = invocations.filter((i) => i.type === 'onFailure');

				expect(failures.length).toBe(1);
			});

			it('should include final attempt count', async () => {
				const result = await executeAgent(
					VALID_MINIMAL_AGENT,
					VALID_EXECUTE_OPTIONS
				);

				expect(isErr(result)).toBe(true);

				if (isErr(result)) {
					const error = result.error.at(0);

					// Use error code to narrow type for context access
					if (error?.code === AGENT_ERROR_CODES.MAX_ATTEMPTS_EXCEEDED) {
						expect(error.context.attempts).toBe(3);
						expect(error.context.maxAttempts).toBe(3);
					}
				}
			});

			it('should respect maxAttempts override', async () => {
				const result = await executeAgent(
					VALID_MINIMAL_AGENT,
					VALID_EXECUTE_OPTIONS_WITH_MAX_ATTEMPTS_OVERRIDE
				);

				expect(isErr(result)).toBe(true);

				if (isErr(result)) {
					const error = result.error.at(0);

					// Use error code to narrow type for context access
					if (error?.code === AGENT_ERROR_CODES.MAX_ATTEMPTS_EXCEEDED) {
						expect(error.context.maxAttempts).toBe(5);
					}
				}
			});
		});

		describe('Validation layer callbacks', () => {
			it('should invoke onValidationLayerStart for each validation layer', async () => {
				const {options, invocations} =
					createExecuteOptionsWithCallbackTracking();

				await executeAgent(VALID_MINIMAL_AGENT, options);

				const layerStarts = invocations.filter(
					(i) => i.type === 'onValidationLayerStart'
				);

				// Should have at least one for the Zod schema layer
				expect(layerStarts.length).toBeGreaterThan(0);

				const zodLayer = layerStarts.find((i) => {
					if (i.type === 'onValidationLayerStart') {
						return i.layer.type === 'zod';
					}
					return false;
				});

				expect(zodLayer).toBeDefined();
			});

			it('should invoke onValidationLayerComplete for each validation layer', async () => {
				const {options, invocations} =
					createExecuteOptionsWithCallbackTracking();

				await executeAgent(VALID_MINIMAL_AGENT, options);

				const layerCompletes = invocations.filter(
					(i) => i.type === 'onValidationLayerComplete'
				);

				expect(layerCompletes.length).toBeGreaterThan(0);
			});

			it('should invoke validation layer callbacks in correct order', async () => {
				const {options, invocations} =
					createExecuteOptionsWithCallbackTracking();

				await executeAgent(VALID_MINIMAL_AGENT, options);

				// For each layer, Start should come before Complete
				const layerStarts = invocations.filter(
					(i) => i.type === 'onValidationLayerStart'
				);
				const layerCompletes = invocations.filter(
					(i) => i.type === 'onValidationLayerComplete'
				);

				expect(layerStarts.length).toBe(layerCompletes.length);

				// Verify each start comes before its corresponding complete
				layerStarts.forEach((start, index) => {
					const startIndex = invocations.indexOf(start);
					const completeIndex = invocations.indexOf(layerCompletes.at(index)!);
					expect(startIndex).toBeLessThan(completeIndex);
				});
			});

			it('should pass correct layer metadata to callbacks', async () => {
				const {options, invocations} =
					createExecuteOptionsWithCallbackTracking();

				await executeAgent(VALID_MINIMAL_AGENT, options);

				const layerStart = invocations.find(
					(i) => i.type === 'onValidationLayerStart'
				);

				if (layerStart?.type === 'onValidationLayerStart') {
					expect(layerStart.layer.name).toBeDefined();
					expect(layerStart.layer.type).toMatch(/^(zod|custom)$/);
					expect(layerStart.state.attempt).toBeGreaterThan(0);
					expect(layerStart.state.maxAttempts).toBeGreaterThan(0);
				}
			});

			it('should include error in onValidationLayerComplete when layer fails', async () => {
				// Mock scenario where validation fails
				const {options, invocations} =
					createExecuteOptionsWithCallbackTracking();

				await executeAgent(VALID_MINIMAL_AGENT, options);

				const failedLayer = invocations.find((i) => {
					if (i.type === 'onValidationLayerComplete') {
						return !i.layer.success;
					}
					return false;
				});

				if (failedLayer?.type === 'onValidationLayerComplete' && !failedLayer.layer.success) {
					expect(failedLayer.layer.error).toBeDefined();
				}
			});
		});

		describe('Callback invocation', () => {
			it('should invoke onSuccess callback with output', async () => {
				const {options, invocations} =
					createExecuteOptionsWithCallbackTracking();

				const result = await executeAgent(VALID_MINIMAL_AGENT, options);

				expect(isOk(result)).toBe(true);

				const successes = invocations.filter((i) => i.type === 'onSuccess');
				expect(successes.length).toBe(1);

				const successInvocation = successes.at(0);
				if (successInvocation?.type === 'onSuccess') {
					expect(successInvocation.output).toEqual(EXPECTED_SUCCESS.output);
				}
			});

			it('should invoke all callbacks in correct order', async () => {
				const {options, invocations} =
					createExecuteOptionsWithCallbackTracking();

				await executeAgent(VALID_MINIMAL_AGENT, options);

				expect(invocations.at(0)?.type).toBe('onAttemptStart');
				expect(invocations.at(-1)?.type).toBe('onSuccess');
			});

			it('should handle callback errors gracefully', async () => {
				const result = await executeAgent(VALID_MINIMAL_AGENT, {
					input: 'test input',
					callbacks: {
						onAttemptStart: () => {
							throw new Error('Callback error');
						},
					},
				});

				// Execution should continue despite callback errors
				expect(isOk(result) || isErr(result)).toBe(true);
			});
		});
	});
});
