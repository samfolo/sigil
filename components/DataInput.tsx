'use client';

import {Loader2} from 'lucide-react';
import {useState} from 'react';

import {Button} from '@sigil/components/ui/button';
import {Separator} from '@sigil/components/ui/separator';
import {Textarea} from '@sigil/components/ui/textarea';
import type {Analysis} from '@sigil/lib/analysisSchema';
import {detectFormat} from '@sigil/lib/formatDetector';
import type {DetectionResult} from '@sigil/lib/formatDetector';
import {isLoading} from '@sigil/lib/queryState';
import type {QueryState} from '@sigil/lib/queryState';

interface DataInputProps {
  onAnalyse: (result: DetectionResult, analysisState: QueryState<Analysis, string>, sessionId: string | null) => void;
}

export const DataInput = ({onAnalyse}: DataInputProps) => {
  const [input, setInput] = useState('');
  const [analysisState, setAnalysisState] = useState<QueryState<Analysis, string>>({status: 'idle'});

  const handleAnalyse = async () => {
    const result = detectFormat(input);

    if (result.format === 'unknown' || !result.data) {
      onAnalyse(result, {status: 'idle'}, null);
      return;
    }

    setAnalysisState({status: 'loading'});
    onAnalyse(result, {status: 'loading'}, null);

    try {
      const response = await fetch('/api/analyse', {
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
        setAnalysisState({status: 'error', error: errorMessage});
        onAnalyse(result, {status: 'error', error: errorMessage}, null);
        return;
      }

      const {analysis, sessionId} = await response.json();
      setAnalysisState({status: 'success', data: analysis});
      onAnalyse(result, {status: 'success', data: analysis}, sessionId);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error calling analyse endpoint';
      console.error('Error calling analyse endpoint:', error);
      setAnalysisState({status: 'error', error: errorMessage});
      onAnalyse(result, {status: 'error', error: errorMessage}, null);
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
        <Button onClick={handleAnalyse} disabled={isLoading(analysisState)}>
          {isLoading(analysisState) ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Analysing...
            </>
          ) : (
            'Analyse'
          )}
        </Button>
        {analysisState.status === 'error' && (
          <p className="text-sm text-destructive">{analysisState.error}</p>
        )}
      </div>
    </div>
  );
}
