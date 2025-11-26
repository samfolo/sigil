/**
 * GenerateSigilIR Agent Definition
 *
 * Generates valid ComponentSpec intermediate representations from AnalysisOutput.
 * Uses full ComponentSpec schema with prompt caching for cost efficiency.
 */

import type {AgentDefinition} from '@sigil/src/agent/framework/defineAgent';
import {defineAgent} from '@sigil/src/agent/framework/defineAgent';
import {isErr} from '@sigil/src/common/errors/result';
import type {EmptyObject} from '@sigil/src/common/types';
import {ComponentSpecSchema} from '@sigil/src/lib/generated/schemas';

import {buildSystemPrompt, buildUserPrompt, buildErrorPrompt} from './prompts/build';
import type {GenerateSigilIRInput, GenerateSigilIROutput} from './types';
import {createBuildRenderTreeValidator} from './validators/buildRenderTreeValidator';

/**
 * Agent configuration constants
 */
const MAX_VALIDATION_ATTEMPTS = 5;
const MODEL_TEMPERATURE = 0.4;
const MAX_MODEL_TOKENS = 16000;

/**
 * Configuration for creating the GenerateSigilIR agent
 */
interface CreateGenerateSigilIRAgentOptions {
	/**
	 * Parsed data from Analyser for buildRenderTree validation
	 */
	parsedData: unknown;
}

/**
 * Creates the GenerateSigilIR agent definition
 *
 * This agent generates ComponentSpec IRs from semantic analysis data. It uses:
 * - Two-block prompt caching (instructions + schema) for cost efficiency
 * - Temperature 0.4 for balance between creativity and schema compliance
 * - buildRenderTree custom validator to ensure specs are renderable
 * - No helper tools (stateless pure generation)
 *
 * @throws If prompt template loading or agent definition validation fails
 */
export const createGenerateSigilIRAgent = async (
	options: CreateGenerateSigilIRAgentOptions
): Promise<
	AgentDefinition<GenerateSigilIRInput, GenerateSigilIROutput, EmptyObject, EmptyObject>
> => {
	// Load prompt templates
	const systemPrompt = await buildSystemPrompt();
	const userPrompt = await buildUserPrompt();
	const errorPrompt = await buildErrorPrompt();

	// Build agent definition
	const definition: AgentDefinition<
		GenerateSigilIRInput,
		GenerateSigilIROutput,
		EmptyObject,
		EmptyObject
	> = {
		name: 'GenerateSigilIR',
		description: 'Generates valid ComponentSpec intermediate representations from semantic analysis data',

		model: {
			provider: 'anthropic' as const,
			name: 'claude-sonnet-4-5-20250929',
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
				name: 'generate_component_spec',
				description: 'Submit the complete generated ComponentSpec. Omit id and created_at fields - these are added by the framework after validation.',
			},
			helpers: {},
		},

		validation: {
			outputSchema: ComponentSpecSchema.omit({id: true, created_at: true}),
			customValidators: [createBuildRenderTreeValidator({data: options.parsedData})],
			maxAttempts: MAX_VALIDATION_ATTEMPTS,
		},

		observability: {
			trackCost: true,
			trackLatency: true,
			trackAttempts: true,
			trackTokens: true,
		},

		initialRunState: () => ({}),
		initialAttemptState: () => ({}),
	};

	// Validate and freeze definition
	const result = defineAgent(definition);
	if (isErr(result)) {
		throw new Error(
			`GenerateSigilIR agent definition validation failed: ${JSON.stringify(result.error)}`
		);
	}

	return result.data;
};
