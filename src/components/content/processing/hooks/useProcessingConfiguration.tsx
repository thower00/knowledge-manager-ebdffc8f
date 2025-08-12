
import { useState, useEffect } from "react";
import { ChunkingConfig } from "@/types/chunking";
import { supabase } from "@/integrations/supabase/client";
import { mapDatabaseConfigToEmbeddingConfig, type EmbeddingConfig } from "@/utils/embeddingConfigMapper";
import { maskSecretsInObject } from "@/utils/logging";
import { logger } from "@/utils/logger";

interface ProcessingConfig {
  chunking: ChunkingConfig;
  embedding: EmbeddingConfig;
}

// These values should match Configuration Management defaults
const DEFAULT_CHUNKING_CONFIG: ChunkingConfig = {
  chunkSize: 1000,
  chunkOverlap: 200,
  chunkStrategy: "recursive"
};

export function useProcessingConfiguration() {
  const [config, setConfig] = useState<ProcessingConfig>({
    chunking: DEFAULT_CHUNKING_CONFIG,
    embedding: {
      provider: "openai",
      model: "text-embedding-3-small",
      apiKey: "",
      batchSize: 100,
      similarityThreshold: "0.7"
    }
  });
  const [isLoading, setIsLoading] = useState(true);

  // Load configuration from Configuration Management (database)
  useEffect(() => {
    logger.info("useProcessingConfiguration - Loading configuration from Configuration Management");
    const loadConfiguration = async () => {
      try {
        const { data: configData, error } = await supabase
          .from("configurations")
          .select("key, value")
          .eq("key", "document_processing")
          .maybeSingle();

        if (error) {
          logger.error("Error loading processing configuration:", error);
          return;
        }

        if (configData && configData.value) {
          const dbConfig = configData.value as any;
          logger.info("Loaded processing configuration from Configuration Management:", maskSecretsInObject(dbConfig));
          
          // Map the Configuration Management structure to Processing Configuration
          const mappedConfig: ProcessingConfig = {
            chunking: {
              chunkSize: parseInt(dbConfig.chunkSize) || DEFAULT_CHUNKING_CONFIG.chunkSize,
              chunkOverlap: parseInt(dbConfig.chunkOverlap) || DEFAULT_CHUNKING_CONFIG.chunkOverlap,
              chunkStrategy: dbConfig.chunkStrategy || DEFAULT_CHUNKING_CONFIG.chunkStrategy
            },
            // Use the configuration mapper for consistent embedding config
            embedding: mapDatabaseConfigToEmbeddingConfig(dbConfig)
          };
          
          logger.info("Mapped processing configuration:", maskSecretsInObject(mappedConfig));
          setConfig(mappedConfig);
        } else {
          logger.info("No configuration found in Configuration Management, using defaults");
        }
      } catch (error) {
        logger.error("Error loading processing configuration:", error);
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
