'use client';

import { useState, useRef, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Send } from 'lucide-react';
import { Analysis } from '@/lib/analysisSchema';
import { QueryState, isLoading } from '@/lib/queryState';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface ChatInterfaceProps {
  data: any;
  analysis: Analysis;
}

export const ChatInterface = ({ data, analysis }: ChatInterfaceProps) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [chatState, setChatState] = useState<QueryState<Message, string>>({ status: 'idle' });
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, chatState]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading(chatState)) return;

    const userMessage: Message = { role: 'user', content: input.trim() };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInput('');
    setChatState({ status: 'loading' });

    try {
      const dataSample = JSON.stringify(data).slice(0, 1000);
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: updatedMessages,
          dataContext: {
            format: analysis.dataType,
            analysis,
            dataSample,
          },
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get response');
      }

      const { message } = await response.json();
      const assistantMessage: Message = message;
      setMessages([...updatedMessages, assistantMessage]);
      setChatState({ status: 'success', data: assistantMessage });
    } catch (error) {
      setChatState({
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };

  return (
    <Card className="p-4 space-y-4">
      <h3 className="text-sm font-semibold">Chat with your data</h3>

      <ScrollArea className="h-[400px] pr-4" ref={scrollRef}>
        <div className="space-y-4">
          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-lg p-3 ${
                  msg.role === 'user'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-foreground'
                }`}
              >
                <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
              </div>
            </div>
          ))}

          {isLoading(chatState) && (
            <div className="flex justify-start">
              <div className="bg-muted rounded-lg p-3">
                <Loader2 className="h-4 w-4 animate-spin" />
              </div>
            </div>
          )}

          {chatState.status === 'error' && (
            <div className="bg-destructive/10 p-3 rounded-lg">
              <p className="text-sm text-destructive">Error: {chatState.error}</p>
            </div>
          )}
        </div>
      </ScrollArea>

      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask a question about your data..."
          className="flex-1 px-3 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          disabled={isLoading(chatState)}
        />
        <Button
          type="submit"
          size="icon"
          disabled={!input.trim() || isLoading(chatState)}
        >
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </Card>
  );
};
