
import { Settings, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface EmbeddingConfigurationDisplayProps {
  configLoaded: boolean;
  loadedConfig: any;
  hasApiKey: () => boolean;
}

export function EmbeddingConfigurationDisplay({ 
  configLoaded, 
  loadedConfig, 
  hasApiKey 
}: EmbeddingConfigurationDisplayProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-2">
        <Settings className="h-4 w-4" />
        <h3 className="text-lg font-medium">Embedding Configuration</h3>
        <Badge variant="outline" className="text-xs">From Configuration Management</Badge>
        {!configLoaded && <Badge variant="secondary" className="text-xs">Loading...</Badge>}
      </div>
      
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Provider:</span>
            <span className="font-medium">{configLoaded ? (loadedConfig?.provider || "openai") : "Loading..."}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Model:</span>
            <span className="font-medium">{configLoaded ? (loadedConfig?.specificModelId || "text-embedding-ada-002") : "Loading..."}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">API Key:</span>
            <span className={`font-medium ${hasApiKey() ? 'text-green-600' : 'text-red-600'}`}>
              {configLoaded ? (hasApiKey() ? "✓ Configured" : "❌ Missing") : "Loading..."}
            </span>
          </div>
        </div>
        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Batch Size:</span>
            <span className="font-medium">{configLoaded ? (loadedConfig?.embeddingBatchSize || "10") : "Loading..."}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Vector Storage:</span>
            <span className="font-medium">{configLoaded ? (loadedConfig?.vectorStorage || "supabase") : "Loading..."}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Similarity Threshold:</span>
            <span className="font-medium">{configLoaded ? (loadedConfig?.similarityThreshold || "0.7") : "Loading..."}</span>
          </div>
        </div>
      </div>

      {configLoaded && !hasApiKey() && (
        <div className="flex items-center space-x-2 p-3 border border-red-200 rounded-lg bg-red-50">
          <AlertTriangle className="h-4 w-4 text-red-500" />
          <span className="text-sm text-red-700">
            Please configure your {loadedConfig?.provider || "provider"} API key in Configuration Management before running embeddings.
          </span>
        </div>
      )}
    </div>
  );
}
