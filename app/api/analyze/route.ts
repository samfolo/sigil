import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

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

    const prompt = `Analyze this ${format} data and tell me:
- What this data semantically represents (e.g., transactions, user records, API response)
- What the key fields are and what they mean
- How this data should best be visualized (table, tree, card list, etc.)

Data sample:
${dataSample}`;

    const client = new Anthropic({ apiKey });

    const response = await client.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    });

    const analysisText = response.content[0].type === 'text'
      ? response.content[0].text
      : '';

    return NextResponse.json({ analysis: analysisText });
  } catch (error) {
    console.error('Error calling Claude API:', error);
    return NextResponse.json(
      { error: 'Failed to analyze data' },
      { status: 500 }
    );
  }
}
