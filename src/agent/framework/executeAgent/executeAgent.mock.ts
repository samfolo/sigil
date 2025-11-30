/**
 * Type-safe mock utilities for testing agent execution
 *
 * Provides AnthropicApiMock for mocking messages.create calls and CallbackTracker
 * for instrumenting execution callbacks. Uses composable content block helpers
 * for explicit, future-proof test configuration.
 */

import type {
	Message,
	MessageCreateParams,
	TextBlock,
	ToolUseBlock,
	Usage,
} from '@anthropic-ai/sdk/resources/messages';
import type {Mock} from 'vitest';

import type {AgentExecutionContext} from '@sigil/src/agent/framework';
import type {ValidationLayerMetadata, ValidationLayerResult} from '@sigil/src/agent/framework/validation';

import {SUBMIT_TOOL_NAME} from './iteration/constants';
import type {ExecuteCallbacks, ExecuteMetadata} from './schemas';

/**
 * Output tool name used in test mocks
 *
 * This matches the output tool name defined in test fixtures (defineAgent.fixtures.ts).
 * All test agents use 'generate_output' as their output tool name.
 */
export const OUTPUT_TOOL_NAME = 'generate_output';

/**
 * Default configuration for mock responses
 */
const DEFAULT_MESSAGE_ID = 'msg_test';
const DEFAULT_MESSAGE_TYPE = 'message' as const;
const DEFAULT_ROLE = 'assistant' as const;
const DEFAULT_MODEL = 'claude-sonnet-4-5-20250929';
const DEFAULT_STOP_REASON = 'tool_use' as const;
const DEFAULT_STOP_SEQUENCE = null;
const DEFAULT_INPUT_TOKENS = 100;
const DEFAULT_OUTPUT_TOKENS = 50;

/**
 * Response configuration for respondWith
 *
 * All SDK fields are overridable with sensible defaults.
 */
export interface ResponseConfig {
	content: Array<TextBlock | ToolUseBlock>;
	id?: string;
	type?: 'message';
	role?: 'assistant';
	model?: string;
	stopReason?: 'end_turn' | 'max_tokens' | 'stop_sequence' | 'tool_use';
	stopSequence?: string | null;
	usage?: {
		input: number;
		output: number;
		cacheCreationInput?: number;
		cacheReadInput?: number;
	};
}

/**
 * Error configuration for throwWith
 */
export interface ErrorConfig {
	error: Error;
}

/**
 * Non-SDK options for responses and errors
 */
export interface ResponseOptions {
	delay?: number;
}

/**
 * Mock function type for Anthropic messages.create
 */
type MockFunction = Mock<(params: MessageCreateParams) => Promise<Message>>;

/**
 * Internal response entry combining config/error with optional matcher and delay
 */
type ResponseEntry =
	| {
			type: 'response';
			config: ResponseConfig;
			options?: ResponseOptions;
			matcher?: (req: MessageCreateParams) => boolean;
	  }
	| {
			type: 'error';
			config: ErrorConfig;
			options?: ResponseOptions;
			matcher?: (req: MessageCreateParams) => boolean;
	  };

/**
 * Type-safe mock for Anthropic messages.create API
 *
 * Provides fluent interface for configuring sequential and conditional responses.
 * Uses composable content block helpers for explicit test configuration.
 *
 * @example
 * ```typescript
 * const mock = new AnthropicApiMock();
 *
 * mock
 *   .respondWith({content: [outputToolUse('short')]})
 *   .respondWith(
 *     {content: [outputToolUse('valid result')]},
 *     {usage: {input: 150, output: 75}}
 *   )
 *   .install(mockMessagesCreate);
 *
 * await executeAgent(agent, options);
 *
 * expect(mock.totalTokens).toEqual({input: 250, output: 125});
 * expect(mock.calls).toHaveLength(2);
 * ```
 */
export class AnthropicApiMock {
	private responses: ResponseEntry[] = [];
	private callIndex = 0;
	private inputTokensAccumulated = 0;
	private outputTokensAccumulated = 0;
	private mockFunction: MockFunction | null = null;
	private readonly defaultModel: string;
	private readonly defaultUsage: {
		input: number;
		output: number;
		cacheCreationInput?: number;
		cacheReadInput?: number;
	};

