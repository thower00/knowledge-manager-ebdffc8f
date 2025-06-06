
export interface ModelOption {
  id: string;
  name: string;
  description?: string;
  dimensions?: string;
  defaultChunkSize: string;
  defaultChunkOverlap: string;
  defaultChunkStrategy: "fixed_size" | "semantic" | "recursive" | "paragraph" | "sentence";
}

export interface ProviderConfig {
  name: string;
  apiKeyName: string;
  apiKeyPlaceholder: string;
  apiKeyDescription: string;
  models: ModelOption[];
}

export const MODEL_PROVIDERS: Record<string, ProviderConfig> = {
  openai: {
    name: "OpenAI",
    apiKeyName: "OPENAI_API_KEY",
    apiKeyPlaceholder: "Enter your OpenAI API key",
    apiKeyDescription: "API key for OpenAI embedding models",
    models: [
      {
        id: "text-embedding-ada-002",
        name: "Ada (v2)",
        description: "Good balance of quality and speed",
        dimensions: "1536",
        defaultChunkSize: "1000",
        defaultChunkOverlap: "200",
        defaultChunkStrategy: "fixed_size"
      },
      {
        id: "text-embedding-3-small",
        name: "Small (v3)",
        description: "Efficient and cost-effective",
        dimensions: "1536",
        defaultChunkSize: "800",
        defaultChunkOverlap: "150",
        defaultChunkStrategy: "semantic"
      },
      {
        id: "text-embedding-3-large",
        name: "Large (v3)",
        description: "Highest quality embeddings",
        dimensions: "3072",
        defaultChunkSize: "1500",
        defaultChunkOverlap: "300",
        defaultChunkStrategy: "semantic"
      }
    ]
  },
  cohere: {
    name: "Cohere",
    apiKeyName: "COHERE_API_KEY",
    apiKeyPlaceholder: "Enter your Cohere API key",
    apiKeyDescription: "API key for Cohere embedding models",
    models: [
      {
        id: "embed-english-v2.0",
        name: "English (v2.0)",
        description: "Optimized for English text",
        dimensions: "4096",
        defaultChunkSize: "1200",
        defaultChunkOverlap: "250",
        defaultChunkStrategy: "semantic"
      },
      {
        id: "embed-multilingual-v2.0",
        name: "Multilingual (v2.0)",
        description: "Supports 100+ languages",
        dimensions: "768",
        defaultChunkSize: "1000",
        defaultChunkOverlap: "150",
        defaultChunkStrategy: "fixed_size"
      },
      {
        id: "embed-english-light-v2.0",
        name: "English Light (v2.0)",
        description: "Faster and cheaper",
        dimensions: "1024",
        defaultChunkSize: "800",
        defaultChunkOverlap: "100",
        defaultChunkStrategy: "fixed_size"
      }
    ]
  },
  huggingface: {
    name: "HuggingFace",
    apiKeyName: "HUGGINGFACE_API_KEY",
    apiKeyPlaceholder: "Enter your HuggingFace API key",
    apiKeyDescription: "API key for HuggingFace models",
    models: [
      {
        id: "sentence-transformers/all-mpnet-base-v2",
        name: "MPNet",
        description: "High quality embeddings",
        dimensions: "768",
        defaultChunkSize: "1000",
        defaultChunkOverlap: "200",
        defaultChunkStrategy: "fixed_size"
      },
      {
        id: "sentence-transformers/all-MiniLM-L6-v2",
        name: "MiniLM",
        description: "Fast and lightweight",
        dimensions: "384",
        defaultChunkSize: "800",
        defaultChunkOverlap: "150",
        defaultChunkStrategy: "fixed_size"
      },
      {
        id: "sentence-transformers/multi-qa-mpnet-base-dot-v1",
        name: "Multi-QA MPNet",
        description: "Optimized for Q&A matching",
        dimensions: "768",
        defaultChunkSize: "1500",
        defaultChunkOverlap: "300",
        defaultChunkStrategy: "paragraph"
      }
    ]
  },
  local: {
    name: "Local Model",
    apiKeyName: "",
    apiKeyPlaceholder: "No API key needed",
    apiKeyDescription: "Uses local embedding model (requires setup)",
    models: [
      {
        id: "local-model",
        name: "Default Local Model",
        description: "Uses locally deployed embedding model",
        dimensions: "Varies",
        defaultChunkSize: "500",
        defaultChunkOverlap: "100",
        defaultChunkStrategy: "fixed_size"
      }
    ]
  }
};

export function getProviderFromModel(modelId: string): string {
  for (const [provider, config] of Object.entries(MODEL_PROVIDERS)) {
    if (config.models.some(model => model.id === modelId)) {
      return provider;
    }
  }
  return "openai"; // Default provider
}

export function getModelDefaults(providerId: string, modelId: string): {
  specificModelId: string;
  chunkSize: string;
  chunkOverlap: string;
  chunkStrategy: "fixed_size" | "semantic" | "recursive" | "paragraph" | "sentence";
} {
  const provider = MODEL_PROVIDERS[providerId];
  if (!provider) {
    return {
      specificModelId: "text-embedding-ada-002",
      chunkSize: "1000",
      chunkOverlap: "200",
      chunkStrategy: "fixed_size"
    };
  }
  
  // If no modelId is specified, use the first model from the provider
  if (!modelId && provider.models.length > 0) {
    const defaultModel = provider.models[0];
    return {
      specificModelId: defaultModel.id,
      chunkSize: defaultModel.defaultChunkSize,
      chunkOverlap: defaultModel.defaultChunkOverlap,
      chunkStrategy: defaultModel.defaultChunkStrategy
    };
  }
  
  const model = provider.models.find(m => m.id === modelId);
  if (!model) {
    // If model not found, use the first one
    const firstModel = provider.models[0];
    return {
      specificModelId: firstModel ? firstModel.id : "text-embedding-ada-002",
      chunkSize: firstModel ? firstModel.defaultChunkSize : "1000",
      chunkOverlap: firstModel ? firstModel.defaultChunkOverlap : "200",
      chunkStrategy: firstModel ? firstModel.defaultChunkStrategy : "fixed_size"
    };
  }
  
  return {
    specificModelId: model.id,
    chunkSize: model.defaultChunkSize,
    chunkOverlap: model.defaultChunkOverlap,
    chunkStrategy: model.defaultChunkStrategy
  };
}
