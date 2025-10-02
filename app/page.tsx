'use client';

import { useState } from 'react';
import { DataInput } from '@/components/data-input';
import { DataCanvas } from '@/components/data-canvas';
import { DetectionResult } from '@/lib/format-detector';

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
