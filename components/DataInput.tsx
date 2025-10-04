'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { detectFormat, DetectionResult } from '@/lib/formatDetector';
import { QueryState } from '@/lib/queryState';

interface DataInputProps {
  onAnalyze: (result: DetectionResult, analysis: string | null) => void;
}

export const DataInput = ({ onAnalyze }: DataInputProps) => {
  const [input, setInput] = useState('');
  const [queryState, setQueryState] = useState<QueryState>('idle');

  const handleAnalyze = async () => {
    const result = detectFormat(input);

    if (result.format === 'unknown' || !result.data) {
      onAnalyze(result, null);
      return;
    }

    setQueryState('loading');

    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          format: result.format,
          data: result.data,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        console.error('Analysis failed:', error);
        setQueryState('errored');
        onAnalyze(result, null);
        return;
      }

      const { analysis } = await response.json();
      setQueryState('success');
      onAnalyze(result, analysis);
    } catch (error) {
      console.error('Error calling analyze endpoint:', error);
      setQueryState('errored');
      onAnalyze(result, null);
    }
  };

  return (
    <div className="w-80 border-r border-border bg-background p-6 flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <h2 className="text-lg font-semibold">Data Input</h2>
        <Textarea
          placeholder="Paste your data here..."
          className="min-h-[400px] font-mono text-sm"
          value={input}
          onChange={(e) => setInput(e.target.value)}
        />
      </div>
      <Separator />
      <Button onClick={handleAnalyze} disabled={queryState === 'loading'}>
        {queryState === 'loading' ? 'Analyzing...' : 'Analyze'}
      </Button>
    </div>
  );
}
