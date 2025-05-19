
import React from "react";
import { OpenAIKeyField } from "./OpenAIKeyField";
import { ModelSelector } from "./ModelSelector";
import { ChunkSettings } from "./ChunkSettings";
import { ChunkStrategyField } from "./ChunkStrategyField";
import { StoragePathField } from "./StoragePathField";
import { CustomConfigField } from "./CustomConfigField";
import { useConfig } from "./ConfigContext";

export function ConfigForm() {
  const { config, isLoading } = useConfig();
  
  // Handle form field changes
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    useConfig().setConfig(prev => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name: string, value: string) => {
    useConfig().setConfig(prev => ({ ...prev, [name]: value }));
  };

  return (
    <div className="space-y-6">
      <OpenAIKeyField 
        apiKey={config.apiKey} 
        onChange={handleSelectChange} 
        isLoading={isLoading} 
      />

      <ModelSelector 
        embeddingModel={config.embeddingModel} 
        onChange={handleSelectChange} 
        isLoading={isLoading} 
      />

      <div className="border-t pt-4">
        <h3 className="text-lg font-medium mb-4">Chunking Configuration</h3>
        
        <div className="space-y-4">
          <ChunkSettings 
            chunkSize={config.chunkSize} 
            chunkOverlap={config.chunkOverlap} 
            onChange={handleChange} 
            isLoading={isLoading} 
          />

          <ChunkStrategyField
            chunkStrategy={config.chunkStrategy}
            onChange={handleSelectChange}
            isLoading={isLoading}
          />
        </div>
      </div>

      <div className="border-t pt-4">
        <h3 className="text-lg font-medium mb-4">Storage Settings</h3>
        
        <StoragePathField 
          storagePath={config.storagePath} 
          onChange={handleChange} 
          isLoading={isLoading} 
        />
      </div>

      <div className="border-t pt-4">
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
