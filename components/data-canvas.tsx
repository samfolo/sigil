import { Card } from '@/components/ui/card';
import { DetectionResult } from '@/lib/format-detector';

interface DataCanvasProps {
  result: DetectionResult | null;
}

export const DataCanvas = ({ result }: DataCanvasProps) => {
  if (!result) {
    return (
      <div className="flex-1 p-6">
        <Card className="h-full flex items-center justify-center">
          <p className="text-muted-foreground">Canvas placeholder</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex-1 p-6">
      <Card className="h-full p-6 overflow-auto">
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold">Parsed Data</h2>
            <span className="px-2 py-1 rounded-md bg-primary/10 text-primary text-xs font-medium uppercase">
              {result.format}
            </span>
          </div>

          {result.format === 'unknown' ? (
            <p className="text-muted-foreground">
              Unable to detect format. Please ensure your input is valid JSON, CSV, YAML, or XML.
            </p>
          ) : (
            <pre className="bg-muted p-4 rounded-lg overflow-auto text-sm font-mono">
              {JSON.stringify(result.data, null, 2)}
            </pre>
          )}
        </div>
      </Card>
    </div>
  );
}
