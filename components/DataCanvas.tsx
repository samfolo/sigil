import { Card } from '@/components/ui/card';
import { DetectionResult } from '@/lib/formatDetector';
import { Separator } from '@/components/ui/separator';
import { Analysis } from '@/lib/analysisSchema';
import { TableView } from '@/components/visualizations/TableView';
import { TreeView } from '@/components/visualizations/TreeView';

interface DataCanvasProps {
  result: DetectionResult | null;
  analysis?: Analysis | null;
}

export const DataCanvas = ({ result, analysis }: DataCanvasProps) => {
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
              {analysis && (
                <>
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-semibold text-primary">AI Analysis</h3>
                      <span className="px-2 py-0.5 rounded bg-primary/10 text-primary text-xs font-medium">
                        {analysis.dataType}
                      </span>
                    </div>

                    <div className="bg-muted/50 p-4 rounded-lg space-y-3 text-sm">
                      <div>
                        <p className="font-medium mb-1">Description</p>
                        <p className="text-muted-foreground">{analysis.description}</p>
                      </div>

                      <div>
                        <p className="font-medium mb-1">Key Fields</p>
                        <ul className="list-disc list-inside text-muted-foreground space-y-0.5">
                          {analysis.keyFields.map((field, idx) => (
                            <li key={idx}>{field.label}</li>
                          ))}
                        </ul>
                      </div>

                      <div>
                        <p className="font-medium mb-1">Recommended Visualization</p>
                        <p className="text-muted-foreground capitalize">{analysis.recommendedVisualization}</p>
                      </div>

                      <div>
                        <p className="font-medium mb-1">Rationale</p>
                        <p className="text-muted-foreground">{analysis.rationale}</p>
                      </div>
                    </div>
                  </div>
                  <Separator />
                </>
              )}

              <div className="space-y-2">
                <h3 className="text-sm font-semibold">
                  {analysis ? 'Visualization' : 'Raw Data'}
                </h3>
                {analysis ? (
                  (() => {
                    switch (analysis.recommendedVisualization) {
                      case 'table':
                        return Array.isArray(result.data) ? (
                          <TableView data={result.data} keyFields={analysis.keyFields} />
                        ) : (
                          <p className="text-muted-foreground text-sm">
                            Table view requires array data
                          </p>
                        );
                      case 'tree':
                        return <TreeView data={result.data} />;
                      case 'map':
                      case 'chart':
                      case 'cards':
                        return (
                          <div className="bg-muted/50 p-8 rounded-lg text-center">
                            <p className="text-muted-foreground text-sm">
                              {analysis.recommendedVisualization.charAt(0).toUpperCase() +
                                analysis.recommendedVisualization.slice(1)}{' '}
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
            </>
          )}
        </div>
      </Card>
    </div>
  );
}
