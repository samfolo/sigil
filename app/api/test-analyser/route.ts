import type {NextRequest} from 'next/server';
import {NextResponse} from 'next/server';

import type {AnalyserAgentInput, AnalysisOutput} from '@sigil/src/agent/definitions/analyser';
import {createAnalyserAgent} from '@sigil/src/agent/definitions/analyser';
import {generateInitialVignettes} from '@sigil/src/agent/definitions/analyser/tools/sampler';
import type {ExecuteCallbacks} from '@sigil/src/agent/framework/executeAgent';
import {executeAgent} from '@sigil/src/agent/framework/executeAgent';
import {isErr} from '@sigil/src/common/errors/result';
import {createAgentLogger} from '@sigil/src/common/observability/logger';

const INITIAL_VIGNETTE_COUNT = 20;

/**
 * Test API route for end-to-end analyser agent integration.
 *
 * Validates the complete agent pipeline: preprocessing → agent creation →
 * execution → result handling. Provides observability into agent execution
 * behaviour through console logging.
 *
 * @endpoint POST /api/test-analyser
 *
 * @request
 * ```json
 * {
 *   "rawData": "name,age\nAlice,30\nBob,25"
 * }
 * ```
 *
 * @response Success (200)
 * ```json
 * {
 *   "status": "success",
 *   "analysis": {
 *     "classification": {"syntactic": "csv", "semantic": "User data"},
 *     "parseResult": {...},
 *     "summary": "CSV containing user information",
 *     "keyFields": [...]
 *   },
 *   "metadata": {
 *     "attempts": 1,
 *     "latency": 2500,
 *     "tokens": {"input": 1234, "output": 567}
 *   }
 * }
 * ```
 *
 * @response Error (400/500)
 * ```json
 * {
 *   "error": "Preprocessing failed",
 *   "details": "..."
 * }
 * ```
 */
export const POST = async (request: NextRequest) => {
	const logger = createAgentLogger('AnalyserAgent');
	const truncate = (str: string, max: number): string =>
		str.length > max ? str.slice(0, max) + '...' : str;

	try {
		// Request validation
		const body = await request.json();
		const {rawData} = body;

		if (!rawData || typeof rawData !== 'string' || rawData.trim() === '') {
			return NextResponse.json(
				{error: 'Invalid request', message: 'rawData field required (non-empty string)'},
				{status: 400}
			);
		}

		// Preprocessing: Generate initial vignettes
		logger.info({event: 'preprocessing_start'}, 'Starting preprocessing');
		const vignetteResult = await generateInitialVignettes(rawData, INITIAL_VIGNETTE_COUNT, {
			onChunkingComplete: (chunkCount, dataSizeKB) => {
				logger.info(
					{event: 'chunking_complete', chunkCount, dataSizeKB},
					'Chunked data, generating embeddings'
				);
			},
			onEmbeddingProgress: (current, total) => {
				logger.debug(
					{event: 'embedding_progress', current, total},
					'Embedding progress'
				);
			},
		});

		if (isErr(vignetteResult)) {
			return NextResponse.json(
				{error: 'Preprocessing failed', details: vignetteResult.error},
				{status: 400}
			);
		}

		const {vignettes, state: samplerState} = vignetteResult.data;
		logger.info(
			{event: 'vignettes_generated', vignetteCount: vignettes.length},
			'Generated vignettes'
		);

		// Agent creation
		let agent;
		try {
			agent = await createAnalyserAgent();
		} catch (error) {
			return NextResponse.json(
				{
					error: 'Agent creation failed',
					details: error instanceof Error ? error.message : 'Unknown error',
				},
				{status: 500}
			);
		}

		// Build agent input
		const agentInput: AnalyserAgentInput = {
			rawData,
			initialVignettes: vignettes,
			samplerState,
		};

		// Observability callbacks
		const callbacks: ExecuteCallbacks<AnalysisOutput> = {
			onAttemptStart: (context) => {
				logger.info(
					{
						event: 'attempt_start',
						attempt: context.attempt,
						maxAttempts: context.maxAttempts,
						iteration: context.iteration,
						maxIterations: context.maxIterations,
					},
					'Attempt started'
				);
			},
			onAttemptComplete: (context, success) => {
				logger.info(
					{
						event: 'attempt_complete',
						attempt: context.attempt,
						maxAttempts: context.maxAttempts,
						iteration: context.iteration,
						maxIterations: context.maxIterations,
						success,
					},
					'Attempt completed'
				);
			},
			onValidationFailure: (context, errors) => {
				logger.warn(
					{
						event: 'validation_failure',
						attempt: context.attempt,
						iteration: context.iteration,
						errors,
					},
					'Validation failed'
				);
			},
			onValidationLayerStart: (context, layer) => {
				logger.debug(
					{
						event: 'validation_layer_start',
						attempt: context.attempt,
						iteration: context.iteration,
						layerName: layer.name,
						layerType: layer.type,
					},
					'Validation layer started'
				);
			},
			onValidationLayerComplete: (context, layer) => {
				logger.debug(
					{
						event: 'validation_layer_complete',
						attempt: context.attempt,
						iteration: context.iteration,
						layerName: layer.name,
						layerType: layer.type,
						success: layer.success,
					},
					'Validation layer completed'
				);
			},
			onToolCall: (context, toolName, toolInput) => {
				logger.trace(
					{
						event: 'tool_call',
						attempt: context.attempt,
						iteration: context.iteration,
						toolName,
						toolInput,
					},
					'Tool called'
				);
			},
			onToolResult: (context, toolName, toolResult) => {
				logger.trace(
					{
						event: 'tool_result',
						attempt: context.attempt,
						iteration: context.iteration,
						toolName,
						toolResult: truncate(toolResult, 300),
					},
					'Tool result'
				);
			},
			onSuccess: (output) => {
				logger.info({event: 'success', output}, 'Agent succeeded');
			},
			onFailure: (errors) => {
				logger.error({event: 'failure', errors}, 'Agent failed');
			},
		};

		// Execute agent
		const result = await executeAgent(agent, {
			input: agentInput,
			callbacks,
		});

		// Handle execution result
		if (isErr(result)) {
			return NextResponse.json(
				{
					error: 'Analysis failed',
					details: result.error,
				},
				{status: 500}
			);
		}

		// Success response
		return NextResponse.json({
			status: 'success',
			analysis: result.data.output,
			metadata: {
				attempts: result.data.attempts,
				latency: result.data.metadata?.latency,
				tokens: result.data.metadata?.tokens,
			},
		});
	} catch (error) {
		logger.error(
			{event: 'unexpected_error', error: error instanceof Error ? error.message : String(error)},
			'Unexpected error'
		);
		return NextResponse.json(
			{
				error: 'Failed to process request',
				details: error instanceof Error ? error.message : 'Unknown error',
			},
			{status: 500}
		);
	}
};
