import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { Analysis } from '@/lib/analysisSchema';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface ChatRequest {
  messages: Message[];
  dataContext: {
    format: string;
    analysis: Analysis;
    dataSample: string;
  };
}

export async function POST(request: NextRequest) {
  try {
    const body: ChatRequest = await request.json();
    const { messages, dataContext } = body;

    const systemContext = `You are analyzing ${dataContext.format} data. Here's what we know about the data:

Data Type: ${dataContext.analysis.dataType}
Description: ${dataContext.analysis.description}

Key Fields:
${dataContext.analysis.keyFields.map(f => `- ${f.label}: ${f.description}`).join('\n')}

Recommended Visualization: ${dataContext.analysis.recommendedVisualization}
Rationale: ${dataContext.analysis.rationale}

Data Sample (first 1000 chars):
${dataContext.dataSample}

Answer questions about this data based on the context provided. Be concise and helpful.`;

    const response = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 1024,
      system: systemContext,
      messages: messages.map(msg => ({
        role: msg.role,
        content: msg.content,
      })),
    });

    const assistantMessage = {
      role: 'assistant' as const,
      content: response.content[0].type === 'text' ? response.content[0].text : '',
    };

    return NextResponse.json({ message: assistantMessage });
  } catch (error) {
    console.error('Chat API error:', error);
    return NextResponse.json(
      { error: 'Failed to process chat request' },
      { status: 500 }
    );
  }
}
