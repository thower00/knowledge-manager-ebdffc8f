
import { useState, useEffect } from "react";
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
  
  // Ensure we have a valid provider and model selected
  useEffect(() => {
    if (!provider || !MODEL_PROVIDERS[provider]) {
      // Use a default provider if current is invalid
      const defaultProvider = "openai";
      handleProviderChange(defaultProvider);
    } else if (!specificModelId) {
      // If provider is valid but no model selected, select the first model
      const firstModel = MODEL_PROVIDERS[provider]?.models[0]?.id;
      if (firstModel) {
        handleModelChange(firstModel);
      }
    }
  }, [provider, specificModelId]);
  
  // Find the currently selected model
  const selectedModel = MODEL_PROVIDERS[provider]?.models.find(m => m.id === specificModelId);
  
  return (
    <div className="space-y-6">
      <div className="grid gap-2">
        <Label htmlFor="provider">Embedding Provider</Label>
        <Select
          value={provider}
          onValueChange={handleProviderChange}
          disabled={isLoading}
        >
          <SelectTrigger id="provider">
            <SelectValue placeholder="Select provider" />
          </SelectTrigger>
          <SelectContent>
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
          value={specificModelId}
          onValueChange={handleModelChange}
          disabled={isLoading}
        >
          <SelectTrigger id="specificModelId">
            <SelectValue placeholder="Select model" />
          </SelectTrigger>
          <SelectContent>
            {MODEL_PROVIDERS[provider]?.models.map(model => (
              <SelectItem key={model.id} value={model.id}>{model.name}</SelectItem>
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
