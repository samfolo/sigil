import type Anthropic from '@anthropic-ai/sdk';

import {createAnthropicClient} from '@sigil/src/agent/clients/anthropic';
import {DEFAULT_MAX_ITERATIONS} from '@sigil/src/agent/framework/common';
import type {AgentDefinition, ObservabilityConfig} from '@sigil/src/agent/framework/defineAgent';
import type {AgentState} from '@sigil/src/agent/framework/defineAgent/types';
import {buildSystemPrompt, buildUserPrompt} from '@sigil/src/agent/framework/prompts/build';
import type {AgentExecutionContext} from '@sigil/src/agent/framework/types';
import type {
	ValidationLayerMetadata,
	ValidationLayerResult,
	ValidationLayerCallbacks,
	ValidationLayerIdentity,
} from '@sigil/src/agent/framework/validation';
import {validateLayers} from '@sigil/src/agent/framework/validation/validateLayers';
import type {AgentError, Result, ExecutionPhase} from '@sigil/src/common/errors';
import {err, ok, isErr, AGENT_ERROR_CODES, safeStringify} from '@sigil/src/common/errors';

import {buildMetadata} from './iteration/buildMetadata';
import {buildTools} from './iteration/buildTools';
import {handleValidationFailure} from './iteration/handleValidationFailure';
import {handleValidationSuccess} from './iteration/handleValidationSuccess';
import {runIterationLoop} from './iteration/runIterationLoop';
import type {
	ExecuteOptions,
	ExecuteSuccess,
	ExecuteFailure,
} from './types';
import {safeInvokeCallback} from './util';

/**
 * Default run state initialiser that returns an empty object
 *
 * Used when no custom initialRunState function is provided in the agent definition.
 */
const DEFAULT_RUN_STATE_INITIALISER = <Run>(): Run => ({} as Run);

/**
 * Default attempt state initialiser that returns an empty object
 *
 * Used when no custom initialAttemptState function is provided in the agent definition.
 */
const DEFAULT_ATTEMPT_STATE_INITIALISER = <Attempt>(): Attempt => ({} as Attempt);

/**
 * Executes an agent with retry logic and multi-layer validation
 *
 * This function orchestrates the complete agent execution flow:
 * 1. Iterates up to maxAttempts times
 * 2. On each attempt:
 *    - Generates system and user prompts from the agent's prompt functions
 *    - Calls the LLM with the generated prompts
 *    - Validates the response through multiple validation layers:
 *      - Zod schema validation (outputSchema)
 *      - Custom validators (if configured)
 * 3. On validation failure:
 *    - Formats errors into LLM-actionable feedback
 *    - Retries with error context in the next attempt
 * 4. On validation success:
 *    - Returns ExecuteSuccess with validated output and metadata
 * 5. On max attempts exceeded:
 *    - Returns AgentError[] with MAX_ATTEMPTS_EXCEEDED code
 *
 * Uses the Result pattern for type-safe error handling. Check success with
 * isOk/isErr type guards from @sigil/src/common/errors/result.
 *
 * @template Input - The type of input data the agent accepts
 * @template Output - The type of validated output the agent produces
 *
 * @param agent - Agent definition created by defineAgent()
 * @param options - Execution configuration including input data and optional overrides
 * @returns Promise resolving to Result containing either ExecuteSuccess or ExecuteFailure
 *
 * @example
 * ```typescript
 * import {isOk, isErr} from '@sigil/src/common/errors';
 * import {executeAgent} from '@sigil/src/agent/framework/executeAgent';
 * import {myAgent} from './agents/myAgent';
 *
 * const result = await executeAgent(myAgent, {
 *   input: {data: 'example'},
 *   maxAttempts: 5,
 *   callbacks: {
 *     onAttemptStart: (state) => console.log(`Attempt ${state.attempt}`),
 *     onValidationLayerStart: (state, layer) => {
 *       console.log(`[${state.attempt}] Starting ${layer.type}: ${layer.name}`);
 *     },
 *     onValidationLayerComplete: (state, layer) => {
 *       if (layer.success) {
 *         console.log(`[${state.attempt}] ✓ ${layer.name} passed`);
 *       } else {
 *         console.log(`[${state.attempt}] × ${layer.name} failed:`, layer.error);
 *       }
 *     },
 *     onSuccess: (output) => console.log('Success!', output),
 *   },
 * });
 *
 * if (isOk(result)) {
 *   console.log('Output:', result.data.output);
 *   console.log('Attempts:', result.data.attempts);
 *   console.log('Latency:', result.data.metadata?.latency);
 *   console.log('Tokens:', result.data.metadata?.tokens);
 * } else {
 *   console.error('Execution failed:', result.error.errors);
 *   console.error('Failure metadata:', result.error.metadata);
 * }
 * ```
 */
/**
 * Creates an EXECUTION_CANCELLED error with proper context
 *
 * @param attempt - Current attempt number when cancellation occurred
 * @param phase - Execution phase where cancellation was detected
 * @returns ExecuteFailure with EXECUTION_CANCELLED error
 */
