
import { useEffect, useRef } from "react";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MODEL_PROVIDERS, getModelDefaults } from "./utils/modelProviders";
import { useConfig } from "./ConfigContext";
import { Badge } from "@/components/ui/badge";

interface ModelSelectorProps {
  isLoading: boolean;
}

export function ModelSelector({ isLoading }: ModelSelectorProps) {
  const { config, setConfig } = useConfig();
  const { provider, specificModelId } = config;
  
  // Force re-render on mount to ensure UI shows correct values
  useEffect(() => {
    console.log("ModelSelector mounted with provider:", provider, "model:", specificModelId);
    
    // Check if we have valid provider and model
    if (!provider || !MODEL_PROVIDERS[provider]) {
      console.log("Invalid provider, setting to default: openai");
      handleProviderChange("openai");
    } else if (!specificModelId) {
      console.log("No model selected, selecting default for provider:", provider);
      const firstModel = MODEL_PROVIDERS[provider]?.models[0]?.id;
      if (firstModel) {
        handleModelChange(firstModel);
      }
    }
  }, []);
  
  const applyModelDefaults = (providerId: string, modelId: string) => {
    const defaults = getModelDefaults(providerId, modelId);
    console.log(`Applying defaults for ${providerId}/${modelId}:`, defaults);
    
    setConfig(prev => ({
      ...prev,
      chunkSize: defaults.chunkSize,
      chunkOverlap: defaults.chunkOverlap,
      chunkStrategy: defaults.chunkStrategy,
    }));
  };
  
  const handleProviderChange = (newProvider: string) => {
    console.log(`Changing provider to: ${newProvider}`);
    // Get the first model from the selected provider
    const firstModel = MODEL_PROVIDERS[newProvider]?.models[0]?.id || "";
    
    // If the provider has a saved API key, load it
    const savedApiKey = config.providerApiKeys[newProvider] || "";
    
    setConfig(prev => ({
      ...prev,
      provider: newProvider,
      specificModelId: firstModel,
      apiKey: savedApiKey,
    }));
    
    // Apply the default settings for the selected model
    applyModelDefaults(newProvider, firstModel);
  };
  
  const handleModelChange = (modelId: string) => {
    console.log(`Changing model to: ${modelId}`);
    setConfig(prev => ({
      ...prev,
      specificModelId: modelId,
    }));
    
    // Apply the default settings for the selected model
    applyModelDefaults(provider, modelId);
  };
  
  // Find the currently selected model
  const selectedModel = MODEL_PROVIDERS[provider]?.models.find(m => m.id === specificModelId);
  
  console.log("Rendering ModelSelector with provider:", provider, "and model:", specificModelId);
  console.log("Available models for provider:", MODEL_PROVIDERS[provider]?.models);
  
  return (
    <div className="space-y-6">
      <div className="grid gap-2">
        <Label htmlFor="provider">Embedding Provider</Label>
        <Select
          value={provider || "openai"}
          onValueChange={handleProviderChange}
          disabled={isLoading}
        >
          <SelectTrigger id="provider" className="bg-background">
            <SelectValue placeholder="Select provider" />
          </SelectTrigger>
          <SelectContent className="bg-background max-h-[300px]">
            {Object.entries(MODEL_PROVIDERS).map(([id, providerConfig]) => (
              <SelectItem key={id} value={id}>{providerConfig.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-sm text-muted-foreground">
          Provider for embedding models
        </p>
      </div>
      
      <div className="grid gap-2">
        <Label htmlFor="specificModelId">Specific Model</Label>
        <Select
          value={specificModelId || (MODEL_PROVIDERS[provider]?.models[0]?.id || "")}
          onValueChange={handleModelChange}
          disabled={isLoading}
        >
          <SelectTrigger id="specificModelId" className="bg-background">
            <SelectValue placeholder="Select model" />
          </SelectTrigger>
          <SelectContent className="max-h-[300px] bg-background overflow-y-auto">
            {MODEL_PROVIDERS[provider]?.models.map(model => (
              <SelectItem key={model.id} value={model.id}>
                {model.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        {selectedModel?.description && (
          <p className="text-sm text-muted-foreground">
            {selectedModel.description}
          </p>
        )}
        
        {selectedModel && (
          <div className="flex flex-wrap gap-2 mt-2">
            <Badge variant="outline">
              Chunk size: {selectedModel.defaultChunkSize}
            </Badge>
            <Badge variant="outline">
              Overlap: {selectedModel.defaultChunkOverlap}
            </Badge>
            <Badge variant="outline">
              Strategy: {selectedModel.defaultChunkStrategy}
            </Badge>
          </div>
        )}
      </div>
    </div>
  );
}
