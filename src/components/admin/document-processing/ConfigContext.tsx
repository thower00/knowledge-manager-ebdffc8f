
import React, { createContext, useContext, useState } from "react";
import { Json } from "@/integrations/supabase/types";

// Document processing specific configuration interface
export interface DocumentProcessingConfigSettings {
  apiKey: string;
  provider: string;
  embeddingModel: string;
  specificModelId: string;
  chunkSize: string;
  chunkOverlap: string;
  chunkStrategy: "fixed_size" | "semantic" | "recursive" | "paragraph" | "sentence";
  storagePath: string;
  customConfiguration: string;
  providerApiKeys: {
    [provider: string]: string;
  };
  // Embedding-specific configurations
  embeddingBatchSize: string;
  similarityThreshold: string;
  vectorStorage: "supabase" | "pinecone" | "weaviate" | "local";
  embeddingMetadata: {
    includeSource: boolean;
    includeTimestamp: boolean;
    includeModelInfo: boolean;
    includeChunkIndex: boolean;
  };
  [key: string]: string | object; // Add index signature to make it compatible with { [key: string]: Json }
}

interface ConfigContextType {
  config: DocumentProcessingConfigSettings;
  setConfig: React.Dispatch<React.SetStateAction<DocumentProcessingConfigSettings>>;
  isLoading: boolean;
  setIsLoading: React.Dispatch<React.SetStateAction<boolean>>;
  isSaving: boolean;
  setIsSaving: React.Dispatch<React.SetStateAction<boolean>>;
}

// Default configuration settings for document processing only
export const DEFAULT_CONFIG: DocumentProcessingConfigSettings = {
  apiKey: "",
  provider: "openai",
  embeddingModel: "openai",
  specificModelId: "text-embedding-ada-002",
  chunkSize: "1000",
  chunkOverlap: "200",
  chunkStrategy: "fixed_size",
  storagePath: "/data/documents",
  customConfiguration: "{\n  \"advanced\": {\n    \"cache\": true\n  }\n}",
  providerApiKeys: {},
  // Improved embedding defaults for better search performance
  embeddingBatchSize: "10",
  similarityThreshold: "0.5", // Lowered from 0.7 to 0.5 for better recall
  vectorStorage: "supabase",
  embeddingMetadata: {
    includeSource: true,
    includeTimestamp: true,
    includeModelInfo: true,
    includeChunkIndex: true
  }
};

const ConfigContext = createContext<ConfigContextType | undefined>(undefined);

export const ConfigProvider: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  const [config, setConfig] = useState<DocumentProcessingConfigSettings>(DEFAULT_CONFIG);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  return (
    <ConfigContext.Provider
      value={{ config, setConfig, isLoading, setIsLoading, isSaving, setIsSaving }}
    >
      {children}
    </ConfigContext.Provider>
  );
};

export const useConfig = () => {
  const context = useContext(ConfigContext);
  if (context === undefined) {
    throw new Error("useConfig must be used within a ConfigProvider");
  }
  return context;
};

export default ConfigContext;
