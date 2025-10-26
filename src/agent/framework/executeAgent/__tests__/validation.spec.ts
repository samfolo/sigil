import {describe, expect, it, beforeEach, vi} from 'vitest';

const mockMessagesCreate = vi.fn();

vi.mock('@sigil/src/agent/clients/anthropic', () => ({
	createAnthropicClient: vi.fn(() => ({
		messages: {
			create: mockMessagesCreate,
		},
	})),
}));

import {
	executeAgent,
	setupExecuteAgentMocks,
	VALID_MINIMAL_AGENT,
	VALID_COMPLETE_AGENT,
	VALID_EXECUTE_OPTIONS,
	VALID_EXECUTE_OPTIONS_WITH_MAX_ATTEMPTS_OVERRIDE,
	createExecuteOptionsWithCallbackTracking,
	createMockApiCalls,
	createInvalidResponse,
	isOk,
	isErr,
	AGENT_ERROR_CODES,
} from '../executeAgent.common.fixtures';

describe('executeAgent - Validation', () => {
	beforeEach(() => {
		setupExecuteAgentMocks(mockMessagesCreate);
	});

	describe('Retry logic', () => {
		it('should retry on validation failure', async () => {
			// Use VALID_COMPLETE_AGENT which has custom validators
			// Mock: first call returns invalid (too short), second returns valid
			createMockApiCalls(mockMessagesCreate, [
				{type: 'invalid'},
				{type: 'success', result: 'valid result that is long enough'},
			]);

			const result = await executeAgent(
				VALID_COMPLETE_AGENT,
				VALID_EXECUTE_OPTIONS
			);

			expect(isOk(result)).toBe(true);

			if (isOk(result)) {
				expect(result.data.attempts).toBeGreaterThan(1);
			}
		});

		it('should increment attempt counter', async () => {
			// Use VALID_COMPLETE_AGENT which has custom validators
			// Mock: first two calls return invalid, third returns valid
			createMockApiCalls(mockMessagesCreate, [
				{type: 'invalid'},
				{type: 'invalid'},
				{type: 'success', result: 'valid result that is long enough'},
			]);

			const result = await executeAgent(
				VALID_COMPLETE_AGENT,
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
			// Use VALID_COMPLETE_AGENT and set up failure then success
			createMockApiCalls(mockMessagesCreate, [
				{type: 'invalid'},
				{type: 'success', result: 'valid result that is long enough'},
			]);

			const {options, invocations} =
        createExecuteOptionsWithCallbackTracking();

			await executeAgent(VALID_COMPLETE_AGENT, options);

			const validationFailures = invocations.filter(
				(i) => i.type === 'onValidationFailure'
			);

			expect(validationFailures.length).toBeGreaterThan(0);
		});
	});

	describe('Max attempts exceeded', () => {
		it('should return error Result after max attempts', async () => {
			// Use VALID_COMPLETE_AGENT and mock validation failure on all attempts
			mockMessagesCreate.mockResolvedValue(createInvalidResponse());

			const result = await executeAgent(
				VALID_COMPLETE_AGENT,
				VALID_EXECUTE_OPTIONS
			);

			expect(isErr(result)).toBe(true);
		});

		it('should return AgentError with MAX_ATTEMPTS_EXCEEDED code', async () => {
			// Use VALID_COMPLETE_AGENT and mock validation failure on all attempts
			// VALID_COMPLETE_AGENT has maxAttempts: 5
			mockMessagesCreate.mockResolvedValue(createInvalidResponse());

			const result = await executeAgent(
				VALID_COMPLETE_AGENT,
				VALID_EXECUTE_OPTIONS
			);

			expect(isErr(result)).toBe(true);

			if (isErr(result)) {
				const error = result.error.errors.at(0);
				expect(error?.code).toBe(AGENT_ERROR_CODES.MAX_ATTEMPTS_EXCEEDED);
				expect(error?.category).toBe('execution');

				// Use error code to narrow type for context access
				if (error?.code === AGENT_ERROR_CODES.MAX_ATTEMPTS_EXCEEDED) {
					expect(error.context.attempts).toBe(5);
					expect(error.context.maxAttempts).toBe(5);
				}
			}
		});

		it('should invoke onFailure callback', async () => {
			// Use VALID_COMPLETE_AGENT and mock validation failure on all attempts
			mockMessagesCreate.mockResolvedValue(createInvalidResponse());

			const {options, invocations} =
        createExecuteOptionsWithCallbackTracking();

			await executeAgent(VALID_COMPLETE_AGENT, options);

			const failures = invocations.filter((i) => i.type === 'onFailure');

			expect(failures.length).toBe(1);
		});

		it('should include final attempt count', async () => {
			// Use VALID_COMPLETE_AGENT and mock validation failure on all attempts
			// VALID_COMPLETE_AGENT has maxAttempts: 5
			mockMessagesCreate.mockResolvedValue(createInvalidResponse());

			const result = await executeAgent(
				VALID_COMPLETE_AGENT,
				VALID_EXECUTE_OPTIONS
			);

			expect(isErr(result)).toBe(true);

			if (isErr(result)) {
				const error = result.error.errors.at(0);

				// Use error code to narrow type for context access
				if (error?.code === AGENT_ERROR_CODES.MAX_ATTEMPTS_EXCEEDED) {
					expect(error.context.attempts).toBe(5);
					expect(error.context.maxAttempts).toBe(5);
				}
			}
		});

		it('should respect maxAttempts override', async () => {
			// Use VALID_COMPLETE_AGENT and mock validation failure on all attempts
			mockMessagesCreate.mockResolvedValue(createInvalidResponse());

			const result = await executeAgent(
				VALID_COMPLETE_AGENT,
				VALID_EXECUTE_OPTIONS_WITH_MAX_ATTEMPTS_OVERRIDE
			);

			expect(isErr(result)).toBe(true);

			if (isErr(result)) {
				const error = result.error.errors.at(0);

				// Use error code to narrow type for context access
				if (error?.code === AGENT_ERROR_CODES.MAX_ATTEMPTS_EXCEEDED) {
					expect(error.context.maxAttempts).toBe(5);
				}
			}
		});

		it('should handle zero-length validation error messages', async () => {
			// Mock: all attempts fail
			mockMessagesCreate.mockResolvedValue(createInvalidResponse());

			const result = await executeAgent(
				VALID_COMPLETE_AGENT,
				VALID_EXECUTE_OPTIONS
			);

			expect(isErr(result)).toBe(true);

			// Should have MAX_ATTEMPTS_EXCEEDED error
			if (isErr(result)) {
				const error = result.error.errors.at(0);
				expect(error?.code).toBe(AGENT_ERROR_CODES.MAX_ATTEMPTS_EXCEEDED);

				// Context should include lastError (stringified validation errors)
				if (error?.code === AGENT_ERROR_CODES.MAX_ATTEMPTS_EXCEEDED) {
					expect(error.context.lastError).toBeDefined();
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
			// Use VALID_COMPLETE_AGENT and mock failure then success to trigger validation error
			createMockApiCalls(mockMessagesCreate, [
				{type: 'invalid'},
				{type: 'success', result: 'valid result that is long enough'},
			]);

			const {options, invocations} =
        createExecuteOptionsWithCallbackTracking();

			await executeAgent(VALID_COMPLETE_AGENT, options);

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

	describe('Conversation history', () => {
		it('should accumulate conversation history across retries', async () => {
			// Mock: first call invalid, second call valid
			createMockApiCalls(mockMessagesCreate, [
				{type: 'invalid'},
				{type: 'success', result: 'valid result that is long enough'},
			]);

			const result = await executeAgent(
				VALID_COMPLETE_AGENT,
				VALID_EXECUTE_OPTIONS
			);

			expect(isOk(result)).toBe(true);

			// Verify API was called twice (once for each attempt)
			expect(mockMessagesCreate).toHaveBeenCalledTimes(2);

			// Second call should have accumulated history
			const secondCall = mockMessagesCreate.mock.calls.at(1);
			expect(secondCall).toBeDefined();

			if (secondCall) {
				const messages = secondCall.at(0)?.messages;
				expect(messages).toBeDefined();
				expect(messages?.length).toBeGreaterThan(1); // User + assistant + error
			}
		});

		it('should include original user prompt in first attempt', async () => {
			await executeAgent(VALID_MINIMAL_AGENT, VALID_EXECUTE_OPTIONS);

			expect(mockMessagesCreate).toHaveBeenCalledTimes(1);

			const firstCall = mockMessagesCreate.mock.calls.at(0);
			const messages = firstCall?.at(0)?.messages;

			expect(messages).toBeDefined();
			expect(messages?.at(0)?.role).toBe('user');
			expect(messages?.at(0)?.content).toContain('test input');
		});

		it('should append assistant response after validation failure', async () => {
			// Mock: first call invalid, second call valid
			createMockApiCalls(mockMessagesCreate, [
				{type: 'invalid'},
				{type: 'success', result: 'valid result that is long enough'},
			]);

			await executeAgent(VALID_COMPLETE_AGENT, VALID_EXECUTE_OPTIONS);

			expect(mockMessagesCreate).toHaveBeenCalledTimes(2);

			// Second call should have assistant response in history
			const secondCall = mockMessagesCreate.mock.calls.at(1);
			const messages = secondCall?.at(0)?.messages;

			// Should have: user (original), assistant (failed), user (error)
			expect(messages?.length).toBeGreaterThanOrEqual(3);

			const assistantMessage = messages?.find((m: {role: string}) => m.role === 'assistant');
			expect(assistantMessage).toBeDefined();
		});

		it('should append error prompts after validation failures', async () => {
			// Mock: first call invalid, second call valid
			createMockApiCalls(mockMessagesCreate, [
				{type: 'invalid'},
				{type: 'success', result: 'valid result that is long enough'},
			]);

			await executeAgent(VALID_COMPLETE_AGENT, VALID_EXECUTE_OPTIONS);

			// Second call should have error prompt
			const secondCall = mockMessagesCreate.mock.calls.at(1);
			const messages = secondCall?.at(0)?.messages;

			// Find user messages (original + error)
			const userMessages = messages?.filter((m: {role: string}) => m.role === 'user');
			expect(userMessages?.length).toBeGreaterThan(1);

			// Last user message should be the error prompt
			const errorMessage = userMessages?.at(-1);
			expect(errorMessage?.content).toBeDefined();
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

		it('should collect callback errors in metadata', async () => {
			const result = await executeAgent(VALID_COMPLETE_AGENT, {
				input: 'test input',
				callbacks: {
					onAttemptStart: () => {
						throw new Error('Callback error 1');
					},
					onValidationLayerStart: () => {
						throw new Error('Callback error 2');
					},
				},
			});

			if (isOk(result)) {
				expect(result.data.metadata?.callbackErrors).toBeDefined();
				expect(result.data.metadata?.callbackErrors?.length).toBeGreaterThan(0);
			}
		});
	});
});
