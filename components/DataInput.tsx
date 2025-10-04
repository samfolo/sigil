'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { detectFormat, DetectionResult } from '@/lib/formatDetector';
import { QueryState, isLoading } from '@/lib/queryState';
import { Analysis } from '@/lib/analysisSchema';
import { Loader2 } from 'lucide-react';

interface DataInputProps {
  onAnalyze: (result: DetectionResult, analysisState: QueryState<Analysis, string>) => void;
}

export const DataInput = ({ onAnalyze }: DataInputProps) => {
  const [input, setInput] = useState('');
  const [analysisState, setAnalysisState] = useState<QueryState<Analysis, string>>({ status: 'idle' });

  const handleAnalyze = async () => {
    const result = detectFormat(input);

    if (result.format === 'unknown' || !result.data) {
      onAnalyze(result, { status: 'idle' });
      return;
    }

    setAnalysisState({ status: 'loading' });
    onAnalyze(result, { status: 'loading' });

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
        const errorMessage = error.error || 'Analysis failed';
        console.error('Analysis failed:', error);
        setAnalysisState({ status: 'error', error: errorMessage });
        onAnalyze(result, { status: 'error', error: errorMessage });
        return;
      }

      const { analysis } = await response.json();
      setAnalysisState({ status: 'success', data: analysis });
      onAnalyze(result, { status: 'success', data: analysis });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error calling analyze endpoint';
      console.error('Error calling analyze endpoint:', error);
      setAnalysisState({ status: 'error', error: errorMessage });
      onAnalyze(result, { status: 'error', error: errorMessage });
    }
  };

  return (
    <div className="w-80 border-r border-border bg-background p-6 flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <h2 className="text-lg font-semibold">Data Input</h2>
        <Textarea
          placeholder="Paste your data here..."
          className="h-[calc(100vh-200px)] resize-none overflow-y-auto font-mono text-sm"
          value={input}
          onChange={(e) => setInput(e.target.value)}
        />
      </div>
      <Separator />
      <div className="flex flex-col gap-2">
        <Button onClick={handleAnalyze} disabled={isLoading(analysisState)}>
          {isLoading(analysisState) ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Analyzing...
            </>
          ) : (
            'Analyze'
          )}
        </Button>
        {analysisState.status === 'error' && (
          <p className="text-sm text-destructive">{analysisState.error}</p>
        )}
      </div>
    </div>
  );
}
