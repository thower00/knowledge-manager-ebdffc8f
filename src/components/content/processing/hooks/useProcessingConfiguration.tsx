
import { useState, useEffect } from "react";
import { ChunkingConfig } from "@/types/chunking";

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
  const [isLoading, setIsLoading] = useState(false);

  // Load configuration from localStorage on mount
  useEffect(() => {
    console.log("useProcessingConfiguration - Loading configuration");
    try {
      const savedConfig = localStorage.getItem("processingConfig");
      if (savedConfig) {
        const parsed = JSON.parse(savedConfig);
        setConfig(prev => ({
          chunking: { ...DEFAULT_CHUNKING_CONFIG, ...parsed.chunking },
          embedding: { ...DEFAULT_EMBEDDING_CONFIG, ...parsed.embedding }
        }));
        console.log("Loaded saved processing configuration");
      }
    } catch (error) {
      console.error("Error loading processing configuration:", error);
    }
  }, []);

  return {
    config,
    isLoading
  };
}
