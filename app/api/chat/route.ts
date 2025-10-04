import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { Analysis } from '@/lib/analysisSchema';
import { filterData, aggregateData, getUniqueValues, sortData } from '@/lib/dataTools';
import { Message, ToolCall, ChatResponse } from '@/lib/chatTypes';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

interface ChatRequest {
  messages: Message[];
  dataContext: {
    format: string;
    analysis: Analysis;
    dataSample: string;
    fullData: any;
  };
}

type ToolFunction = (input: Record<string, any>) => any;

export async function POST(request: NextRequest) {
  try {
    const body: ChatRequest = await request.json();
    const { messages, dataContext } = body;

    let currentData = dataContext.fullData;
    const recordCount = Array.isArray(currentData) ? currentData.length : 'N/A';

    // Define tools with actual implementations
    const toolImplementations: Record<string, ToolFunction> = {
      filter_data: ({ field, operator, value }) => {
        try {
          currentData = filterData(currentData, field, operator, value);
          const resultCount = Array.isArray(currentData) ? currentData.length : 0;
          return `Successfully filtered data by ${field} ${operator} ${value}. ${resultCount} records remain in the dataset.`;
        } catch (error) {
          return `Error filtering data: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
      aggregate_data: ({ field, operation }) => {
        try {
          const result = aggregateData(currentData, field || null, operation);
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
      get_unique_values: ({ field }) => {
        try {
          const values = getUniqueValues(currentData, field);
          return `Found ${values.length} unique values for ${field}: ${values.slice(0, 20).join(', ')}${values.length > 20 ? '...' : ''}`;
        } catch (error) {
          return `Error getting unique values: ${error instanceof Error ? error.message : String(error)}`;
        }
      },
      sort_data: ({ field, direction }) => {
        try {
          currentData = sortData(currentData, field, direction);
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
        description: 'Filter the current dataset by a field value. This modifies the active dataset. Use this when the user wants to narrow down the data based on conditions.',
        input_schema: {
          type: 'object',
          properties: {
            field: {
              type: 'string',
              description: 'The field path to filter by (supports nested paths like "user.name")',
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
        description: 'Perform aggregation operations on the current dataset. Use this to calculate sums, averages, counts, min, or max values. For "count" operation, field is optional - omit it to count all items in the dataset, or specify a field to count items in a nested array.',
        input_schema: {
          type: 'object',
          properties: {
            field: {
              type: 'string',
              description: 'The field path to aggregate. Optional for "count" operation (omit to count root items). Required for sum/average/min/max. Supports nested paths like "features" for GeoJSON.',
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
        description: 'Get all unique values for a specific field in the current dataset. Use this to understand what values exist in a field.',
        input_schema: {
          type: 'object',
          properties: {
            field: {
              type: 'string',
              description: 'The field path to get unique values from',
            },
          },
          required: ['field'],
        },
      },
      {
        name: 'sort_data',
        description: 'Sort the current dataset by a field. This modifies the active dataset. Use this when the user wants to reorder the data.',
        input_schema: {
          type: 'object',
          properties: {
            field: {
              type: 'string',
              description: 'The field path to sort by',
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
    const dataStructureInfo = Array.isArray(currentData)
      ? 'array of objects'
      : currentData.type === 'FeatureCollection'
      ? 'GeoJSON FeatureCollection (use field="features" to access the features array)'
      : currentData.type === 'Feature'
      ? 'single GeoJSON Feature'
      : 'object';

    const systemPrompt = `You are a data analysis assistant. The user is currently viewing a dataset with the following properties:

Data Type: ${dataContext.analysis.dataType}
Description: ${dataContext.analysis.description}
Data Structure: ${dataStructureInfo}
${recordCount !== 'N/A' ? `Current Record Count: ${recordCount}` : ''}

Key Fields Available:
${dataContext.analysis.keyFields.map(f => `- ${f.label}: ${f.description}`).join('\n')}

Recommended Visualization: ${dataContext.analysis.recommendedVisualization}
Rationale: ${dataContext.analysis.rationale}

You have access to tools that can operate on this dataset:
- aggregate_data: Calculate sum, average, count, min, or max
  * For counting: use operation='count' and omit the field parameter (the tool will intelligently count based on data structure)
  * For other operations: specify both field and operation
- filter_data: Narrow down the dataset based on conditions
- get_unique_values: See what distinct values exist in a field
- sort_data: Reorder the dataset

When the user asks questions about the data, use these tools to analyze it. Examples:
- "How many records/features/items?" → aggregate_data with operation='count' (no field needed)
- "What's the total/average of X?" → aggregate_data with field='X' and operation='sum' or 'average'
- "What values are in field X?" → get_unique_values with field='X'
- "Show me only records where..." → filter_data

The tools handle various data structures automatically (arrays, GeoJSON, nested objects). Always try using the tools even if the structure seems complex. Be concise and helpful.`;

    // Convert messages to Anthropic format
    const apiMessages: Anthropic.MessageParam[] = messages.map(msg => ({
      role: msg.role,
      content: msg.content,
    }));

    // Track all tool calls for visibility
    const allToolCalls: ToolCall[] = [];

    // Make initial API call
    let response = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
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
            input: toolUse.input as Record<string, any>,
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
          const result = implementation(toolUse.input as Record<string, any>);
          const resultString = String(result);
          allToolCalls.push({
            name: toolUse.name,
            input: toolUse.input as Record<string, any>,
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
            input: toolUse.input as Record<string, any>,
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
        model: 'claude-3-5-sonnet-20241022',
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

    return NextResponse.json(responseData);
  } catch (error) {
    console.error('Chat API error:', error);
    return NextResponse.json(
      { error: 'Failed to process chat request' },
      { status: 500 }
    );
  }
}