	/**
	 * Create a new AnthropicApiMock
	 *
	 * @param options - Default configuration
	 */
	constructor(options?: {
		model?: string;
		defaultUsage?: {input: number; output: number; cacheCreationInput?: number; cacheReadInput?: number};
	}) {
		this.defaultModel = options?.model ?? DEFAULT_MODEL;
		this.defaultUsage = options?.defaultUsage ?? {
			input: DEFAULT_INPUT_TOKENS,
			output: DEFAULT_OUTPUT_TOKENS,
		};
	}

	/**
	 * Add a sequential response to the mock
	 *
	 * Responses are returned in order. The final response persists for
	 * subsequent calls beyond the array length.
	 *
	 * @param config - Response configuration with content blocks
	 * @param options - Non-SDK options like delay
	 * @returns This mock for chaining
	 */
	respondWith(config: ResponseConfig, options?: ResponseOptions): this {
		this.responses.push({type: 'response', config, options});
		return this;
	}

	/**
	 * Add a sequential error to throw
	 *
	 * Errors are thrown in order. The final error persists for
	 * subsequent calls beyond the array length.
	 *
	 * @param config - Error configuration
	 * @param options - Non-SDK options like delay
	 * @returns This mock for chaining
	 */
	throwWith(config: ErrorConfig, options?: ResponseOptions): this {
		this.responses.push({type: 'error', config, options});
		return this;
	}

	/**
	 * Add a conditional response that matches specific requests
	 *
	 * When the matcher returns true, this response is used instead of
	 * the sequential response at the current index.
	 *
	 * @param matcher - Predicate to match requests
	 * @returns Conditional builder for chaining
	 */
	when(matcher: (req: MessageCreateParams) => boolean): ConditionalResponseBuilder {
		return new ConditionalResponseBuilder(this, matcher);
	}

	/**
	 * Install this mock on a vi.fn() mock function
	 *
	 * Configures the mock implementation to process requests and return
	 * appropriate responses based on configuration.
	 *
	 * @param mock - Vitest mock function to configure
	 */
	install(mock: MockFunction): void {
		this.mockFunction = mock;

		mock.mockImplementation(async (params: MessageCreateParams) => {
			// Find matching conditional response or fall back to sequential
			const entry =
				this.responses.find((r) => r.matcher?.(params)) ??
				this.responses.at(Math.min(this.callIndex, this.responses.length - 1));

			this.callIndex++;

			if (!entry) {
				throw new Error('No mock response configured');
			}

			// Apply delay if specified
			const delay = entry.options?.delay;
			if (delay) {
				await new Promise((resolve) => {
					setTimeout(resolve, delay);
				});
			}

			// Handle error entries
			if (entry.type === 'error') {
				throw entry.config.error;
			}

			// Build and return response
			const response = this.buildResponse(entry.config);
			this.accumulateTokens(response.usage);
			return response;
		});
	}

	/**
	 * Get cumulative token usage across all calls
	 */
	get totalTokens(): {input: number; output: number} {
		return {
			input: this.inputTokensAccumulated,
			output: this.outputTokensAccumulated,
		};
	}

	/**
	 * Get all request parameters passed to the mock
	 */
	get calls(): MessageCreateParams[] {
		if (!this.mockFunction) {
			return [];
		}
		return this.mockFunction.mock.calls.map((call) => call.at(0)!);
	}

	/**
	 * Reset the mock state
	 *
	 * Clears call index and token accumulation. Does not clear response configuration.
	 */
	reset(): void {
		this.callIndex = 0;
		this.inputTokensAccumulated = 0;
		this.outputTokensAccumulated = 0;
	}

	/**
	 * Add conditional response (internal method called by ConditionalResponseBuilder)
	 */
	addConditionalResponse(
		matcher: (req: MessageCreateParams) => boolean,
		entry: Omit<ResponseEntry, 'matcher'>
	): void {
		if (entry.type === 'response') {
			const responseEntry: ResponseEntry = {
				type: 'response',
				config: entry.config as ResponseConfig,
				options: entry.options,
				matcher,
			};
			this.responses.push(responseEntry);
		} else {
			const errorEntry: ResponseEntry = {
				type: 'error',
				config: entry.config as ErrorConfig,
				options: entry.options,
				matcher,
			};
			this.responses.push(errorEntry);
		}
	}

