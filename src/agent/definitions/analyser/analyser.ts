/**
 * Analyser Agent Definition
 *
 * Creates Analyser Agent definition with embedded tools and prompt templates.
 *
 * Data format UX researcher that classifies data formats (JSON/CSV/YAML/XML),
 * extracts semantic metadata, and identifies key fields. Uses Haiku 4 for
 * speed and cost efficiency in format classification tasks.
 */

import type {AgentDefinition} from '@sigil/src/agent/framework/defineAgent';
import {defineAgent} from '@sigil/src/agent/framework/defineAgent';
import {isErr} from '@sigil/src/common/errors';

import {buildSystemPrompt, buildUserPrompt, buildErrorPrompt} from './prompts';
import type {AnalyserAgentInput, AnalysisOutput, AnalyserRunState, AnalyserAttemptState} from './schemas';
import {AnalysisOutputSchema} from './schemas';
import {createExploreStructureTool} from './tools/explore';
import {createQueryJSONPathTool} from './tools/explore';
import {createParseCSVTool} from './tools/parsers';
import {createParseJSONTool} from './tools/parsers';
import {createParseXMLTool} from './tools/parsers';
import {createParseYAMLTool} from './tools/parsers';
import {createRequestMoreSamplesTool} from './tools/sampler';

/**
 * Maximum number of validation retry attempts
 */
const MAX_VALIDATION_ATTEMPTS = 3;

/**
 * Maximum number of tool-calling iterations per validation attempt
 */
const MAX_ITERATIONS_PER_ATTEMPT = 15;

/**
 * Model temperature for response generation
 *
 * Low temperature for deterministic format classification
 */
const MODEL_TEMPERATURE = 0.1;

/**
 * Maximum tokens in model response
 */
const MAX_MODEL_TOKENS = 8000;

/**
 * Creates Analyser Agent definition with embedded tools and prompt templates
 *
 * Data format UX researcher that classifies data formats (JSON/CSV/YAML/XML),
 * extracts semantic metadata, and identifies key fields. Uses Haiku 4 for
 * speed and cost efficiency in format classification tasks.
 *
 * @returns Promise resolving to validated, frozen agent definition
 * @throws Error if template loading or agent validation fails
 */
export const createAnalyserAgent = async (): Promise<
	AgentDefinition<AnalyserAgentInput, AnalysisOutput, AnalyserRunState, AnalyserAttemptState>
> => {
	// Load async prompt templates
	const systemPrompt = await buildSystemPrompt();
	const userPrompt = await buildUserPrompt();
	const errorPrompt = await buildErrorPrompt();

	// Build agent definition (types inferred from helper tool configs)
	const definition: AgentDefinition<AnalyserAgentInput, AnalysisOutput, AnalyserRunState, AnalyserAttemptState> = {
		name: 'AnalyserAgent',
		description: 'Data format UX researcher - classifies formats and extracts semantic metadata',

		model: {
			provider: 'anthropic' as const,
			name: 'claude-haiku-4-5-20251001',
			temperature: MODEL_TEMPERATURE,
			maxTokens: MAX_MODEL_TOKENS,
		},

		prompts: {
			system: systemPrompt,
			user: userPrompt,
			error: errorPrompt,
		},

		tools: {
			output: {
				name: 'submit_analysis',
				description:
					'Submit complete analysis with classification, parseResult, summary, and keyFields. Validates against AnalysisOutputSchema.',
			},
			helpers: {
				parse_json: createParseJSONTool<AnalyserRunState, AnalyserAttemptState>(),
				parse_csv: createParseCSVTool<AnalyserRunState, AnalyserAttemptState>(),
				parse_yaml: createParseYAMLTool<AnalyserRunState, AnalyserAttemptState>(),
				parse_xml: createParseXMLTool<AnalyserRunState, AnalyserAttemptState>(),
				explore_structure: createExploreStructureTool<AnalyserRunState, AnalyserAttemptState>(),
				query_json_path: createQueryJSONPathTool<AnalyserRunState, AnalyserAttemptState>(),
				request_more_samples: createRequestMoreSamplesTool<AnalyserRunState, AnalyserAttemptState>(),
			},
		},

		validation: {
			outputSchema: AnalysisOutputSchema,
			customValidators: [],
			maxAttempts: MAX_VALIDATION_ATTEMPTS,
			maxIterationsPerAttempt: MAX_ITERATIONS_PER_ATTEMPT,
		},

		observability: {
			trackCost: true,
			trackLatency: true,
			trackAttempts: true,
			trackTokens: true,
		},

		initialRunState: (input) => ({
			rawData: input.rawData,
			parsedData: undefined,
			structureMetadata: undefined,
			samplerState: input.samplerState,
		}),

		initialAttemptState: () => ({}),
	};

	// Validate and return frozen definition
	const result = defineAgent(definition);
	if (isErr(result)) {
		throw new Error(`Agent definition validation failed: ${JSON.stringify(result.error)}`);
	}

	return result.data;
};
