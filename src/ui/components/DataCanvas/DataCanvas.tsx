import {Loader2, ChevronDown} from 'lucide-react';
import dynamic from 'next/dynamic';
import {useState} from 'react';

import type {Analysis} from '@sigil/src/common/types/analysisSchema';
import {isError, isLoading, isSuccess} from '@sigil/src/common/types/queryState';
import type {QueryState} from '@sigil/src/common/types/queryState';
import type {DetectionResult} from '@sigil/src/data/formatDetector';
import {ChatInterface} from '@sigil/src/ui/components/ChatInterface';
import {TableView} from '@sigil/src/ui/components/visualisations/TableView';
import {TreeView} from '@sigil/src/ui/components/visualisations/TreeView';
import {Button} from '@sigil/src/ui/primitives/button';
import {Card} from '@sigil/src/ui/primitives/card';
import {Collapsible, CollapsibleContent, CollapsibleTrigger} from '@sigil/src/ui/primitives/collapsible';
import {Separator} from '@sigil/src/ui/primitives/separator';


const MapView = dynamic(
  () => import('@sigil/src/ui/components/visualisations/MapView').then(mod => ({default: mod.MapView})),
  {ssr: false}
);

interface DataCanvasProps {
  result: DetectionResult | null;
  analysisState: QueryState<Analysis, string>;
  sessionId: string | null;
}

export const DataCanvas = ({result, analysisState, sessionId}: DataCanvasProps) => {
  const [isAnalysisOpen, setIsAnalysisOpen] = useState(true);
  const [displayData, setDisplayData] = useState(result?.data);

  // Update display data when result changes
  if (result?.data !== displayData && result?.data) {
    setDisplayData(result.data);
  }

  const handleDataUpdate = (newData: unknown) => {
    setDisplayData(newData);
  };

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
                  <Collapsible open={isAnalysisOpen} onOpenChange={setIsAnalysisOpen}>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-semibold text-primary">AI Analysis</h3>
                          <span className="px-2 py-0.5 rounded bg-primary/10 text-primary text-xs font-medium">
                            {analysisState.data.dataType}
                          </span>
                        </div>
                        <CollapsibleTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <ChevronDown
                              className={`h-4 w-4 transition-transform duration-200 ${
                                isAnalysisOpen ? 'rotate-180' : ''
                              }`}
                            />
                            <span className="sr-only">Toggle analysis</span>
                          </Button>
                        </CollapsibleTrigger>
                      </div>

                      <CollapsibleContent>
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
                            <p className="font-medium mb-1">Recommended Visualisation</p>
                            <p className="text-muted-foreground capitalize">{analysisState.data.recommendedVisualisation}</p>
                          </div>

                          <div>
                            <p className="font-medium mb-1">Rationale</p>
                            <p className="text-muted-foreground">{analysisState.data.rationale}</p>
                          </div>
                        </div>
                      </CollapsibleContent>
                    </div>
                  </Collapsible>
                  <Separator />
                </>
              )}

              {!isLoading(analysisState) && (
                <>
                  <div className="space-y-2">
                    <h3 className="text-sm font-semibold">
                      {isSuccess(analysisState) ? 'Visualisation' : 'Raw Data'}
                    </h3>
                    {isSuccess(analysisState) ? (
                      (() => {
                        switch (analysisState.data.recommendedVisualisation) {
                          case 'table':
                            return Array.isArray(displayData) ? (
                              <TableView data={displayData} keyFields={analysisState.data.keyFields} />
                            ) : (
                              <p className="text-muted-foreground text-sm">
                                Table view requires array data
                              </p>
                            );
                          case 'tree':
                            return <TreeView data={displayData} />;
                          case 'map':
                            return <MapView data={displayData} />;
                          case 'chart':
                          case 'cards':
                            return (
                              <div className="bg-muted/50 p-8 rounded-lg text-center">
                                <p className="text-muted-foreground text-sm">
                                  {analysisState.data.recommendedVisualisation.charAt(0).toUpperCase() +
                                    analysisState.data.recommendedVisualisation.slice(1)}{' '}
                                  visualisation coming soon
                                </p>
                              </div>
                            );
                          default:
                            return <TreeView data={displayData} />;
                        }
                      })()
                    ) : (
                      <pre className="bg-muted p-4 rounded-lg overflow-auto text-sm font-mono">
                        {JSON.stringify(displayData, null, 2)}
                      </pre>
                    )}
                  </div>

                  {isSuccess(analysisState) && (
                    <>
                      <Separator />
                      <ChatInterface
                        data={displayData}
                        analysis={analysisState.data}
                        onDataUpdate={handleDataUpdate}
                        sessionId={sessionId}
                      />
                    </>
                  )}
                </>
              )}
            </>
          )}
        </div>
      </Card>
    </div>
  );
}
