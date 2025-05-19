
import React from "react";
import { OpenAIKeyField } from "./OpenAIKeyField";
import { ModelSelector } from "./ModelSelector";
import { ChunkSettings } from "./ChunkSettings";
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
    <div className="space-y-4">
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

      <ChunkSettings 
        chunkSize={config.chunkSize} 
        chunkOverlap={config.chunkOverlap} 
        onChange={handleChange} 
        isLoading={isLoading} 
      />

      <StoragePathField 
        storagePath={config.storagePath} 
        onChange={handleChange} 
        isLoading={isLoading} 
      />

      <CustomConfigField 
        customConfiguration={config.customConfiguration} 
        onChange={handleChange} 
        isLoading={isLoading} 
      />
    </div>
  );
}
