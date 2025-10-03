'use client';

import { useState } from 'react';
import { DataInput } from '@/components/DataInput';
import { DataCanvas } from '@/components/DataCanvas';
import { DetectionResult } from '@/lib/formatDetector';

export default function Home() {
  const [result, setResult] = useState<DetectionResult | null>(null);

  const handleAnalyze = (detectionResult: DetectionResult) => {
    setResult(detectionResult);
  };

  return (
    <div className="flex h-screen">
      <DataInput onAnalyze={handleAnalyze} />
      <DataCanvas result={result} />
    </div>
  );
}
