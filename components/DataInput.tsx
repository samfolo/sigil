'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { detectFormat, DetectionResult } from '@/lib/formatDetector';

interface DataInputProps {
  onAnalyze: (result: DetectionResult) => void;
}

export function DataInput({ onAnalyze }: DataInputProps) {
  const [input, setInput] = useState('');

  const handleAnalyze = () => {
    const result = detectFormat(input);
    onAnalyze(result);
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
      <Button onClick={handleAnalyze}>Analyze</Button>
    </div>
  );
}
