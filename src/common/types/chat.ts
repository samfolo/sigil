export interface Message {
	role: 'user' | 'assistant';
	content: string;
}

export interface ToolCall {
	name: string;
	input: Record<string, unknown>;
	result: string;
}

export interface ChatResponse {
	message: Message;
	modifiedData?: unknown;
	toolCalls?: ToolCall[];
}