	/**
	 * Build a Message response from configuration
	 */
	private buildResponse(config: ResponseConfig): Message {
		const usage = config.usage ?? this.defaultUsage;

		const usageData: Usage = {
			input_tokens: usage.input,
			output_tokens: usage.output,
			cache_creation_input_tokens: usage.cacheCreationInput ?? null,
			cache_read_input_tokens: usage.cacheReadInput ?? null,
			cache_creation: null,
			server_tool_use: null,
			service_tier: null,
		};

		return {
			id: config.id ?? this.generateMessageId(),
			type: config.type ?? DEFAULT_MESSAGE_TYPE,
			role: config.role ?? DEFAULT_ROLE,
			model: config.model ?? this.defaultModel,
			content: config.content,
			stop_reason: config.stopReason ?? DEFAULT_STOP_REASON,
			stop_sequence: config.stopSequence ?? DEFAULT_STOP_SEQUENCE,
			usage: usageData,
		};
	}

	/**
	 * Accumulate token usage
	 */
	private accumulateTokens(usage: {input_tokens: number; output_tokens: number}): void {
		this.inputTokensAccumulated += usage.input_tokens;
		this.outputTokensAccumulated += usage.output_tokens;
	}

	/**
	 * Generate unique message ID
	 */
	private generateMessageId(): string {
		return `${DEFAULT_MESSAGE_ID}_${this.callIndex}`;
	}
}

/**
 * Builder for conditional responses
 *
 * Provides fluent interface for configuring responses that match specific requests.
 */
class ConditionalResponseBuilder {
	constructor(
		private mock: AnthropicApiMock,
		private matcher: (req: MessageCreateParams) => boolean
	) {}

	/**
	 * Configure the response for matching requests
	 *
	 * @param config - Response configuration
	 * @param options - Non-SDK options like delay
	 * @returns The parent mock for chaining
	 */
	respondWith(config: ResponseConfig, options?: ResponseOptions): AnthropicApiMock {
		this.mock.addConditionalResponse(this.matcher, {type: 'response', config, options});
		return this.mock;
	}

	/**
	 * Configure the error for matching requests
	 *
	 * @param config - Error configuration
	 * @param options - Non-SDK options like delay
	 * @returns The parent mock for chaining
	 */
	throwWith(config: ErrorConfig, options?: ResponseOptions): AnthropicApiMock {
		this.mock.addConditionalResponse(this.matcher, {type: 'error', config, options});
		return this.mock;
	}
}

/**
 * Content block helpers - composable tool use and text blocks
 */

let toolUseCounter = 0;

/**
 * Generate unique tool use ID
 */
const generateToolId = (): string => `toolu_${++toolUseCounter}`;

/**
 * Create output tool use block
 *
 * @param input - Either a string result or a full input object (e.g., {result: 'value', finalCount: 1})
 * @param toolId - Optional tool ID (auto-generated if not provided)
 * @returns ToolUseBlock for generate_output
 *
 * @example
 * ```typescript
 * // Simple string result
 * outputToolUse('success')
 * // → {type: 'tool_use', id: 'toolu_1', name: 'generate_output', input: {result: 'success'}}
 *
 * // Custom input object (e.g., for reducer tests with state)
 * outputToolUse({result: 'success', finalCount: 1})
 * // → {type: 'tool_use', id: 'toolu_2', name: 'generate_output', input: {result: 'success', finalCount: 1}}
 * ```
 */
export const outputToolUse = (
	input: string | Record<string, unknown>,
	toolId?: string
): ToolUseBlock => ({
	type: 'tool_use',
	id: toolId ?? generateToolId(),
	name: OUTPUT_TOOL_NAME,
	input: typeof input === 'string' ? {result: input} : input,
});

/**
 * Create helper tool use block
 *
 * @param name - Tool name
 * @param input - Tool input object
 * @param toolId - Optional tool ID (auto-generated if not provided)
 * @returns ToolUseBlock for helper tool
 */
export const helperToolUse = (
	name: string,
	input: Record<string, unknown>,
	toolId?: string
): ToolUseBlock => ({
	type: 'tool_use',
	id: toolId ?? generateToolId(),
	name,
	input,
});

/**
 * Create submit tool use block
 *
 * @param toolId - Optional tool ID (auto-generated if not provided)
 * @returns ToolUseBlock for submit tool
 */
export const submitToolUse = (toolId?: string): ToolUseBlock => ({
	type: 'tool_use',
	id: toolId ?? generateToolId(),
	name: SUBMIT_TOOL_NAME,
	input: {},
});

/**
 * Create text content block
 *
 * @param text - Text content
 * @returns TextBlock
 */
export const textBlock = (text: string): TextBlock => ({
	type: 'text',
	text,
	citations: [],
});

