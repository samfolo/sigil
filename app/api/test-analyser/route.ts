import {randomUUID} from 'node:crypto';

import type {NextRequest} from 'next/server';
import {NextResponse} from 'next/server';

import type {AnalyserAgentInput, AnalysisOutput} from '@sigil/src/agent/definitions/analyser';
import {createAnalyserAgent} from '@sigil/src/agent/definitions/analyser';
import {generateInitialVignettes} from '@sigil/src/agent/definitions/analyser/tools/sampler';
import type {GenerateSigilIRInput, GenerateSigilIROutput} from '@sigil/src/agent/definitions/generateSigilIR';
import {createGenerateSigilIRAgent} from '@sigil/src/agent/definitions/generateSigilIR';
import type {ExecuteCallbacks} from '@sigil/src/agent/framework/executeAgent';
import {executeAgent} from '@sigil/src/agent/framework/executeAgent';
import {AGENT_ERROR_CODES} from '@sigil/src/common/errors';
import {isErr} from '@sigil/src/common/errors/result';
import {createSigilLogger} from '@sigil/src/common/observability/logger';
import type {RunMetadataStatus} from '@sigil/src/common/run';
import {generateRunId, saveInput, saveData, saveAnalysis, saveOutput, saveMetadata} from '@sigil/src/common/run';

const INITIAL_VIGNETTE_COUNT = 20;

