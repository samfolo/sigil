import type Anthropic from '@anthropic-ai/sdk';
import * as z from 'zod';

import type {AgentDefinition} from '@sigil/src/agent/framework/defineAgent';

import {SUBMIT_TOOL_NAME} from './constants';

/**
 * Default submit tool definition for reflection mode
 *
 * Automatically injected when output tool has a reflection handler.
 * Signals that the model is satisfied with its output and ready for validation.
 */
export const DEFAULT_SUBMIT_TOOL: Anthropic.Tool = {
	name: SUBMIT_TOOL_NAME,
	description: 'Submit your final output for validation. Call this when you are satisfied with your output.',
	input_schema: {
		type: 'object',
		properties: {},
		required: [],
	},
};

/**
 * Builds the tools array for agent execution
 *
 * Constructs an array of Anthropic tools from the agent definition:
 * - Output tool (always included, built from outputSchema)
 * - Helper tools (optional, built from helpers configuration)
 * - Submit tool (only included if reflection mode is enabled)
 *
 * @param agent - Agent definition containing tool configurations
 * @param isReflectionEnabled - Whether reflection mode is enabled (has reflectionHandler)
 * @returns Array of Anthropic tool definitions
 */
export const buildTools = <Input, Output, Run extends object, Attempt extends object>(
	agent: AgentDefinition<Input, Output, Run, Attempt>,
	isReflectionEnabled: boolean
): Anthropic.Tool[] => {
	// Build output tool from schema
	// Agent output schemas are always objects, so this cast is safe
	const outputTool: Anthropic.Tool = {
		name: agent.tools.output.name,
		description: agent.tools.output.description,
		input_schema: z.toJSONSchema(agent.validation.outputSchema) as Anthropic.Tool.InputSchema,
	};

	// Build helper tools array from configuration
	const helperTools: Anthropic.Tool[] = agent.tools.helpers
		? Object.values(agent.tools.helpers).map((helper) => ({
			name: helper.name,
			description: helper.description,
			input_schema: z.toJSONSchema(helper.inputSchema) as Anthropic.Tool.InputSchema,
		}))
		: [];

	// Combine tools (inject submit tool if reflection enabled)
	return [
		outputTool,
		...helperTools,
		...(isReflectionEnabled ? [DEFAULT_SUBMIT_TOOL] : []),
	];
};
