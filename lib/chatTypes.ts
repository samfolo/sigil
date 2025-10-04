export interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export interface ToolCall {
  name: string;
  input: Record<string, any>;
  result: string;
}

export interface ChatResponse {
  message: Message;
  modifiedData?: any;
  toolCalls?: ToolCall[];
}