// HTTP Status Codes
const CLIENT_CLOSED_REQUEST = 499;

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
	// Declare run tracking variables in outer scope (for finally block)
	let runId: string | undefined;
	let startTimestamp: number | undefined;
	let status: RunMetadataStatus = 'failed';
	let logger: ReturnType<typeof createSigilLogger> | undefined;
	const executedAgents: string[] = [];

	const truncate = (str: string, max: number): string =>
		str.length > max ? str.slice(0, max) + '...' : str;

	// Create local AbortController that mirrors request.signal
	const controller = new AbortController();
	const mirrorAbort = () => {
		controller.abort();
	};
	request.signal.addEventListener('abort', mirrorAbort);

	// Helper to handle cancellation responses
	const handleCancellation = (phase: string, details: unknown) => {
		// Logger may not be initialised if cancellation happens during validation
		if (logger) {
			logger.info(
				{event: 'request_cancelled', data: {phase, error: details}},
				'Request cancelled by client'
			);
		}
		return NextResponse.json(
			{error: 'Request cancelled', details},
			{status: CLIENT_CLOSED_REQUEST}
		);
	};

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

		// Generate run ID and initialise tracking
		runId = generateRunId();
		startTimestamp = Date.now();
		logger = createSigilLogger('DataProcessingPipeline', runId);

		// Preprocessing: Generate initial vignettes
		logger.info({event: 'preprocessing_start'}, 'Starting preprocessing');
		const vignetteResult = await generateInitialVignettes(
			rawData,
			INITIAL_VIGNETTE_COUNT,
			{
				onChunkingComplete: (chunkCount, dataSizeKB) => {
					if (logger) {
						logger.info(
							{event: 'chunking_complete', data: {chunkCount, dataSizeKB}},
							'Chunked data, generating embeddings'
						);
					}
				},
				onEmbeddingProgress: (current, total) => {
					if (logger) {
						logger.debug(
							{event: 'embedding_progress', data: {current, total}},
							'Embedding progress'
						);
					}
				},
			},
			controller.signal
		);

		if (isErr(vignetteResult)) {
			// Check if preprocessing was cancelled
			if (controller.signal.aborted) {
				return handleCancellation('preprocessing', vignetteResult.error);
			}

			return NextResponse.json(
				{error: 'Preprocessing failed', details: vignetteResult.error},
				{status: 400}
			);
		}

		const {vignettes, state: samplerState} = vignetteResult.data;
		logger.info(
			{event: 'vignettes_generated', data: {vignetteCount: vignettes.length}},
			'Generated vignettes'
		);

		// Save input artifact
		const inputResult = saveInput(runId, rawData);
		if (isErr(inputResult)) {
			logger.error(
				{event: 'unexpected_error', data: {error: inputResult.error}},
				'Failed to save input'
			);
			// Continue execution - don't fail the request if input save fails
		}

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

		const analyserLogger = logger.child('Analyser');

		// Track Analyser execution
		executedAgents.push('Analyser');

		// Observability callbacks
		const callbacks: ExecuteCallbacks<AnalysisOutput> = {
			onAttemptStart: (context) => {
				analyserLogger.info(
					{
						event: 'attempt_start',
						data: {
							attempt: context.attempt,
							maxAttempts: context.maxAttempts,
							iteration: context.iteration,
							maxIterations: context.maxIterations,
						},
					},
					'Attempt started'
				);
			},
			onAttemptComplete: (context, success) => {
				analyserLogger.info(
					{
						event: 'attempt_complete',
						data: {
							attempt: context.attempt,
							maxAttempts: context.maxAttempts,
							iteration: context.iteration,
							maxIterations: context.maxIterations,
							success,
						},
					},
					'Attempt completed'
				);
			},
			onValidationFailure: (context, errors) => {
				analyserLogger.warn(
					{
						event: 'validation_failure',
						data: {
							attempt: context.attempt,
							iteration: context.iteration,
							errors,
						},
					},
					'Validation failed'
				);
			},
			onValidationLayerStart: (context, layer) => {
				analyserLogger.debug(
					{
						event: 'validation_layer_start',
						data: {
							attempt: context.attempt,
							iteration: context.iteration,
							layerName: layer.name,
							layerType: layer.type,
						},
					},
					'Validation layer started'
				);
			},
			onValidationLayerComplete: (context, layer) => {
				analyserLogger.debug(
					{
						event: 'validation_layer_complete',
						data: {
							attempt: context.attempt,
							iteration: context.iteration,
							layerName: layer.name,
							layerType: layer.type,
							success: layer.success,
						},
					},
					'Validation layer completed'
				);
			},
			onToolCall: (context, toolName, toolInput) => {
				analyserLogger.trace(
					{
						event: 'tool_call',
						data: {
							attempt: context.attempt,
							iteration: context.iteration,
							toolName,
							toolInput,
						},
					},
					'Tool called'
				);
			},
			onToolResult: (context, toolName, toolResult) => {
				analyserLogger.trace(
					{
						event: 'tool_result',
						data: {
							attempt: context.attempt,
							iteration: context.iteration,
							toolName,
							toolResult: truncate(toolResult, 300),
						},
					},
					'Tool result'
				);
			},
			onSuccess: (output, metadata) => {
				analyserLogger.info(
					{
						event: 'success',
						data: {
							output,
							tokens: metadata?.tokens,
							latency: metadata?.latency,
						},
					},
					'Agent succeeded'
				);
			},
			onFailure: (errors, metadata) => {
				analyserLogger.error(
					{
						event: 'failure',
						data: {
							errors,
							tokens: metadata?.tokens,
							latency: metadata?.latency,
						},
					},
					'Agent failed'
				);
			},
		};

		// Execute agent
		const result = await executeAgent(agent, {
			input: agentInput,
			callbacks,
			signal: controller.signal,
		});

		// Handle execution result
		if (isErr(result)) {
			if (controller.signal.aborted) {
				return handleCancellation('execution', result.error);
			}

			return NextResponse.json(
				{
					error: 'Analysis failed',
					details: result.error,
				},
				{status: 500}
			);
		}

		// Analyser succeeded - store metadata
		const analyserMetadata = {
			attempts: result.data.attempts,
			latency: result.data.metadata?.latency,
			tokens: result.data.metadata?.tokens,
		};
		const analysisOutput = result.data.output;
		const parsedData = result.data.stateProjection;

		logger.info(
			{event: 'analyser_complete', data: {metadata: analyserMetadata}},
			'Analyser complete, starting GenerateSigilIR'
		);

		// Save data artifact (parsed data from state projection)
		if (parsedData === undefined) {
			logger.warn(
				{event: 'missing_parsed_data'},
				'Skipping data save: parsedData is undefined'
			);
		} else {
			const dataResult = saveData(runId, parsedData);
			if (isErr(dataResult)) {
				logger.error(
					{event: 'unexpected_error', data: {error: dataResult.error}},
					'Failed to save data'
				);
				// Continue execution - don't fail the request if data save fails
			}
		}

		// Save analysis artifact
		const analysisResult = saveAnalysis(runId, analysisOutput);
		if (isErr(analysisResult)) {
			logger.error(
				{event: 'unexpected_error', data: {error: analysisResult.error}},
				'Failed to save analysis'
			);
			// Continue execution - don't fail the request if analysis save fails
		}

		// Create GenerateSigilIR agent
		let generatorAgent;
		try {
			generatorAgent = await createGenerateSigilIRAgent({parsedData});
		} catch (error) {
			// Return partial success: analysis succeeded but IR generation failed to init
			return NextResponse.json({
				status: 'partial_success',
				analysis: analysisOutput,
				spec: null,
				error: {
					code: AGENT_ERROR_CODES.AGENT_CREATION_FAILED,
					details: error instanceof Error ? error.message : 'Unknown error',
				},
				metadata: {
					analyser: analyserMetadata,
					generator: null,
				},
			});
		}

		// Build GenerateSigilIR input
		const generatorInput: GenerateSigilIRInput = {
			analysis: analysisOutput,
			parsedData,
		};

		const generatorLogger = logger.child('GenerateSigilIR');

		// Track GenerateSigilIR execution
		executedAgents.push('GenerateSigilIR');

		// Observability callbacks for GenerateSigilIR
		const generatorCallbacks: ExecuteCallbacks<GenerateSigilIROutput> = {
			onAttemptStart: (context) => {
				generatorLogger.info(
					{
						event: 'attempt_start',
						data: {
							attempt: context.attempt,
							maxAttempts: context.maxAttempts,
							iteration: context.iteration,
							maxIterations: context.maxIterations,
						},
					},
					'GenerateSigilIR attempt started'
				);
			},
			onAttemptComplete: (context, success) => {
				generatorLogger.info(
					{
						event: 'attempt_complete',
						data: {
							attempt: context.attempt,
							maxAttempts: context.maxAttempts,
							iteration: context.iteration,
							maxIterations: context.maxIterations,
							success,
						},
					},
					'GenerateSigilIR attempt completed'
				);
			},
			onValidationFailure: (context, errors) => {
				generatorLogger.warn(
					{
						event: 'validation_failure',
						data: {
							attempt: context.attempt,
							iteration: context.iteration,
							errors,
						},
					},
					'GenerateSigilIR validation failed'
				);
			},
			onValidationLayerStart: (context, layer) => {
				generatorLogger.debug(
					{
						event: 'validation_layer_start',
						data: {
							attempt: context.attempt,
							iteration: context.iteration,
							layerName: layer.name,
							layerType: layer.type,
						},
					},
					'GenerateSigilIR validation layer started'
				);
			},
			onValidationLayerComplete: (context, layer) => {
				generatorLogger.debug(
					{
						event: 'validation_layer_complete',
						data: {
							attempt: context.attempt,
							iteration: context.iteration,
							layerName: layer.name,
							layerType: layer.type,
							success: layer.success,
						},
					},
					'GenerateSigilIR validation layer completed'
				);
			},
			onSuccess: (output, metadata) => {
				generatorLogger.info(
					{
						event: 'success',
						data: {
							tokens: metadata?.tokens,
							latency: metadata?.latency,
						},
					},
					'GenerateSigilIR succeeded'
				);
			},
			onFailure: (errors, metadata) => {
				generatorLogger.error(
					{
						event: 'failure',
						data: {
							errors,
							tokens: metadata?.tokens,
							latency: metadata?.latency,
						},
					},
					'GenerateSigilIR failed'
				);
			},
		};

		// Execute GenerateSigilIR agent
		const generatorResult = await executeAgent(generatorAgent, {
			input: generatorInput,
			callbacks: generatorCallbacks,
			signal: controller.signal,
		});

		// Handle GenerateSigilIR result
		if (isErr(generatorResult)) {
			if (controller.signal.aborted) {
				return handleCancellation('execution', generatorResult.error);
			}

			// Return partial success: analysis succeeded but IR generation failed
			return NextResponse.json({
				status: 'partial_success',
				analysis: analysisOutput,
				spec: null,
				error: {
					code: AGENT_ERROR_CODES.SPEC_GENERATION_FAILED,
					details: generatorResult.error,
				},
				metadata: {
					analyser: analyserMetadata,
					generator: null,
				},
			});
		}

		// Both agents succeeded - add id and created_at to spec
		const completeSpec = {
			id: randomUUID(),
			created_at: new Date().toISOString(),
			...generatorResult.data.output,
		};

		// Save output artifact
		const outputResult = saveOutput(runId, completeSpec);
		if (isErr(outputResult)) {
			logger.error(
				{event: 'unexpected_error', data: {error: outputResult.error}},
				'Failed to save output'
			);
			// Continue execution - don't fail the request if output save fails
		}

		// Mark as completed only when full pipeline succeeds
		status = 'completed';

		// Full success response
		return NextResponse.json({
			status: 'success',
			analysis: analysisOutput,
			spec: completeSpec,
			metadata: {
				analyser: analyserMetadata,
				generator: {
					attempts: generatorResult.data.attempts,
					latency: generatorResult.data.metadata?.latency,
					tokens: generatorResult.data.metadata?.tokens,
				},
			},
		});
	} catch (error) {
		// Check if request was cancelled
		if (controller.signal.aborted) {
			return handleCancellation(
				'request',
				error instanceof Error ? error.message : String(error)
			);
		}

		// Unexpected error
		if (logger) {
			logger.error(
				{event: 'unexpected_error', data: {error: error instanceof Error ? error.message : String(error)}},
				'Unexpected error'
			);
		}
		return NextResponse.json(
			{
				error: 'Failed to process request',
				details: error instanceof Error ? error.message : 'Unknown error',
			},
			{status: 500}
		);
	} finally {
		// Cleanup: remove abort listener
		request.signal.removeEventListener('abort', mirrorAbort);

		// Save run metadata if execution got past validation
		if (runId && logger && startTimestamp) {
			const metadataResult = saveMetadata(runId, {
				pipeline: 'DataProcessingPipeline',
				agents: executedAgents,
				startTimestamp,
				endTimestamp: Date.now(),
				status,
			});

			if (isErr(metadataResult)) {
				logger.error(
					{event: 'unexpected_error', data: {error: metadataResult.error}},
					'Failed to save run metadata'
				);
			}
		}
	}
};
