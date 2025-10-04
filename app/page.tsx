'use client';

import { useState } from 'react';
import { DataInput } from '@/components/DataInput';
import { DataCanvas } from '@/components/DataCanvas';
import { DetectionResult } from '@/lib/formatDetector';
import { Analysis } from '@/lib/analysisSchema';

export default function Home() {
  const [result, setResult] = useState<DetectionResult | null>(null);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);

  const handleAnalyze = (detectionResult: DetectionResult, analysisResult: Analysis | null) => {
    setResult(detectionResult);
    setAnalysis(analysisResult);
  };

  return (
    <div className="flex h-screen">
      <DataInput onAnalyze={handleAnalyze} />
      <DataCanvas result={result} analysis={analysis} />
    </div>
  );
}
