
import { useState, useEffect } from "react";
import { ChunkingConfig } from "@/types/chunking";
import { supabase } from "@/integrations/supabase/client";

interface EmbeddingConfig {
  provider: "openai" | "cohere" | "huggingface";
  model: string;
  apiKey: string;
  batchSize: number;
}

interface ProcessingConfig {
  chunking: ChunkingConfig;
  embedding: EmbeddingConfig;
}

const DEFAULT_CHUNKING_CONFIG: ChunkingConfig = {
  chunkSize: 1000,
  chunkOverlap: 200,
  chunkStrategy: "recursive"
};

const DEFAULT_EMBEDDING_CONFIG: EmbeddingConfig = {
  provider: "openai",
  model: "text-embedding-3-small",
  apiKey: "",
  batchSize: 100
};

export function useProcessingConfiguration() {
  const [config, setConfig] = useState<ProcessingConfig>({
    chunking: DEFAULT_CHUNKING_CONFIG,
    embedding: DEFAULT_EMBEDDING_CONFIG
  });
  const [isLoading, setIsLoading] = useState(true);

  // Load configuration from Configuration Management (database)
  useEffect(() => {
    console.log("useProcessingConfiguration - Loading configuration from Configuration Management");
    const loadConfiguration = async () => {
      try {
        const { data: configData, error } = await supabase
          .from("configurations")
          .select("key, value")
          .eq("key", "document_processing")
          .maybeSingle();

        if (error) {
          console.error("Error loading processing configuration:", error);
          return;
        }

        if (configData && configData.value) {
          const dbConfig = configData.value as any;
          console.log("Loaded processing configuration from Configuration Management:", dbConfig);
          
          // Map the Configuration Management structure to Processing Configuration
          const mappedConfig: ProcessingConfig = {
            chunking: {
              chunkSize: parseInt(dbConfig.chunkSize) || DEFAULT_CHUNKING_CONFIG.chunkSize,
              chunkOverlap: parseInt(dbConfig.chunkOverlap) || DEFAULT_CHUNKING_CONFIG.chunkOverlap,
              chunkStrategy: dbConfig.chunkStrategy || DEFAULT_CHUNKING_CONFIG.chunkStrategy
            },
            embedding: {
              provider: dbConfig.provider || DEFAULT_EMBEDDING_CONFIG.provider,
              model: dbConfig.specificModelId || DEFAULT_EMBEDDING_CONFIG.model,
              apiKey: dbConfig.providerApiKeys?.[dbConfig.provider] || dbConfig.apiKey || "",
              batchSize: parseInt(dbConfig.embeddingBatchSize) || DEFAULT_EMBEDDING_CONFIG.batchSize
            }
          };
          
          setConfig(mappedConfig);
        } else {
          console.log("No configuration found in Configuration Management, using defaults");
        }
      } catch (error) {
        console.error("Error loading processing configuration:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadConfiguration();
  }, []);

  return {
    config,
    isLoading
  };
}
