import type {NextRequest} from 'next/server';
import {NextResponse} from 'next/server';

import {processChat} from '@sigil/src/agent/chat';
import type {Analysis} from '@sigil/src/common/types/analysisSchema';
import type {Message} from '@sigil/src/common/types/chat';

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

export const POST = async (request: NextRequest) => {
	try {
		const body: ChatRequest = await request.json();
		const responseData = await processChat(body);
		return NextResponse.json(responseData);
	} catch (error) {
		console.error('Chat API error:', error);
		return NextResponse.json(
			{error: 'Failed to process chat request'},
			{status: 500}
		);
	}
};