/**
 * Create a custom Message response for special cases
 *
 * Use this when you need full control over the response structure,
 * such as for testing specific edge cases or complex scenarios.
 *
 * @param config - Partial message configuration
 * @returns Complete Message object
 */
export const createCustomMessage = (config: {
	content: Array<TextBlock | ToolUseBlock>;
	usage?: {input: number; output: number};
	id?: string;
	model?: string;
	stopReason?: 'end_turn' | 'max_tokens' | 'stop_sequence' | 'tool_use';
}): Message => ({
	id: config.id ?? 'msg_custom',
	type: 'message',
	role: 'assistant',
	model: config.model ?? DEFAULT_MODEL,
	content: config.content,
	stop_reason: config.stopReason ?? DEFAULT_STOP_REASON,
	stop_sequence: null,
	usage: {
		input_tokens: config.usage?.input ?? DEFAULT_INPUT_TOKENS,
		output_tokens: config.usage?.output ?? DEFAULT_OUTPUT_TOKENS,
		cache_creation_input_tokens: 0,
		cache_read_input_tokens: 0,
		cache_creation: null,
		server_tool_use: null,
		service_tier: null,
	},
});

/**
 * Callback invocation record for onAttemptStart
 */
export interface OnAttemptStartInvocation {
	type: 'onAttemptStart';
	context: AgentExecutionContext;
}

/**
 * Callback invocation record for onAttemptComplete
 */
interface OnAttemptCompleteInvocation {
	type: 'onAttemptComplete';
	context: AgentExecutionContext;
	success: boolean;
}

/**
 * Callback invocation record for onValidationFailure
 */
interface OnValidationFailureInvocation {
	type: 'onValidationFailure';
	errors: unknown;
	context: AgentExecutionContext;
}

/**
 * Callback invocation record for onSuccess
 */
interface OnSuccessInvocation<Output> {
	type: 'onSuccess';
	output: Output;
	metadata?: ExecuteMetadata;
}

/**
 * Callback invocation record for onFailure
 */
interface OnFailureInvocation {
	type: 'onFailure';
	errors: unknown[];
	metadata?: ExecuteMetadata;
}

/**
 * Callback invocation record for onValidationLayerStart
 */
interface OnValidationLayerStartInvocation {
	type: 'onValidationLayerStart';
	layer: ValidationLayerMetadata;
	context: AgentExecutionContext;
}

/**
 * Callback invocation record for onValidationLayerComplete
 */
interface OnValidationLayerCompleteInvocation {
	type: 'onValidationLayerComplete';
	layer: ValidationLayerResult;
	context: AgentExecutionContext;
}

/**
 * Callback invocation record for onToolCall
 */
export interface OnToolCallInvocation {
	type: 'onToolCall';
	context: AgentExecutionContext;
	toolName: string;
	toolInput: unknown;
}

/**
 * Callback invocation record for onToolResult
 */
export interface OnToolResultInvocation {
	type: 'onToolResult';
	context: AgentExecutionContext;
	toolName: string;
	toolResult: string;
}

/**
 * Discriminated union of all callback invocation types
 */
export type CallbackInvocation<Output = unknown> =
	| OnAttemptStartInvocation
	| OnAttemptCompleteInvocation
	| OnValidationFailureInvocation
	| OnSuccessInvocation<Output>
	| OnFailureInvocation
	| OnValidationLayerStartInvocation
	| OnValidationLayerCompleteInvocation
	| OnToolCallInvocation
	| OnToolResultInvocation;

/**
 * Callback tracker for instrumenting execution callbacks
 *
 * Tracks all callback invocations with their arguments and provides
 * convenient accessors for common queries.
 *
 * @example
 * ```typescript
 * const tracker = new CallbackTracker<TestOutput>();
 *
 * await executeAgent(agent, {
 *   input: 'test',
 *   callbacks: tracker.createCallbacks({
 *     onHelperTool: (name, input) => ok({result: 'data'}),
 *   }),
 * });
 *
 * expect(tracker.helperToolCalls).toHaveLength(1);
 * expect(tracker.errors).toEqual([]);
 * expect(tracker.invocations.at(0)?.type).toBe('onAttemptStart');
 * ```
 */
export class CallbackTracker<Output = unknown> {
	private invocationsList: CallbackInvocation<Output>[] = [];
	private callbackErrors: unknown[] = [];

