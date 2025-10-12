'use client';

import {useState} from 'react';

import {DataCanvas} from '@sigil/components/DataCanvas';
import {DataInput} from '@sigil/components/DataInput';
import type {Analysis} from '@sigil/lib/analysisSchema';
import type {DetectionResult} from '@sigil/src/data/formatDetector';
import type {QueryState} from '@sigil/lib/queryState';

const Home = () => {
  const [result, setResult] = useState<DetectionResult | null>(null);
  const [analysisState, setAnalysisState] = useState<QueryState<Analysis, string>>({status: 'idle'});
  const [sessionId, setSessionId] = useState<string | null>(null);

  const handleAnalyse = (detectionResult: DetectionResult, newAnalysisState: QueryState<Analysis, string>, newSessionId: string | null) => {
    setResult(detectionResult);
    setAnalysisState(newAnalysisState);
    setSessionId(newSessionId);
  };

  return (
    <div className="flex h-screen">
      <DataInput onAnalyse={handleAnalyse} />
      <DataCanvas result={result} analysisState={analysisState} sessionId={sessionId} />
    </div>
  );
};

export default Home;
