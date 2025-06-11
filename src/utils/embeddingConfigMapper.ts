
export interface EmbeddingConfig {
  provider: "openai" | "cohere" | "huggingface";
  model: string;
  apiKey: string;
  batchSize: number;
  similarityThreshold: string;
  embeddingMetadata?: Record<string, any>;
  vectorStorage?: string;
}

export interface DatabaseConfig {
  provider?: string;
  specificModelId?: string;
  apiKey?: string;
  providerApiKeys?: Record<string, string>;
  embeddingBatchSize?: string;
  similarityThreshold?: string;
  embeddingMetadata?: Record<string, any>;
  vectorStorage?: string;
}

export interface ConfigValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export function mapDatabaseConfigToEmbeddingConfig(dbConfig: DatabaseConfig): EmbeddingConfig {
  console.log('Mapping database config to embedding config:', dbConfig);
  
  const provider = (dbConfig.provider || "openai") as "openai" | "cohere" | "huggingface";
  const model = dbConfig.specificModelId || getDefaultModel(provider);
  
  // Priority: provider-specific key > general API key
  const providerKey = dbConfig.providerApiKeys?.[provider];
  const generalKey = dbConfig.apiKey;
  const apiKey = providerKey || generalKey || "";
  
  const config: EmbeddingConfig = {
    provider,
    model,
    apiKey,
    batchSize: parseInt(dbConfig.embeddingBatchSize || "10"),
    similarityThreshold: dbConfig.similarityThreshold || "0.7",
    embeddingMetadata: dbConfig.embeddingMetadata,
    vectorStorage: dbConfig.vectorStorage || "supabase"
  };
  
  console.log('Mapped embedding config:', {
    provider: config.provider,
    model: config.model,
    hasApiKey: !!config.apiKey,
    apiKeyLength: config.apiKey.length,
    batchSize: config.batchSize,
    similarityThreshold: config.similarityThreshold
  });
  
  return config;
}

export function validateEmbeddingConfig(config: EmbeddingConfig): ConfigValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // Required field validation
  if (!config.provider) {
    errors.push("Provider is required");
  }
  
  if (!config.model || config.model.trim().length === 0) {
    errors.push(`Model is required for ${config.provider || "unknown"} provider`);
  }
  
  if (!config.apiKey || config.apiKey.trim().length === 0) {
    errors.push(`API key is required for ${config.provider || "unknown"} provider`);
  }
  
  if (config.batchSize <= 0) {
    errors.push("Batch size must be greater than 0");
  }
  
  // Provider-specific validation
  if (config.provider === "openai" && config.model && !isValidOpenAIModel(config.model)) {
    warnings.push(`Model "${config.model}" may not be a valid OpenAI embedding model`);
  }
  
  if (config.provider === "cohere" && config.model && !isValidCohereModel(config.model)) {
    warnings.push(`Model "${config.model}" may not be a valid Cohere embedding model`);
  }
  
  if (config.provider === "huggingface" && config.model && !isValidHuggingFaceModel(config.model)) {
    warnings.push(`Model "${config.model}" may not be a valid Hugging Face embedding model`);
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

function getDefaultModel(provider: string): string {
  switch (provider) {
    case "openai":
      return "text-embedding-3-small";
    case "cohere":
      return "embed-english-v3.0";
    case "huggingface":
      return "sentence-transformers/all-MiniLM-L6-v2";
    default:
      return "text-embedding-3-small";
  }
}

function isValidOpenAIModel(model: string): boolean {
  const validModels = [
    "text-embedding-3-small",
    "text-embedding-3-large", 
    "text-embedding-ada-002"
  ];
  return validModels.includes(model);
}

function isValidCohereModel(model: string): boolean {
  const validModels = [
    "embed-english-v3.0",
    "embed-multilingual-v3.0",
    "embed-english-light-v3.0",
    "embed-multilingual-light-v3.0"
  ];
  return validModels.includes(model);
}

function isValidHuggingFaceModel(model: string): boolean {
  const validModels = [
    "sentence-transformers/all-MiniLM-L6-v2",
    "sentence-transformers/all-mpnet-base-v2",
    "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2"
  ];
  return validModels.includes(model);
}

export function getConfigurationStatusMessage(validation: ConfigValidationResult): string {
  if (validation.isValid) {
    return validation.warnings.length > 0 
      ? `Configuration is valid but has warnings: ${validation.warnings.join(', ')}`
      : "Configuration is valid and ready for use";
  } else {
    return `Configuration is invalid: ${validation.errors.join(', ')}`;
  }
}
