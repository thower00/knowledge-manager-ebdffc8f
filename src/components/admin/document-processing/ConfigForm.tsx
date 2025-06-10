
import React, { useEffect } from "react";
import { OpenAIKeyField } from "./OpenAIKeyField";
import { CohereKeyField } from "./CohereKeyField";
import { ModelSelector } from "./ModelSelector";
import { ChunkSettings } from "./ChunkSettings";
import { ChunkStrategyField } from "./ChunkStrategyField";
import { StoragePathField } from "./StoragePathField";
import { CustomConfigField } from "./CustomConfigField";
import { EmbeddingSettings } from "./EmbeddingSettings";
import { useConfig } from "./ConfigContext";
import { getModelDefaults } from "./utils/modelProviders";

export function ConfigForm() {
  const { config, isLoading, setConfig } = useConfig();
  
  // Handle form field changes
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setConfig(prev => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name: string, value: string) => {
    console.log(`Setting ${name} to ${value}`);
    
    if (name === "provider") {
      // When changing provider, reset model and apply defaults
      const firstModelId = getModelDefaults(value, "").specificModelId;
      const defaults = getModelDefaults(value, firstModelId);
      
      setConfig(prev => ({
        ...prev,
        provider: value,
        specificModelId: firstModelId,
        chunkSize: defaults.chunkSize,
        chunkOverlap: defaults.chunkOverlap,
        chunkStrategy: defaults.chunkStrategy,
        // If we have a saved API key for this provider, use it
        apiKey: prev.providerApiKeys[value] || ""
      }));
    } else if (name === "specificModelId") {
      // When changing model, apply its default settings
      const defaults = getModelDefaults(config.provider, value);
      
      setConfig(prev => ({
        ...prev,
        specificModelId: value,
        chunkSize: defaults.chunkSize,
        chunkOverlap: defaults.chunkOverlap,
        chunkStrategy: defaults.chunkStrategy
      }));
    } else {
      // For other selections
      setConfig(prev => ({ ...prev, [name]: value }));
    }
  };
  
  // Save API key to provider-specific storage when it changes
  useEffect(() => {
    if (config.provider && config.apiKey) {
      setConfig(prev => ({
        ...prev,
        providerApiKeys: {
          ...prev.providerApiKeys,
          [config.provider]: config.apiKey
        }
      }));
    }
  }, [config.provider, config.apiKey, setConfig]);

  const renderApiKeyField = () => {
    switch(config.provider) {
      case "openai":
        return <OpenAIKeyField isLoading={isLoading} />;
      case "cohere":
        return <CohereKeyField isLoading={isLoading} />;
      case "huggingface":
        return <OpenAIKeyField isLoading={isLoading} />;
      case "local":
        return (
          <div className="text-sm text-muted-foreground">
            No API key needed for local models.
          </div>
        );
      default:
        return <OpenAIKeyField isLoading={isLoading} />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="border-b pb-6">
        <h3 className="text-lg font-medium mb-4">Provider & Model Settings</h3>
        
        <div className="space-y-6">
          <ModelSelector isLoading={isLoading} />
          
          {renderApiKeyField()}
        </div>
      </div>

      <div className="border-b py-6">
        <h3 className="text-lg font-medium mb-4">Chunking Configuration</h3>
        
        <div className="space-y-4">
          <ChunkSettings 
            chunkSize={config.chunkSize} 
            chunkOverlap={config.chunkOverlap} 
            onChange={handleChange} 
            isLoading={isLoading}
            modelDefaults={getModelDefaults(config.provider, config.specificModelId)}
          />

          <ChunkStrategyField
            chunkStrategy={config.chunkStrategy}
            onChange={handleSelectChange}
            isLoading={isLoading}
            defaultStrategy={getModelDefaults(config.provider, config.specificModelId).chunkStrategy}
          />
        </div>
      </div>

      <div className="border-b py-6">
        <h3 className="text-lg font-medium mb-4">Embedding Configuration</h3>
        
        <EmbeddingSettings isLoading={isLoading} />
      </div>

      <div className="border-b py-6">
        <h3 className="text-lg font-medium mb-4">Storage Settings</h3>
        
        <StoragePathField 
          storagePath={config.storagePath} 
          onChange={handleChange} 
          isLoading={isLoading} 
        />
      </div>

      <div className="pt-6">
        <h3 className="text-lg font-medium mb-4">Advanced Configuration</h3>
        
        <CustomConfigField 
          customConfiguration={config.customConfiguration} 
          onChange={handleChange} 
          isLoading={isLoading} 
        />
      </div>
    </div>
  );
}
