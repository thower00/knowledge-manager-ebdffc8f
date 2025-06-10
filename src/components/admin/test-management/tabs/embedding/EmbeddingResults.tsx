
import { useState } from "react";
import { Download, Database } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getDimensionsForModel, downloadEmbeddings } from "./utils/embeddingUtils";

interface EmbeddingResult {
  chunkIndex: number;
  embedding: number[];
  metadata: {
    sourceDocument: string;
    chunkSize: number;
    model: string;
    timestamp: string;
    startPosition?: number;
    endPosition?: number;
  };
}

interface EmbeddingResultsProps {
  embeddingResults: EmbeddingResult[];
  loadedConfig: any;
  sourceDocument?: string;
}

export function EmbeddingResults({ 
  embeddingResults, 
  loadedConfig, 
  sourceDocument 
}: EmbeddingResultsProps) {
  const [showEmbeddings, setShowEmbeddings] = useState(false);

  if (embeddingResults.length === 0) return null;

  const handleDownload = () => {
    downloadEmbeddings(embeddingResults, loadedConfig, sourceDocument);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">Embedding Results</h3>
        <div className="flex items-center space-x-2">
          <Button
            onClick={handleDownload}
            size="sm"
            variant="outline"
          >
            <Download className="h-4 w-4 mr-2" />
            Download
          </Button>
          <Button
            onClick={() => setShowEmbeddings(!showEmbeddings)}
            size="sm"
            variant="outline"
          >
            {showEmbeddings ? 'Hide' : 'Show'} Details
          </Button>
        </div>
      </div>
      
      <div className="grid grid-cols-3 gap-4 text-center">
        <div className="p-3 border rounded-lg">
          <div className="text-2xl font-bold">{embeddingResults.length}</div>
          <div className="text-sm text-muted-foreground">Embeddings</div>
        </div>
        <div className="p-3 border rounded-lg">
          <div className="text-2xl font-bold">
            {embeddingResults.length > 0 ? embeddingResults[0].embedding.length : getDimensionsForModel(loadedConfig?.specificModelId || "text-embedding-ada-002")}
          </div>
          <div className="text-sm text-muted-foreground">Dimensions</div>
        </div>
        <div className="p-3 border rounded-lg">
          <div className="text-2xl font-bold">{loadedConfig?.vectorStorage || "supabase"}</div>
          <div className="text-sm text-muted-foreground">Storage</div>
        </div>
      </div>

      {showEmbeddings && (
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {embeddingResults.slice(0, 10).map((result) => (
            <div key={result.chunkIndex} className="border rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <Badge variant="secondary">Chunk {result.chunkIndex + 1}</Badge>
                <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                  <Database className="h-3 w-3" />
                  <span>{result.embedding.length}D vector</span>
                </div>
              </div>
              <div className="text-xs space-y-1">
                <div><strong>Source:</strong> {result.metadata.sourceDocument}</div>
                <div><strong>Model:</strong> {result.metadata.model}</div>
                <div><strong>Vector Preview:</strong> [{result.embedding.slice(0, 5).map(v => v.toFixed(4)).join(', ')}...]</div>
              </div>
            </div>
          ))}
          {embeddingResults.length > 10 && (
            <div className="text-center text-sm text-muted-foreground">
              ... and {embeddingResults.length - 10} more embeddings
            </div>
          )}
        </div>
      )}
    </div>
  );
}
