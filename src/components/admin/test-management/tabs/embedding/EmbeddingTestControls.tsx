
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Brain, AlertTriangle, Settings } from "lucide-react";
import type { EmbeddingConfig, ConfigValidationResult } from "@/utils/embeddingConfigMapper";

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
  configValidation: ConfigValidationResult;
  mappedConfig: EmbeddingConfig | null;
  onGenerateEmbeddings: () => void;
}

export function EmbeddingTestControls({
  chunks,
  isGenerating,
  configLoaded,
  configValidation,
  mappedConfig,
  onGenerateEmbeddings
}: EmbeddingTestControlsProps) {
  
  const canGenerate = configLoaded && 
                     configValidation.isValid && 
                     chunks && 
                     chunks.length > 0 && 
                     !isGenerating;

  const getDisabledReason = () => {
    if (!configLoaded) return "Configuration is loading...";
    if (!configValidation.isValid) return "Configuration is invalid - check errors above";
    if (!chunks || chunks.length === 0) return "No chunks available - generate chunks first in the Chunking tab";
    if (isGenerating) return "Generation in progress...";
    return "";
  };

  const handleOpenConfiguration = () => {
    window.open('/configuration-management', '_blank');
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-2">
        <Brain className="h-4 w-4" />
        <h3 className="text-lg font-medium">Generate Embeddings</h3>
      </div>

      {/* Source Information */}
      <div className="text-sm text-muted-foreground">
        {chunks && chunks.length > 0 ? (
          <p>Ready to generate embeddings for {chunks.length} chunks</p>
        ) : (
          <p>No chunks available. Please generate chunks in the Chunking tab first.</p>
        )}
      </div>

      {/* Generation Summary */}
      {configLoaded && mappedConfig && chunks && chunks.length > 0 && (
        <div className="p-3 border rounded-lg bg-muted/50 text-sm">
          <h4 className="font-medium mb-2">Generation Plan:</h4>
          <ul className="space-y-1">
            <li><span className="text-muted-foreground">Provider:</span> {mappedConfig.provider}</li>
            <li><span className="text-muted-foreground">Model:</span> {mappedConfig.model}</li>
            <li><span className="text-muted-foreground">Chunks:</span> {chunks.length}</li>
            <li><span className="text-muted-foreground">Batch size:</span> {mappedConfig.batchSize}</li>
            <li><span className="text-muted-foreground">Estimated batches:</span> {Math.ceil(chunks.length / mappedConfig.batchSize)}</li>
          </ul>
        </div>
      )}

      {/* Generate Button */}
      <div className="flex items-center space-x-2">
        <Button 
          onClick={onGenerateEmbeddings}
          disabled={!canGenerate}
          className="min-w-[200px]"
        >
          <Brain className="h-4 w-4 mr-2" />
          {isGenerating ? "Generating Embeddings..." : "Generate Embeddings"}
        </Button>

        {!configValidation.isValid && configLoaded && (
          <Button variant="outline" size="sm" onClick={handleOpenConfiguration}>
            <Settings className="h-4 w-4 mr-2" />
            Open Configuration Management
          </Button>
        )}
      </div>

      {/* Disabled Reason */}
      {!canGenerate && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            {getDisabledReason()}
          </AlertDescription>
        </Alert>
      )}

      {/* Processing Instructions */}
      {configValidation.isValid && chunks && chunks.length > 0 && (
        <div className="text-xs text-muted-foreground">
          <p>
            Embeddings will be generated in batches of {mappedConfig?.batchSize || 10} chunks. 
            Large documents may take several minutes to process.
          </p>
        </div>
      )}
    </div>
  );
}
