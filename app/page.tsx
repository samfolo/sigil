'use client';

import { useState } from 'react';
import { DataInput } from '@/components/DataInput';
import { DataCanvas } from '@/components/DataCanvas';
import { DetectionResult } from '@/lib/formatDetector';
import { Analysis } from '@/lib/analysisSchema';
import { QueryState } from '@/lib/queryState';

const Home = () => {
  const [result, setResult] = useState<DetectionResult | null>(null);
  const [analysisState, setAnalysisState] = useState<QueryState<Analysis, string>>({ status: 'idle' });
  const [sessionId, setSessionId] = useState<string | null>(null);

  const handleAnalyze = (detectionResult: DetectionResult, newAnalysisState: QueryState<Analysis, string>, newSessionId: string | null) => {
    setResult(detectionResult);
    setAnalysisState(newAnalysisState);
    setSessionId(newSessionId);
  };

  return (
    <div className="flex h-screen">
      <DataInput onAnalyze={handleAnalyze} />
      <DataCanvas result={result} analysisState={analysisState} sessionId={sessionId} />
    </div>
  );
};

export default Home;
