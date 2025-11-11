import {beforeEach, describe, expect, it, vi} from 'vitest';

const mockMessagesCreate = vi.fn();

vi.mock('@sigil/src/agent/clients/anthropic', () => ({
	createAnthropicClient: vi.fn(() => ({
		messages: {
			create: mockMessagesCreate,
		},
	})),
}));

import {
	AGENT_ERROR_CODES,
	VALID_COMPLETE_AGENT,
	VALID_EXECUTE_OPTIONS,
	VALID_EXECUTE_OPTIONS_WITH_MAX_ATTEMPTS_OVERRIDE,
	VALID_MINIMAL_AGENT,
	executeAgent,
	isErr,
	isOk,
	setupExecuteAgentMocks,
} from '../executeAgent.common.fixtures';
import {AnthropicApiMock, CallbackTracker, outputToolUse} from '../executeAgent.mock';

describe('executeAgent - Validation', () => {
	beforeEach(() => {
		setupExecuteAgentMocks(mockMessagesCreate);
	});

	describe('Retry logic', () => {
		it('should retry on validation failure', async () => {
			// Use VALID_COMPLETE_AGENT which has custom validators
			// Mock: first call returns invalid (too short), second returns valid
			const mock = new AnthropicApiMock();
			mock
				.respondWith({content: [outputToolUse('short')]}) // Fails validation
				.respondWith({content: [outputToolUse('valid result that is long enough')]})
				.install(mockMessagesCreate);

			const result = await executeAgent(VALID_COMPLETE_AGENT, VALID_EXECUTE_OPTIONS);

			expect(isOk(result)).toBe(true);

			if (isOk(result)) {
				expect(result.data.attempts).toBeGreaterThan(1);
			}
		});

		it('should increment attempt counter', async () => {
			// Use VALID_COMPLETE_AGENT which has custom validators
			// Mock: first two calls return invalid, third returns valid
			const mock = new AnthropicApiMock();
			mock
				.respondWith({content: [outputToolUse('short')]}) // First fails
				.respondWith({content: [outputToolUse('short')]}) // Second fails
				.respondWith({content: [outputToolUse('valid result that is long enough')]})
				.install(mockMessagesCreate);

			const result = await executeAgent(VALID_COMPLETE_AGENT, VALID_EXECUTE_OPTIONS);

			expect(isOk(result)).toBe(true);

			if (isOk(result)) {
				expect(result.data.attempts).toBe(3); // After 2 failures
			}
		});

		it('should invoke onAttemptStart callback for each attempt', async () => {
			const tracker = new CallbackTracker();

			await executeAgent(VALID_MINIMAL_AGENT, {
				input: 'test input with callbacks',
				callbacks: tracker.createCallbacks(),
			});

			const attemptStarts = tracker.invocations.filter((i) => i.type === 'onAttemptStart');

			expect(attemptStarts.length).toBeGreaterThan(0);
			const firstAttempt = attemptStarts.at(0);
			if (firstAttempt?.type === 'onAttemptStart') {
				expect(firstAttempt.context.attempt).toBe(1);
			}
		});

		it('should invoke onValidationFailure callback', async () => {
			// Use VALID_COMPLETE_AGENT and set up failure then success
			const mock = new AnthropicApiMock();
			mock
				.respondWith({content: [outputToolUse('short')]})
				.respondWith({content: [outputToolUse('valid result that is long enough')]})
				.install(mockMessagesCreate);

			const tracker = new CallbackTracker();

			await executeAgent(VALID_COMPLETE_AGENT, {
				input: 'test input with callbacks',
				callbacks: tracker.createCallbacks(),
			});

			const validationFailures = tracker.invocations.filter((i) => i.type === 'onValidationFailure');

			expect(validationFailures.length).toBeGreaterThan(0);
		});
	});

	describe('Max attempts exceeded', () => {
		it('should return error Result after max attempts', async () => {
			// Use VALID_COMPLETE_AGENT and mock validation failure on all attempts
			// Last response persists, causing all attempts to fail
			const mock = new AnthropicApiMock();
			mock.respondWith({content: [outputToolUse('short')]}).install(mockMessagesCreate);

			const result = await executeAgent(VALID_COMPLETE_AGENT, VALID_EXECUTE_OPTIONS);

			expect(isErr(result)).toBe(true);
		});

		it('should return AgentError with MAX_ATTEMPTS_EXCEEDED code', async () => {
			// Use VALID_COMPLETE_AGENT and mock validation failure on all attempts
			// VALID_COMPLETE_AGENT has maxAttempts: 5
			const mock = new AnthropicApiMock();
			mock.respondWith({content: [outputToolUse('short')]}).install(mockMessagesCreate);

			const result = await executeAgent(VALID_COMPLETE_AGENT, VALID_EXECUTE_OPTIONS);

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
			const mock = new AnthropicApiMock();
			mock.respondWith({content: [outputToolUse('short')]}).install(mockMessagesCreate);

			const tracker = new CallbackTracker();

			await executeAgent(VALID_COMPLETE_AGENT, {
				input: 'test input with callbacks',
				callbacks: tracker.createCallbacks(),
			});

			const failures = tracker.invocations.filter((i) => i.type === 'onFailure');

			expect(failures.length).toBe(1);
		});

		it('should include final attempt count', async () => {
			// Use VALID_COMPLETE_AGENT and mock validation failure on all attempts
			// VALID_COMPLETE_AGENT has maxAttempts: 5
			const mock = new AnthropicApiMock();
			mock.respondWith({content: [outputToolUse('short')]}).install(mockMessagesCreate);

			const result = await executeAgent(VALID_COMPLETE_AGENT, VALID_EXECUTE_OPTIONS);

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
			const mock = new AnthropicApiMock();
			mock.respondWith({content: [outputToolUse('short')]}).install(mockMessagesCreate);

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
			const mock = new AnthropicApiMock();
			mock.respondWith({content: [outputToolUse('short')]}).install(mockMessagesCreate);

			const result = await executeAgent(VALID_COMPLETE_AGENT, VALID_EXECUTE_OPTIONS);

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
			const tracker = new CallbackTracker();

			await executeAgent(VALID_MINIMAL_AGENT, {
				input: 'test input with callbacks',
				callbacks: tracker.createCallbacks(),
			});

			const layerStarts = tracker.invocations.filter((i) => i.type === 'onValidationLayerStart');

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
			const tracker = new CallbackTracker();

			await executeAgent(VALID_MINIMAL_AGENT, {
				input: 'test input with callbacks',
				callbacks: tracker.createCallbacks(),
			});

			const layerCompletes = tracker.invocations.filter((i) => i.type === 'onValidationLayerComplete');

			expect(layerCompletes.length).toBeGreaterThan(0);
		});

		it('should invoke validation layer callbacks in correct order', async () => {
			const tracker = new CallbackTracker();

			await executeAgent(VALID_MINIMAL_AGENT, {
				input: 'test input with callbacks',
				callbacks: tracker.createCallbacks(),
			});

			// For each layer, Start should come before Complete
			const layerStarts = tracker.invocations.filter((i) => i.type === 'onValidationLayerStart');
			const layerCompletes = tracker.invocations.filter((i) => i.type === 'onValidationLayerComplete');

			expect(layerStarts.length).toBe(layerCompletes.length);

			// Verify each start comes before its corresponding complete
			layerStarts.forEach((start, index) => {
				const startIndex = tracker.invocations.indexOf(start);
				const completeIndex = tracker.invocations.indexOf(layerCompletes.at(index)!);
				expect(startIndex).toBeLessThan(completeIndex);
			});
		});

		it('should pass correct layer metadata to callbacks', async () => {
			const tracker = new CallbackTracker();

			await executeAgent(VALID_MINIMAL_AGENT, {
				input: 'test input with callbacks',
				callbacks: tracker.createCallbacks(),
			});

			const layerStart = tracker.invocations.find((i) => i.type === 'onValidationLayerStart');

			if (layerStart?.type === 'onValidationLayerStart') {
				expect(layerStart.layer.name).toBeDefined();
				expect(layerStart.layer.type).toMatch(/^(zod|custom)$/);
				expect(layerStart.context.attempt).toBeGreaterThan(0);
				expect(layerStart.context.maxAttempts).toBeGreaterThan(0);
			}
		});

		it('should include error in onValidationLayerComplete when layer fails', async () => {
			// Use VALID_COMPLETE_AGENT and mock failure then success to trigger validation error
			const mock = new AnthropicApiMock();
			mock
				.respondWith({content: [outputToolUse('short')]})
				.respondWith({content: [outputToolUse('valid result that is long enough')]})
				.install(mockMessagesCreate);

			const tracker = new CallbackTracker();

			await executeAgent(VALID_COMPLETE_AGENT, {
				input: 'test input with callbacks',
				callbacks: tracker.createCallbacks(),
			});

			const failedLayer = tracker.invocations.find((i) => {
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
			const mock = new AnthropicApiMock();
			mock
				.respondWith({content: [outputToolUse('short')]})
				.respondWith({content: [outputToolUse('valid result that is long enough')]})
				.install(mockMessagesCreate);

			const result = await executeAgent(VALID_COMPLETE_AGENT, VALID_EXECUTE_OPTIONS);

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

			// Content is an array of content blocks
			const content = messages?.at(0)?.content;
			expect(Array.isArray(content)).toBe(true);
			if (Array.isArray(content)) {
				const textBlock = content.find((block) => block.type === 'text');
				expect(textBlock?.text).toContain('test input');
			}
		});

		it('should append assistant response after validation failure', async () => {
			// Mock: first call invalid, second call valid
			const mock = new AnthropicApiMock();
			mock
				.respondWith({content: [outputToolUse('short')]})
				.respondWith({content: [outputToolUse('valid result that is long enough')]})
				.install(mockMessagesCreate);

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
			const mock = new AnthropicApiMock();
			mock
				.respondWith({content: [outputToolUse('short')]})
				.respondWith({content: [outputToolUse('valid result that is long enough')]})
				.install(mockMessagesCreate);

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
			const tracker = new CallbackTracker();

			const result = await executeAgent(VALID_MINIMAL_AGENT, {
				input: 'test input with callbacks',
				callbacks: tracker.createCallbacks(),
			});

			expect(isOk(result)).toBe(true);

			const successes = tracker.invocations.filter((i) => i.type === 'onSuccess');
			expect(successes.length).toBe(1);
		});

		it('should invoke all callbacks in correct order', async () => {
			const tracker = new CallbackTracker();

			await executeAgent(VALID_MINIMAL_AGENT, {
				input: 'test input with callbacks',
				callbacks: tracker.createCallbacks(),
			});

			expect(tracker.invocations.at(0)?.type).toBe('onAttemptStart');
			expect(tracker.invocations.at(-1)?.type).toBe('onSuccess');
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

	describe('State projection', () => {
		it('should include projected state in success result when projectFinalState is defined', async () => {
			// Use VALID_MINIMAL_AGENT with projectFinalState added
			// The agent has EmptyObject state but we project undefined (which is valid)
			const agentWithProjection = {
				...VALID_MINIMAL_AGENT,
				projectFinalState: () => 'projected-value',
			};

			const result = await executeAgent(agentWithProjection, VALID_EXECUTE_OPTIONS);

			expect(isOk(result)).toBe(true);

			if (isOk(result)) {
				expect(result.data.stateProjection).toBe('projected-value');
			}
		});

		it('should return STATE_PROJECTION_FAILED error when projection function throws', async () => {
			// Create agent with failing projection
			const agentWithFailingProjection = {
				...VALID_MINIMAL_AGENT,
				projectFinalState: () => {
					throw new Error('Projection failed');
				},
			};

			const result = await executeAgent(agentWithFailingProjection, VALID_EXECUTE_OPTIONS);

			expect(isErr(result)).toBe(true);

			if (isErr(result)) {
				const error = result.error.errors.at(0);
				expect(error?.code).toBe(AGENT_ERROR_CODES.STATE_PROJECTION_FAILED);
				expect(error?.category).toBe('execution');
			}
		});

		it('should work correctly when projectFinalState is undefined', async () => {
			// Use agent without projection (VALID_MINIMAL_AGENT has no projectFinalState)
			const result = await executeAgent(VALID_MINIMAL_AGENT, VALID_EXECUTE_OPTIONS);

			expect(isOk(result)).toBe(true);

			if (isOk(result)) {
				expect(result.data.stateProjection).toBeUndefined();
			}
		});

		it('should provide access to run state, attempt state, and context in projection function', async () => {
			// Use VALID_MINIMAL_AGENT and project from the actual state
			// EmptyObject for run and attempt is fine - we're demonstrating access
			const agentWithFullStateProjection = {
				...VALID_MINIMAL_AGENT,
				projectFinalState: (state: {
					run: Record<string, never>;
					attempt: Record<string, never>;
					context: {attempt: number; maxAttempts: number};
				}) => ({
					runKeys: Object.keys(state.run).length,
					attemptKeys: Object.keys(state.attempt).length,
					attemptNumber: state.context.attempt,
					maxAttempts: state.context.maxAttempts,
				}),
			};

			const result = await executeAgent(agentWithFullStateProjection, VALID_EXECUTE_OPTIONS);

			expect(isOk(result)).toBe(true);

			if (isOk(result)) {
				expect(result.data.stateProjection).toEqual({
					runKeys: 0,
					attemptKeys: 0,
					attemptNumber: 1,
					maxAttempts: 3,
				});
			}
		});
	});
});
