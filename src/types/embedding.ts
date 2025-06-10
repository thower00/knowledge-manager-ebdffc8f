
export interface EmbeddingVector {
  id: string;
  document_id: string;
  chunk_id: string;
  embedding_vector: number[];
  embedding_model: string;
  embedding_provider: string;
  similarity_threshold: number | null;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface SimilaritySearchResult {
  id: string;
  document_id: string;
  chunk_id: string;
  document_title: string;
  chunk_content: string;
  similarity: number;
}

export interface EmbeddingGenerationRequest {
  text: string;
  provider: string;
  model: string;
  apiKey: string;
}

export interface EmbeddingGenerationResponse {
  embedding: number[];
  model: string;
  provider: string;
  dimensions: number;
  usage?: {
    prompt_tokens: number;
    total_tokens: number;
  };
}

export interface BatchEmbeddingRequest {
  chunks: Array<{
    id: string;
    content: string;
    document_id: string;
  }>;
  config: {
    provider: string;
    model: string;
    apiKey: string;
    batchSize: number;
  };
}

export interface BatchEmbeddingResult {
  success: boolean;
  processed: number;
  total: number;
  errors: string[];
  embeddings: Array<{
    chunk_id: string;
    embedding_id: string;
    dimensions: number;
  }>;
}
