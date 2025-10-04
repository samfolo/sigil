'use client';

import { useState } from 'react';
import { DataInput } from '@/components/DataInput';
import { DataCanvas } from '@/components/DataCanvas';
import { DetectionResult } from '@/lib/formatDetector';
import { Analysis } from '@/lib/analysisSchema';
import { QueryState } from '@/lib/queryState';

export default function Home() {
  const [result, setResult] = useState<DetectionResult | null>(null);
  const [analysisState, setAnalysisState] = useState<QueryState<Analysis, string>>({ status: 'idle' });

  const handleAnalyze = (detectionResult: DetectionResult, newAnalysisState: QueryState<Analysis, string>) => {
    setResult(detectionResult);
    setAnalysisState(newAnalysisState);
  };

  return (
    <div className="flex h-screen">
      <DataInput onAnalyze={handleAnalyze} />
      <DataCanvas result={result} analysisState={analysisState} />
    </div>
  );
}
