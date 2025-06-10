
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Play, Square, RotateCcw } from "lucide-react";
import { useDocumentProcessing } from "./hooks/useDocumentProcessing";
import { useProcessingConfiguration } from "./hooks/useProcessingConfiguration";

interface ProcessingPipelineProps {
  selectedDocuments: string[];
  documents: any[];
}

export function ProcessingPipeline({ selectedDocuments, documents }: ProcessingPipelineProps) {
  const { config } = useProcessingConfiguration();
  const {
    isProcessing,
    processingProgress,
    processingResults,
    processDocuments,
    clearResults,
  } = useDocumentProcessing();

  const handleStartProcessing = () => {
    const processingConfig = {
      chunking: config.chunking,
      embedding: config.embedding,
    };
    
    processDocuments(selectedDocuments, processingConfig);
  };

  const getStageLabel = (stage: string) => {
    switch (stage) {
      case 'extraction': return 'Text Extraction';
      case 'chunking': return 'Chunking';
      case 'embedding': return 'Generating Embeddings';
      case 'storage': return 'Storing Vectors';
      case 'completed': return 'Completed';
      case 'failed': return 'Failed';
      default: return stage;
    }
  };

  const getStageColor = (stage: string) => {
    switch (stage) {
      case 'completed': return 'bg-green-500';
      case 'failed': return 'bg-red-500';
      case 'embedding': return 'bg-blue-500';
      case 'chunking': return 'bg-yellow-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center space-x-2">
            <Play className="h-5 w-5" />
            <span>Processing Pipeline</span>
          </CardTitle>
          <div className="flex space-x-2">
            {processingResults.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={clearResults}
                disabled={isProcessing}
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Clear Results
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Processing Controls */}
          <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/50">
            <div className="space-y-1">
              <p className="text-sm font-medium">
                Pipeline: Text Extraction → Chunking → Embeddings → Vector Storage
              </p>
              <p className="text-sm text-muted-foreground">
                Selected documents: {selectedDocuments.length}
              </p>
            </div>
            <Button
              onClick={handleStartProcessing}
              disabled={isProcessing || selectedDocuments.length === 0 || !config.embedding.apiKey}
              size="sm"
            >
              {isProcessing ? (
                <>
                  <Square className="h-4 w-4 mr-2" />
                  Processing...
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 mr-2" />
                  Start Processing
                </>
              )}
            </Button>
          </div>

          {/* API Key Warning */}
          {!config.embedding.apiKey && (
            <div className="p-3 border border-yellow-200 rounded-lg bg-yellow-50">
              <p className="text-sm text-yellow-800">
                API key not configured. Please configure the embedding provider API key in Configuration Management before processing.
              </p>
            </div>
          )}

          {/* Processing Progress */}
          {processingProgress.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-sm font-medium">Processing Progress</h4>
              {processingProgress.map((progress) => (
                <div key={progress.documentId} className="space-y-2 p-3 border rounded-lg">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium truncate">
                      {progress.documentTitle}
                    </span>
                    <Badge 
                      variant="secondary" 
                      className={`${getStageColor(progress.stage)} text-white`}
                    >
                      {getStageLabel(progress.stage)}
                    </Badge>
                  </div>
                  <Progress value={progress.progress} className="h-2" />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{progress.progress}% complete</span>
                    <div className="space-x-2">
                      {progress.chunksGenerated && (
                        <span>Chunks: {progress.chunksGenerated}</span>
                      )}
                      {progress.embeddingsGenerated && (
                        <span>Embeddings: {progress.embeddingsGenerated}</span>
                      )}
                    </div>
                  </div>
                  {progress.error && (
                    <p className="text-xs text-red-600 mt-1">{progress.error}</p>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Processing Results */}
          {processingResults.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-sm font-medium">Processing Results</h4>
              <div className="grid gap-3">
                {processingResults.map((result) => {
                  const document = documents.find(d => d.id === result.documentId);
                  return (
                    <div key={result.documentId} className="p-3 border rounded-lg">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium truncate">
                          {document?.title || result.documentId}
                        </span>
                        <Badge variant={result.success ? "default" : "destructive"}>
                          {result.success ? "Success" : "Failed"}
                        </Badge>
                      </div>
                      {result.success ? (
                        <div className="mt-2 text-xs text-muted-foreground">
                          Generated {result.chunksGenerated} chunks and {result.embeddingsGenerated} embeddings
                        </div>
                      ) : (
                        <div className="mt-2 text-xs text-red-600">
                          {result.error}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