const createCancellationError = (
	attempt: number,
	phase: ExecutionPhase,
	observability: ObservabilityConfig,
	startTime: number,
	totalInputTokens: number,
	totalOutputTokens: number,
	callbackErrors: Error[]
): ExecuteFailure => {
	const error: AgentError = {
		code: AGENT_ERROR_CODES.EXECUTION_CANCELLED,
		severity: 'error',
		category: 'execution',
		context: {
			attempt,
			phase,
		},
	};

	const metadata = buildMetadata({
		observability,
		durationMetrics: {
			startTime,
		},
		tokenMetrics: {
			input: totalInputTokens,
			output: totalOutputTokens,
		},
		callbackErrors
	});

	return {
		errors: [error],
		metadata,
	};
};


/**
 * Options for building execution metadata
 */

export const executeAgent = async <Input, Output, Run extends object, Attempt extends object>(
	agent: AgentDefinition<Input, Output, Run, Attempt>,
	options: ExecuteOptions<Input, Output>
): Promise<Result<ExecuteSuccess<Output>, ExecuteFailure>> => {
	// Track execution start time for latency calculation
	const startTime = performance.now();

	// Track token usage across all attempts
	let totalInputTokens = 0;
	let totalOutputTokens = 0;

	// Determine max attempts (options override or agent default)
	const maxAttempts = options.maxAttempts ?? agent.validation.maxAttempts;

	// Track callback errors
	const callbackErrors: Error[] = [];

	// Track last validation errors for MAX_ATTEMPTS_EXCEEDED error context
	let lastValidationError: unknown;

	// Track last failed validation layer for error formatting
	// Permanent structure to avoid TypeScript narrowing issues with undefined assignment
	const lastFailedLayer: ValidationLayerIdentity = {
		name: 'validation',
		description: 'No description provided for validation layer',
	};

	// Initialise run state once (persists across attempts)
	const runStateInitialiser = agent.initialRunState ?? DEFAULT_RUN_STATE_INITIALISER<Run>;
	const runState: Run = runStateInitialiser(options.input);

	// Check for cancellation before building user prompt
	if (options.signal?.aborted) {
		return err(createCancellationError(
			0,
			'prompt_generation',
			agent.observability,
			startTime,
			totalInputTokens,
			totalOutputTokens,
			callbackErrors
		));
	}

	// Build user prompt once (immutable task description)
	const userPromptResult = await buildUserPrompt(agent, options.input, options.signal);
	if (isErr(userPromptResult)) {
		return err({
			errors: userPromptResult.error,
			metadata: buildMetadata({
				observability: agent.observability,
				durationMetrics: {
					startTime,
				},
				tokenMetrics: {
					input: totalInputTokens,
					output: totalOutputTokens,
				},
				callbackErrors
			}),
		});
	}

	// Initialise conversation history with the original task
	const conversationHistory: Anthropic.MessageParam[] = [
		{
			role: 'user',
			content: userPromptResult.data,
		},
	];

	// Create Anthropic client once (reuse across retries)
	const anthropic = createAnthropicClient();

	// Retry loop
	for (let attempt = 1; attempt <= maxAttempts; attempt++) {
		// Check for cancellation at start of each iteration
		if (options.signal?.aborted) {
			return err(createCancellationError(
				attempt,
				'prompt_generation',
				agent.observability,
				startTime,
				totalInputTokens,
				totalOutputTokens,
				callbackErrors
			));
		}

		// Determine iteration limit for this attempt
		const maxIterations = agent.validation.maxIterationsPerAttempt ?? DEFAULT_MAX_ITERATIONS;

		// Create execution context
		const context: AgentExecutionContext = {
			attempt,
			maxAttempts,
			iteration: 0, // Will be incremented before each API call in the loop
			maxIterations,
		};

		// Initialise attempt state (resets each attempt)
		const attemptStateInitialiser = agent.initialAttemptState ?? DEFAULT_ATTEMPT_STATE_INITIALISER<Attempt>;
		const attemptState: Attempt = attemptStateInitialiser(options.input, runState, context);

		// Create combined current state with all three tiers
		let currentState: AgentState<Run, Attempt> = {
			context,
			run: runState,
			attempt: attemptState,
		};

		// Reset failed layer tracking for this attempt
		lastFailedLayer.name = 'validation';
		lastFailedLayer.description = 'No description provided for validation layer';

		// Invoke onAttemptStart callback
		safeInvokeCallback(
			options.callbacks?.onAttemptStart,
			[context],
			callbackErrors
		);

		// Check for cancellation before building system prompt
		if (options.signal?.aborted) {
			return err(createCancellationError(
				attempt,
				'prompt_generation',
				agent.observability,
				startTime,
				totalInputTokens,
				totalOutputTokens,
				callbackErrors
			));
		}

		// Build system prompt (can adapt based on attempt)
		const systemPromptResult = await buildSystemPrompt(
			agent,
			options.input,
			context,
		);

		if (isErr(systemPromptResult)) {
			return err({
				errors: systemPromptResult.error,
				metadata: buildMetadata({
					observability: agent.observability,
					durationMetrics: {
						startTime,
					},
					tokenMetrics: {
						input: totalInputTokens,
						output: totalOutputTokens,
					},
					callbackErrors
				}),
			});
		}

		// Determine if reflection mode is enabled
		const isReflectionEnabled = !!agent.tools.output.reflectionHandler;

		// Build tools array from agent configuration
		const tools = buildTools(agent, isReflectionEnabled);

		// Run iteration loop
		const iterationResult = await runIterationLoop({
			agent,
			anthropic,
			context,
			state: {
				current: currentState,
				run: runState,
			},
			conversationHistory,
			systemPrompt: systemPromptResult.data,
			tools,
			isReflectionEnabled,
			maxIterations,
			signal: options.signal,
			callbacks: {
				onToolCall: options.callbacks?.onToolCall,
				onToolResult: options.callbacks?.onToolResult,
			},
			callbackErrors,
			durationMetrics: {
				startTime,
			},
			tokenMetrics: {
				input: totalInputTokens,
				output: totalOutputTokens,
			},
		});

		if (isErr(iterationResult)) {
			return iterationResult;
		}

		// Extract results from iteration loop
		const {output, lastResponse: response, updatedState} = iterationResult.data;
		totalInputTokens = iterationResult.data.tokenMetrics.input;
		totalOutputTokens = iterationResult.data.tokenMetrics.output;
		currentState = updatedState;

		// Check for cancellation before validation
		if (options.signal?.aborted) {
			return err(createCancellationError(
				attempt,
				'validation',
				agent.observability,
				startTime,
				totalInputTokens,
				totalOutputTokens,
				callbackErrors
			));
		}

		// Validate output through multi-layer validation
		// Map ExecuteCallbacks to ValidationLayerCallbacks
		// Always provide onLayerComplete to capture failed layer metadata for error formatting
		const validationCallbacks: ValidationLayerCallbacks = {
			onLayerStart: options.callbacks?.onValidationLayerStart
				? (layer: ValidationLayerMetadata) => {
					safeInvokeCallback(
						options.callbacks?.onValidationLayerStart,
						[{...currentState.context}, layer],
						callbackErrors
					);
				}
				: undefined,
			onLayerComplete: (layer: ValidationLayerResult) => {
				// Always capture failed layer metadata for error formatting
				if (!layer.success) {
					lastFailedLayer.name = layer.name;
					lastFailedLayer.description = layer.description;
				}

				// Call user callback if provided
				if (options.callbacks?.onValidationLayerComplete) {
					safeInvokeCallback(
						options.callbacks?.onValidationLayerComplete,
						[{...currentState.context}, layer],
						callbackErrors
					);
				}
			},
		};

		const validationResult = await validateLayers(
			output,
			agent.validation.outputSchema,
			agent.validation.customValidators,
			validationCallbacks,
		);

		// Handle validation success
		if (!isErr(validationResult)) {
			return handleValidationSuccess({
				output: validationResult.data,
				context,
				observability: agent.observability,
				durationMetrics: {
					startTime,
				},
				tokenMetrics: {
					input: totalInputTokens,
					output: totalOutputTokens,
				},
				callbackErrors,
				callbacks: options.callbacks,
			});
		}

		// Handle validation failure
		lastValidationError = validationResult.error;

		const failureResult = await handleValidationFailure({
			validationError: validationResult.error,
			context,
			agent,
			lastFailedLayer,
			lastResponse: response!,
			conversationHistory,
			durationMetrics: {
				startTime,
			},
			tokenMetrics: {
				input: totalInputTokens,
				output: totalOutputTokens,
			},
			callbackErrors,
			callbacks: options.callbacks,
		});

		if (isErr(failureResult)) {
			return failureResult;
		}

		// Continue to next iteration
	}

	// Max attempts exceeded - all attempts failed validation
	// Invoke onFailure callback
	const maxAttemptsError: AgentError = {
		code: AGENT_ERROR_CODES.MAX_ATTEMPTS_EXCEEDED,
		severity: 'error',
		category: 'execution',
		context: {
			attempts: maxAttempts,
			maxAttempts,
			lastError: lastValidationError ? safeStringify(lastValidationError) : undefined,
		},
	};

	safeInvokeCallback(
		options.callbacks?.onFailure,
		[[maxAttemptsError]],
		callbackErrors
	);

	// Build metadata based on observability configuration
	const metadata = buildMetadata({
		observability: agent.observability,
		durationMetrics: {
			startTime,
		},
		tokenMetrics: {
			input: totalInputTokens,
			output: totalOutputTokens,
		},
		callbackErrors
	});

	return err({
		errors: [maxAttemptsError],
		metadata,
	});
};
