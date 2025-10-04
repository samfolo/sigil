import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { analysisSchema, Analysis } from '@/lib/analysisSchema';
import { z, ZodError } from 'zod';
import { Tool, ToolUnion } from '@anthropic-ai/sdk/resources';

const limitDataSample = (data: any, format: string): string => {
  let sample = '';

  if (Array.isArray(data)) {
    const limited = data.slice(0, 10);
    sample = JSON.stringify(limited, null, 2);
  } else {
    sample = JSON.stringify(data, null, 2);
  }

  if (sample.length > 1000) {
    sample = sample.substring(0, 1000) + '...';
  }

  return sample;
};


const ANALYSIS_TOOL: ToolUnion = {
  name: 'provide_analysis',
  description: 'Provide a structured analysis of the data sample including data type, description, key fields, recommended visualization, and rationale.',
  input_schema: z.toJSONSchema(analysisSchema, {target: 'draft-2020-12'}) as Tool.InputSchema,
};

export const POST = async (request: NextRequest) => {
  try {
    const body = await request.json();
    const { format, data } = body;

    if (!format || !data) {
      return NextResponse.json(
        { error: 'Missing format or data in request body' },
        { status: 400 }
      );
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'ANTHROPIC_API_KEY not configured' },
        { status: 500 }
      );
    }

    const dataSample = limitDataSample(data, format);


    const prompt = `Analyze this ${format} data sample and provide your analysis using the tool.

IMPORTANT for keyFields:
- "path" must be the actual key or accessor path in the data (e.g., 'name', 'user.email', 'items[0].id')
- "label" is the human-readable description for display
- Example: { "path": "A", "label": "Column A values" } or { "path": "user.name", "label": "User's full name" }
- Maximum 5 fields

Data sample:
${dataSample}`;

    const client = new Anthropic({ apiKey });

    const response = await client.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
      tools: [ANALYSIS_TOOL],
      tool_choice: { type: 'tool', name: 'provide_analysis' },
    });

    const toolUse = response.content.find((block) => block.type === 'tool_use');

    if (!toolUse || toolUse.type !== 'tool_use') {
      return NextResponse.json(
        { error: 'No tool use found in response' },
        { status: 500 }
      );
    }

    const analysis: Analysis = analysisSchema.parse(toolUse.input);

    return NextResponse.json({ analysis });
  } catch (error) {
    if (error instanceof ZodError) {
      console.error('Schema validation error:', error.issues);
      return NextResponse.json(
        { error: 'Invalid analysis response format', details: error.issues },
        { status: 500 }
      );
    }

    console.error('Error calling Claude API:', error);
    return NextResponse.json(
      { error: 'Failed to analyze data' },
      { status: 500 }
    );
  }
}
