
import React from "react";
import { OpenAIKeyField } from "./OpenAIKeyField";
import { CohereKeyField } from "./CohereKeyField";
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
          />

          <ChunkStrategyField
            chunkStrategy={config.chunkStrategy}
            onChange={handleSelectChange}
            isLoading={isLoading}
          />
        </div>
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
