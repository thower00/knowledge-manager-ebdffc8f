
import { Brain, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";

interface EmbeddingTestControlsProps {
  chunks?: Array<{
    index: number;
    content: string;
    size: number;
    startPosition?: number;
    endPosition?: number;
  }>;
  isGenerating: boolean;
  configLoaded: boolean;
  hasApiKey: () => boolean;
  loadedConfig: any;
  onGenerateEmbeddings: () => void;
}

export function EmbeddingTestControls({
  chunks,
  isGenerating,
  configLoaded,
  hasApiKey,
  loadedConfig,
  onGenerateEmbeddings
}: EmbeddingTestControlsProps) {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium">Run Embedding Test</h3>
      
      <Button
        onClick={onGenerateEmbeddings}
        disabled={!chunks || chunks.length === 0 || isGenerating || !configLoaded || !hasApiKey()}
        className="w-full"
      >
        {isGenerating ? (
          <>
            <Zap className="h-4 w-4 mr-2 animate-pulse" />
            Generating Embeddings... ({Math.ceil((chunks?.length || 0) / parseInt(loadedConfig?.embeddingBatchSize || "10"))} batches)
          </>
        ) : (
          <>
            <Brain className="h-4 w-4 mr-2" />
            Generate Embeddings from Chunks
          </>
        )}
      </Button>
    </div>
  );
}
