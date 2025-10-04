import dynamic from 'next/dynamic';

import { Card } from '@/components/ui/card';
import { DetectionResult } from '@/lib/formatDetector';
import { Separator } from '@/components/ui/separator';
import { Analysis } from '@/lib/analysisSchema';
import { TableView } from '@/components/visualizations/TableView';
import { TreeView } from '@/components/visualizations/TreeView';
import { QueryState, isSuccess, isLoading, isError } from '@/lib/queryState';
import { Loader2 } from 'lucide-react';

const MapView = dynamic(
  () => import('@/components/visualizations/MapView').then(mod => ({ default: mod.MapView })),
  { ssr: false }
);

interface DataCanvasProps {
  result: DetectionResult | null;
  analysisState: QueryState<Analysis, string>;
}

export const DataCanvas = ({ result, analysisState }: DataCanvasProps) => {
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
            <>
              {isLoading(analysisState) && (
                <div className="flex items-center justify-center p-8">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              )}

              {isError(analysisState) && (
                <div className="bg-destructive/10 p-4 rounded-lg">
                  <p className="text-sm text-destructive">
                    Error: {analysisState.error}
                  </p>
                </div>
              )}

              {isSuccess(analysisState) && (
                <>
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-semibold text-primary">AI Analysis</h3>
                      <span className="px-2 py-0.5 rounded bg-primary/10 text-primary text-xs font-medium">
                        {analysisState.data.dataType}
                      </span>
                    </div>

                    <div className="bg-muted/50 p-4 rounded-lg space-y-3 text-sm">
                      <div>
                        <p className="font-medium mb-1">Description</p>
                        <p className="text-muted-foreground">{analysisState.data.description}</p>
                      </div>

                      <div>
                        <p className="font-medium mb-1">Key Fields</p>
                        <ul className="list-disc list-inside text-muted-foreground space-y-0.5">
                          {analysisState.data.keyFields.map((field, idx) => (
                            <li key={idx}>{field.label}</li>
                          ))}
                        </ul>
                      </div>

                      <div>
                        <p className="font-medium mb-1">Recommended Visualization</p>
                        <p className="text-muted-foreground capitalize">{analysisState.data.recommendedVisualization}</p>
                      </div>

                      <div>
                        <p className="font-medium mb-1">Rationale</p>
                        <p className="text-muted-foreground">{analysisState.data.rationale}</p>
                      </div>
                    </div>
                  </div>
                  <Separator />
                </>
              )}

              {!isLoading(analysisState) && (
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold">
                    {isSuccess(analysisState) ? 'Visualization' : 'Raw Data'}
                  </h3>
                  {isSuccess(analysisState) ? (
                    (() => {
                      switch (analysisState.data.recommendedVisualization) {
                        case 'table':
                          return Array.isArray(result.data) ? (
                            <TableView data={result.data} keyFields={analysisState.data.keyFields} />
                          ) : (
                            <p className="text-muted-foreground text-sm">
                              Table view requires array data
                            </p>
                          );
                        case 'tree':
                          return <TreeView data={result.data} />;
                        case 'map':
                          return <MapView data={result.data} />;
                        case 'chart':
                        case 'cards':
                          return (
                            <div className="bg-muted/50 p-8 rounded-lg text-center">
                              <p className="text-muted-foreground text-sm">
                                {analysisState.data.recommendedVisualization.charAt(0).toUpperCase() +
                                  analysisState.data.recommendedVisualization.slice(1)}{' '}
                                visualization coming soon
                              </p>
                            </div>
                          );
                        default:
                          return <TreeView data={result.data} />;
                      }
                    })()
                  ) : (
                    <pre className="bg-muted p-4 rounded-lg overflow-auto text-sm font-mono">
                      {JSON.stringify(result.data, null, 2)}
                    </pre>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </Card>
    </div>
  );
}
