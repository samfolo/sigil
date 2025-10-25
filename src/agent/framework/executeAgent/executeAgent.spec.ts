/**
 * Tests for executeAgent function
 */

import {describe, expect, it, vi, beforeEach} from 'vitest';

import {
  isErr,
  isOk,
  AGENT_ERROR_CODES,
} from '@sigil/src/common/errors';

// Create a mock messages.create function that we can control
const mockMessagesCreate = vi.fn();

// Mock the Anthropic client to avoid real API calls in tests
vi.mock('@sigil/src/agent/clients/anthropic', () => ({
  createAnthropicClient: vi.fn(() => ({
    messages: {
      create: mockMessagesCreate,
    },
  })),
}));

import {VALID_MINIMAL_AGENT, VALID_COMPLETE_AGENT} from '../defineAgent/defineAgent.fixtures';

import {executeAgent} from './executeAgent';
import {
  VALID_EXECUTE_OPTIONS,
  VALID_EXECUTE_OPTIONS_WITH_MAX_ATTEMPTS_OVERRIDE,
  EXPECTED_SUCCESS,
  createExecuteOptionsWithCallbackTracking,
  createSuccessResponse,
  createInvalidResponse,
  createMockApiCalls,
} from './executeAgent.fixtures';

describe('executeAgent', () => {
  beforeEach(() => {
    // Reset mock before each test
    mockMessagesCreate.mockReset();

    // Default: return success on first call
    mockMessagesCreate.mockResolvedValue(createSuccessResponse());
  });

  describe('Type Safety', () => {
    it('should preserve generic type parameters', async () => {
      const result = await executeAgent(
        VALID_MINIMAL_AGENT,
        VALID_EXECUTE_OPTIONS
      );

      // Type narrowing should work correctly with isErr
      if (isErr(result)) {
        // If types are preserved correctly, this should compile without errors
        const failure = result.error;
        const errors = failure.errors;
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

  describe('Future Implementation Tests', () => {
    // These tests define expected behaviour for the full implementation.

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

      it('should populate metadata (latency, tokens)', async () => {
        // Use VALID_COMPLETE_AGENT which has observability enabled
        const result = await executeAgent(
          VALID_COMPLETE_AGENT,
          VALID_EXECUTE_OPTIONS
        );

        expect(isOk(result)).toBe(true);

        if (isOk(result)) {
          expect(result.data.metadata).toBeDefined();
          expect(result.data.metadata?.latency).toBeTypeOf('number');
          expect(result.data.metadata?.tokens).toBeDefined();
          expect(result.data.metadata?.tokens?.input).toBeTypeOf('number');
          expect(result.data.metadata?.tokens?.output).toBeTypeOf('number');
        }
      });
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

    describe('Edge cases', () => {
      it('should handle API errors gracefully', async () => {
        // Mock API error
        mockMessagesCreate.mockRejectedValueOnce(new Error('API connection failed'));

        const result = await executeAgent(
          VALID_MINIMAL_AGENT,
          VALID_EXECUTE_OPTIONS
        );

        expect(isErr(result)).toBe(true);

        if (isErr(result)) {
          const error = result.error.errors.at(0);
          expect(error?.code).toBe(AGENT_ERROR_CODES.API_ERROR);
          expect(error?.category).toBe('model');
        }
      });

      it('should handle missing tool use in response', async () => {
        // Mock response without tool_use
        mockMessagesCreate.mockResolvedValueOnce({
          id: 'msg_test',
          type: 'message',
          role: 'assistant',
          model: 'claude-sonnet-4-5-20250929',
          content: [
            {
              type: 'text',
              text: 'I cannot use the tool',
            },
          ],
          stop_reason: 'end_turn',
          stop_sequence: null,
          usage: {
            input_tokens: 100,
            output_tokens: 50,
          },
        });

        const result = await executeAgent(
          VALID_MINIMAL_AGENT,
          VALID_EXECUTE_OPTIONS
        );

        expect(isErr(result)).toBe(true);

        if (isErr(result)) {
          const error = result.error.errors.at(0);
          expect(error?.code).toBe(AGENT_ERROR_CODES.INVALID_RESPONSE);
          expect(error?.category).toBe('model');
        }
      });

      it('should handle wrong tool name in response', async () => {
        // Mock response with wrong tool name
        mockMessagesCreate.mockResolvedValueOnce({
          id: 'msg_test',
          type: 'message',
          role: 'assistant',
          model: 'claude-sonnet-4-5-20250929',
          content: [
            {
              type: 'tool_use',
              id: 'toolu_test',
              name: 'wrong_tool',
              input: {result: 'test'},
            },
          ],
          stop_reason: 'end_turn',
          stop_sequence: null,
          usage: {
            input_tokens: 100,
            output_tokens: 50,
          },
        });

        const result = await executeAgent(
          VALID_MINIMAL_AGENT,
          VALID_EXECUTE_OPTIONS
        );

        expect(isErr(result)).toBe(true);

        if (isErr(result)) {
          const error = result.error.errors.at(0);
          expect(error?.code).toBe(AGENT_ERROR_CODES.INVALID_RESPONSE);
        }
      });

      it('should include metadata even on failures', async () => {
        // Mock API error
        mockMessagesCreate.mockRejectedValueOnce(new Error('API error'));

        const result = await executeAgent(
          VALID_COMPLETE_AGENT,
          VALID_EXECUTE_OPTIONS
        );

        expect(isErr(result)).toBe(true);

        if (isErr(result)) {
          // Metadata should still be populated for observability
          expect(result.error.metadata).toBeDefined();
          expect(result.error.metadata?.latency).toBeTypeOf('number');
        }
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

    describe('Metadata collection', () => {
      it('should calculate latency accurately with mock delays', async () => {
        // Mock API with deliberate 100ms delay
        mockMessagesCreate.mockImplementation(async () => {
          await new Promise((resolve) => setTimeout(resolve, 100));
          return createSuccessResponse();
        });

        const result = await executeAgent(
          VALID_COMPLETE_AGENT,
          VALID_EXECUTE_OPTIONS
        );

        expect(isOk(result)).toBe(true);

        if (isOk(result)) {
          // Latency should be at least 100ms
          expect(result.data.metadata?.latency).toBeGreaterThanOrEqual(100);
          // But within reasonable bounds (< 300ms for safety margin)
          expect(result.data.metadata?.latency).toBeLessThan(300);
        }
      });

      it('should accumulate tokens across multiple attempts', async () => {
        // First attempt: 100 input, 50 output (invalid)
        // Second attempt: 150 input, 75 output (valid)
        // Expected total: 250 input, 125 output
        createMockApiCalls(mockMessagesCreate, [
          {type: 'invalid', inputTokens: 100, outputTokens: 50},
          {type: 'success', result: 'valid result that is long enough', inputTokens: 150, outputTokens: 75},
        ]);

        const result = await executeAgent(
          VALID_COMPLETE_AGENT,
          VALID_EXECUTE_OPTIONS
        );

        expect(isOk(result)).toBe(true);

        if (isOk(result)) {
          expect(result.data.metadata?.tokens?.input).toBe(250);
          expect(result.data.metadata?.tokens?.output).toBe(125);
        }
      });

      it('should NOT include latency when trackLatency is false', async () => {
        // VALID_MINIMAL_AGENT has trackLatency: false
        const result = await executeAgent(
          VALID_MINIMAL_AGENT,
          VALID_EXECUTE_OPTIONS
        );

        expect(isOk(result)).toBe(true);

        if (isOk(result)) {
          expect(result.data.metadata?.latency).toBeUndefined();
        }
      });

      it('should NOT include tokens when trackTokens is false', async () => {
        // VALID_MINIMAL_AGENT has trackTokens: false
        const result = await executeAgent(
          VALID_MINIMAL_AGENT,
          VALID_EXECUTE_OPTIONS
        );

        expect(isOk(result)).toBe(true);

        if (isOk(result)) {
          expect(result.data.metadata?.tokens).toBeUndefined();
        }
      });

      it('should measure latency for entire execution including all attempts', async () => {
        // Mock with 50ms delay on each attempt
        createMockApiCalls(mockMessagesCreate, [
          {type: 'invalid', delay: 50},
          {type: 'invalid', delay: 50},
          {type: 'success', result: 'valid result that is long enough', delay: 50},
        ]);

        const result = await executeAgent(
          VALID_COMPLETE_AGENT,
          VALID_EXECUTE_OPTIONS
        );

        expect(isOk(result)).toBe(true);

        if (isOk(result)) {
          // Should measure total time across all 3 attempts (3 * 50ms = 150ms minimum)
          expect(result.data.metadata?.latency).toBeGreaterThanOrEqual(150);
          expect(result.data.attempts).toBe(3);
        }
      });

      it('should accumulate tokens even when execution fails', async () => {
        // Mock: all attempts fail with different token counts
        // Attempt 1: 100 input, 50 output
        // Attempt 2: 120 input, 60 output
        // Attempt 3: 140 input, 70 output
        // Attempt 4: 160 input, 80 output
        // Attempt 5: 180 input, 90 output
        // Expected total: 700 input, 350 output
        createMockApiCalls(mockMessagesCreate, [
          {type: 'invalid', inputTokens: 100, outputTokens: 50},
          {type: 'invalid', inputTokens: 120, outputTokens: 60},
          {type: 'invalid', inputTokens: 140, outputTokens: 70},
          {type: 'invalid', inputTokens: 160, outputTokens: 80},
          {type: 'invalid', inputTokens: 180, outputTokens: 90},
        ]);

        const result = await executeAgent(
          VALID_COMPLETE_AGENT,
          VALID_EXECUTE_OPTIONS
        );

        expect(isErr(result)).toBe(true);

        if (isErr(result)) {
          // Tokens should still be accumulated across all failed attempts
          expect(result.error.metadata?.tokens?.input).toBe(700);
          expect(result.error.metadata?.tokens?.output).toBe(350);
        }
      });
    });
  });
});
