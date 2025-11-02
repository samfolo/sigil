import type {NextRequest} from 'next/server';
import {NextResponse} from 'next/server';

import type {AnalyserAgentInput, AnalysisOutput} from '@sigil/src/agent/definitions/analyser';
import {createAnalyserAgent} from '@sigil/src/agent/definitions/analyser';
import {generateInitialVignettes} from '@sigil/src/agent/definitions/analyser/tools/sampler';
import type {ExecuteCallbacks} from '@sigil/src/agent/framework/executeAgent';
import {executeAgent} from '@sigil/src/agent/framework/executeAgent';
import {isErr} from '@sigil/src/common/errors/result';

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
		console.log('[Analyser] Starting preprocessing...');
		const vignetteResult = await generateInitialVignettes(rawData, INITIAL_VIGNETTE_COUNT, {
			onChunkingComplete: (chunkCount, dataSizeKB) => {
				console.log(`[Vignettes] Chunked ${dataSizeKB} KB of data. Generating embeddings...`);
			},
			onEmbeddingProgress: (current, total) => {
				console.log(`[Vignettes] Embedded ${current}/${total} chunks`);
			},
		});

		if (isErr(vignetteResult)) {
			return NextResponse.json(
				{error: 'Preprocessing failed', details: vignetteResult.error},
				{status: 400}
			);
		}

		const {vignettes, state: samplerState} = vignetteResult.data;
		console.log(`[Analyser] Generated ${vignettes.length} vignettes`);

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

		// Truncation helper for log output
		const truncate = (str: string, max: number): string =>
			str.length > max ? str.slice(0, max) + '...' : str;

		// Observability callbacks
		const callbacks: ExecuteCallbacks<AnalysisOutput> = {
			onAttemptStart: (context) => {
				console.log(`[Analyser] Attempt ${context.attempt}/${context.maxAttempts}`);
			},
			onToolCall: (context, toolName, toolInput) => {
				console.log(
					`[Analyser] Tool: ${toolName} | Input: ${truncate(JSON.stringify(toolInput), 200)}`
				);
			},
			onToolResult: (context, toolName, toolResult) => {
				console.log(
					`[Analyser] Result: ${toolName} | ${truncate(toolResult, 300)}`
				);
			},
			onValidationFailure: (context, _errors) => {
				console.log(
					`[Analyser] Validation failed on attempt ${context.attempt}`
				);
			},
			onSuccess: (_output) => {
				console.log('[Analyser] Success');
			},
			onFailure: (_errors) => {
				console.log('[Analyser] Terminal failure');
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
				tokens: result.data.metadata?.tokens ? {
					input: result.data.metadata.tokens.input,
					output: result.data.metadata.tokens.output,
				} : undefined,
			},
		});
	} catch (error) {
		console.error('[Analyser] Unexpected error:', error);
		return NextResponse.json(
			{
				error: 'Failed to process request',
				details: error instanceof Error ? error.message : 'Unknown error',
			},
			{status: 500}
		);
	}
};
