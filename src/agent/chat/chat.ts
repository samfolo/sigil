import type Anthropic from '@anthropic-ai/sdk';

import {createAnthropicClient} from '@sigil/src/agent/clients/anthropic';
import {buildChatSystemPrompt} from '@sigil/src/agent/prompts';
import {aggregateData, filterData, getUniqueValues, sortData} from '@sigil/src/agent/tools';
import type {Analysis} from '@sigil/src/common/types/analysisSchema';
import type {ChatResponse, Message, ToolCall} from '@sigil/src/common/types/chat';

interface ChatRequest {
	messages: Message[];
	sessionId: string | null;
	dataContext: {
		format: string;
		analysis: Analysis;
		dataSample: string;
		fullData: unknown;
	};
}

type ToolFunction = (input: Record<string, unknown>) => unknown;

export const processChat = async (request: ChatRequest): Promise<ChatResponse> => {
	const {messages, dataContext} = request;

	const originalData = dataContext.fullData;
	let currentData = originalData;
	const recordCount = Array.isArray(currentData) ? currentData.length : 'N/A';

	// Helper to extract array for counting
	const extractArrayForCount = (data: unknown) => {
		if (Array.isArray(data)) {
			return data;
		}
		if (typeof data === 'object' && data !== null && 'type' in data) {
			if (data.type === 'FeatureCollection' && 'features' in data && Array.isArray(data.features)) {
				return data.features;
			}
			if (data.type === 'GeometryCollection' && 'geometries' in data && Array.isArray(data.geometries)) {
				return data.geometries;
			}
		}
		return [];
	};

	// Define tools with actual implementations
	const toolImplementations: Record<string, ToolFunction> = {
		filter_data: ({field, operator, value}) => {
			try {
				// Always filter from original data to avoid chaining issues
				const filtered = filterData(
					originalData,
					field as string,
					operator as 'equals' | 'contains' | 'greaterThan' | 'lessThan',
					value
				);
				const matchCount = extractArrayForCount(filtered).length;
				const totalCount = extractArrayForCount(originalData).length;

				// Update currentData for final response
				currentData = filtered;

				return `Filter: ${field} ${operator} ${value} → Found ${matchCount} matching items out of ${totalCount} total. Dataset will be updated to show only matching items.`;
			} catch (error) {
				return `Error filtering data: ${error instanceof Error ? error.message : String(error)}`;
			}
		},
		aggregate_data: ({field, operation}) => {
			try {
				// Always use original data for analysis
				const result = aggregateData(
					originalData,
					(field as string | undefined) || null,
					operation as 'sum' | 'average' | 'count' | 'min' | 'max'
				);
				if (operation === 'count') {
					return field
						? `The count of items in "${field}" is ${result}`
						: `The total count is ${result} items in the dataset`;
				}
				return `The ${operation} of ${field} is ${result}`;
			} catch (error) {
				const errorMsg = error instanceof Error ? error.message : String(error);
				return `Error performing ${operation}: ${errorMsg}`;
			}
		},
		get_unique_values: ({field}) => {
			try {
				// Always use original data for analysis
				const values = getUniqueValues(originalData, field as string);
				// Use JSON.stringify to show undefined, null, empty strings clearly
				const valueStrings = values.slice(0, 20).map(v => JSON.stringify(v));
				return `Found ${values.length} unique value${values.length === 1 ? '' : 's'} for ${field}: ${valueStrings.join(', ')}${values.length > 20 ? '...' : ''}`;
			} catch (error) {
				return `Error getting unique values: ${error instanceof Error ? error.message : String(error)}`;
			}
		},
		sort_data: ({field, direction}) => {
			try {
				// Sort from original data and update currentData for final response
				currentData = sortData(originalData, field as string, direction as 'asc' | 'desc');
				return `Successfully sorted data by ${field} in ${direction}ending order.`;
			} catch (error) {
				return `Error sorting data: ${error instanceof Error ? error.message : String(error)}`;
			}
		},
	};

	// Define tool schemas for Claude
	const tools: Anthropic.Tool[] = [
		{
			name: 'filter_data',
			description: 'Filter the dataset by a field value and returns how many items match. This modifies the active dataset shown to the user. The result includes the count of matching items, so you do NOT need to call aggregate_data(count) after filtering. Use this to narrow down data or count items matching specific conditions. For GeoJSON data, field paths are relative to features.',
			input_schema: {
				type: 'object',
				properties: {
					field: {
						type: 'string',
						description: 'The field path to filter by. For GeoJSON: use "geometry.type" or "properties.fieldName" (supports nested paths like "properties.user.name").',
					},
					operator: {
						type: 'string',
						enum: ['equals', 'contains', 'greaterThan', 'lessThan'],
						description: 'The comparison operator to use',
					},
					value: {
						type: ['string', 'number', 'boolean'],
						description: 'The value to compare against',
					},
				},
				required: ['field', 'operator', 'value'],
			},
		},
		{
			name: 'aggregate_data',
			description: 'Perform aggregation operations on the current dataset. Use this to calculate sums, averages, counts, min, or max values. For "count" operation, field is optional - omit it to count all items in the dataset, or specify a field to count items in a nested array. For GeoJSON data, field paths are relative to features.',
			input_schema: {
				type: 'object',
				properties: {
					field: {
						type: 'string',
						description: 'The field path to aggregate. Optional for "count" operation (omit to count root items). Required for sum/average/min/max. For GeoJSON: use "properties.fieldName" (e.g., "properties.population").',
					},
					operation: {
						type: 'string',
						enum: ['sum', 'average', 'count', 'min', 'max'],
						description: 'The aggregation operation to perform',
					},
				},
				required: ['operation'],
			},
		},
		{
			name: 'get_unique_values',
			description: 'Get all unique values for a specific field in the current dataset. Use this to understand what values exist in a field. For GeoJSON data, field paths are relative to features (e.g., "geometry.type" not "features.geometry.type").',
			input_schema: {
				type: 'object',
				properties: {
					field: {
						type: 'string',
						description: 'The field path to get unique values from. For GeoJSON: use "geometry.type" or "properties.fieldName" (the features array is accessed automatically).',
					},
				},
				required: ['field'],
			},
		},
		{
			name: 'sort_data',
			description: 'Sort the current dataset by a field. This modifies the active dataset. Use this when the user wants to reorder the data. For GeoJSON data, field paths are relative to features.',
			input_schema: {
				type: 'object',
				properties: {
					field: {
						type: 'string',
						description: 'The field path to sort by. For GeoJSON: use "geometry.type" or "properties.fieldName".',
					},
					direction: {
						type: 'string',
						enum: ['asc', 'desc'],
						description: 'Sort direction: asc for ascending, desc for descending',
					},
				},
				required: ['field', 'direction'],
			},
		},
	];

	// Detect data structure type for better prompting
	let dataStructureInfo = 'object';
	if (Array.isArray(currentData)) {
		dataStructureInfo = 'array of objects';
	} else if (typeof currentData === 'object' && currentData !== null && 'type' in currentData) {
		if (currentData.type === 'FeatureCollection') {
			dataStructureInfo = 'GeoJSON FeatureCollection (use field="features" to access the features array)';
		} else if (currentData.type === 'Feature') {
			dataStructureInfo = 'single GeoJSON Feature';
		}
	}

	const systemPrompt = buildChatSystemPrompt({
		dataType: dataContext.analysis.dataType,
		description: dataContext.analysis.description,
		dataStructureInfo,
		recordCount,
		keyFields: dataContext.analysis.keyFields,
		recommendedVisualisation: dataContext.analysis.recommendedVisualisation,
		rationale: dataContext.analysis.rationale,
	});

	// Convert messages to Anthropic format
	const apiMessages: Anthropic.MessageParam[] = messages.map(msg => ({
		role: msg.role,
		content: msg.content,
	}));

	// Track all tool calls for visibility
	const allToolCalls: ToolCall[] = [];

	const anthropic = createAnthropicClient();

	// Make initial API call
	let response = await anthropic.messages.create({
		model: 'claude-sonnet-4-5-20250929',
		max_tokens: 4096,
		system: systemPrompt,
		messages: apiMessages,
		tools,
	});

	// Handle tool use loop
	while (response.stop_reason === 'tool_use') {
		const toolUses = response.content.filter(
			(block): block is Anthropic.ToolUseBlock => block.type === 'tool_use'
		);

		// Execute all tool calls
		const toolResults: Anthropic.ToolResultBlockParam[] = toolUses.map(toolUse => {
			const implementation = toolImplementations[toolUse.name];
			if (!implementation) {
				const errorResult = `Error: Unknown tool ${toolUse.name}`;
				allToolCalls.push({
					name: toolUse.name,
					input: toolUse.input as Record<string, unknown>,
					result: errorResult,
				});
				return {
					type: 'tool_result',
					tool_use_id: toolUse.id,
					content: errorResult,
					is_error: true,
				};
			}

			try {
				const result = implementation(toolUse.input as Record<string, unknown>);
				const resultString = String(result);
				allToolCalls.push({
					name: toolUse.name,
					input: toolUse.input as Record<string, unknown>,
					result: resultString,
				});
				return {
					type: 'tool_result',
					tool_use_id: toolUse.id,
					content: resultString,
				};
			} catch (error) {
				const errorResult = `Error: ${error instanceof Error ? error.message : 'Unknown error'}`;
				allToolCalls.push({
					name: toolUse.name,
					input: toolUse.input as Record<string, unknown>,
					result: errorResult,
				});
				return {
					type: 'tool_result',
					tool_use_id: toolUse.id,
					content: errorResult,
					is_error: true,
				};
			}
		});

		// Continue conversation with tool results
		apiMessages.push({
			role: 'assistant',
			content: response.content,
		});

		apiMessages.push({
			role: 'user',
			content: toolResults,
		});

		response = await anthropic.messages.create({
			model: 'claude-sonnet-4-5-20250929',
			max_tokens: 4096,
			system: systemPrompt,
			messages: apiMessages,
			tools,
		});
	}

	// Extract final text response
	const textContent = response.content
		.filter((block): block is Anthropic.TextBlock => block.type === 'text')
		.map(block => block.text)
		.join('');

	const assistantMessage: Message = {
		role: 'assistant',
		content: textContent,
	};

	const responseData: ChatResponse = {
		message: assistantMessage,
		toolCalls: allToolCalls.length > 0 ? allToolCalls : undefined,
	};

	// If data was modified by tools, include it in the response
	if (currentData !== dataContext.fullData) {
		responseData.modifiedData = currentData;
	}

	return responseData;
};
