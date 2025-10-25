import {NextResponse} from 'next/server';
import type {NextRequest} from 'next/server';

import {analyseData} from '@sigil/src/agent/analysis';
import {isErr} from '@sigil/src/common/errors/result';

export const POST = async (request: NextRequest) => {
	try {
		const body = await request.json();
		const {format, data} = body;

		if (!format || !data) {
			return NextResponse.json(
				{error: 'Missing format or data in request body'},
				{status: 400}
			);
		}

		const result = await analyseData(format, data);

		if (isErr(result)) {
			switch (result.error) {
				case 'missing_api_key':
					return NextResponse.json(
						{error: 'ANTHROPIC_API_KEY not configured'},
						{status: 500}
					);
				case 'no_tool_use':
					return NextResponse.json(
						{error: 'No tool use found in response'},
						{status: 500}
					);
				case 'invalid_schema':
					return NextResponse.json(
						{error: 'Invalid analysis response format'},
						{status: 500}
					);
				case 'anthropic_error':
					return NextResponse.json(
						{error: 'Failed to analyse data'},
						{status: 500}
					);
			}
		}

		const {analysis, sessionId} = result.data;
		return NextResponse.json({analysis, sessionId});
	} catch (error) {
		console.error('Unexpected error in analyse route:', error);
		return NextResponse.json(
			{error: 'Failed to analyse data'},
			{status: 500}
		);
	}
};