	/**
	 * Create instrumented callbacks that track invocations
	 *
	 * Wraps provided callbacks to record invocations while preserving original behaviour.
	 * Any errors thrown by callbacks are caught and recorded.
	 *
	 * @param overrides - Partial callbacks to override (e.g., onHelperTool handler)
	 * @returns Fully instrumented callback object
	 */
	createCallbacks(overrides?: Partial<ExecuteCallbacks<Output>>): ExecuteCallbacks<Output> {
		return {
			onAttemptStart: (context) => {
				this.invocationsList.push({type: 'onAttemptStart', context});
				this.invokeWithErrorHandling(() => overrides?.onAttemptStart?.(context));
			},

			onAttemptComplete: (context, success) => {
				this.invocationsList.push({type: 'onAttemptComplete', context, success});
				this.invokeWithErrorHandling(() => overrides?.onAttemptComplete?.(context, success));
			},

			onValidationFailure: (context, errors) => {
				this.invocationsList.push({type: 'onValidationFailure', errors, context});
				this.invokeWithErrorHandling(() => overrides?.onValidationFailure?.(context, errors));
			},

			onValidationLayerStart: (context, layer) => {
				this.invocationsList.push({type: 'onValidationLayerStart', layer, context});
				this.invokeWithErrorHandling(() => overrides?.onValidationLayerStart?.(context, layer));
			},

			onValidationLayerComplete: (context, layer) => {
				this.invocationsList.push({type: 'onValidationLayerComplete', layer, context});
				this.invokeWithErrorHandling(() => overrides?.onValidationLayerComplete?.(context, layer));
			},

			onToolCall: (context, toolName, toolInput) => {
				this.invocationsList.push({type: 'onToolCall', context, toolName, toolInput});
				this.invokeWithErrorHandling(() => overrides?.onToolCall?.(context, toolName, toolInput));
			},

			onToolResult: (context, toolName, toolResult) => {
				this.invocationsList.push({type: 'onToolResult', context, toolName, toolResult});
				this.invokeWithErrorHandling(() => overrides?.onToolResult?.(context, toolName, toolResult));
			},

			onSuccess: (output, metadata) => {
				this.invocationsList.push({type: 'onSuccess', output, metadata});
				this.invokeWithErrorHandling(() => overrides?.onSuccess?.(output, metadata));
			},

			onFailure: (errors, metadata) => {
				this.invocationsList.push({type: 'onFailure', errors, metadata});
				this.invokeWithErrorHandling(() => overrides?.onFailure?.(errors, metadata));
			},
		};
	}

	/**
	 * Get all callback invocations in order
	 */
	get invocations(): ReadonlyArray<CallbackInvocation<Output>> {
		return this.invocationsList;
	}

	/**
	 * Get all helper tool call invocations
	 */
	get helperToolCalls(): OnToolCallInvocation[] {
		return this.invocationsList.filter(
			(inv): inv is OnToolCallInvocation =>
				inv.type === 'onToolCall' && inv.toolName !== OUTPUT_TOOL_NAME && inv.toolName !== SUBMIT_TOOL_NAME
		);
	}

	/**
	 * Get all output tool call invocations
	 */
	get outputToolCalls(): OnToolCallInvocation[] {
		return this.invocationsList.filter(
			(inv): inv is OnToolCallInvocation => inv.type === 'onToolCall' && inv.toolName === OUTPUT_TOOL_NAME
		);
	}

	/**
	 * Get all submit tool call invocations
	 */
	get submitToolCalls(): OnToolCallInvocation[] {
		return this.invocationsList.filter(
			(inv): inv is OnToolCallInvocation => inv.type === 'onToolCall' && inv.toolName === SUBMIT_TOOL_NAME
		);
	}

	/**
	 * Get all errors thrown by callbacks
	 */
	get errors(): ReadonlyArray<unknown> {
		return this.callbackErrors;
	}

	/**
	 * Reset tracker state
	 *
	 * Clears invocations and errors. Useful for reusing tracker across multiple tests.
	 */
	reset(): void {
		this.invocationsList = [];
		this.callbackErrors = [];
	}

	/**
	 * Invoke callback with error handling
	 *
	 * Catches and records any errors thrown by callbacks to prevent test failures.
	 */
	private invokeWithErrorHandling(fn: (() => void) | undefined): void {
		if (!fn) {
			return;
		}

		try {
			fn();
		} catch (error) {
			this.callbackErrors.push(error);
		}
	}
}
