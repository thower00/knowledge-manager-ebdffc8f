
import { supabase } from "@/integrations/supabase/client";
import { ConfigSettings } from "../../document-processing/ConfigContext";

export interface EmbeddingRequest {
  text: string;
  model?: string;
  provider?: string;
}

export interface EmbeddingResponse {
  embedding: number[];
  model: string;
  provider: string;
  usage?: {
    prompt_tokens: number;
    total_tokens: number;
  };
}

export interface DocumentEmbedding {
  id: string;
  document_id: string;
  chunk_id: string;
  embedding_vector: number[];
  embedding_model: string;
  embedding_provider: string;
  similarity_threshold: number;
  metadata: any;
  created_at: string;
  updated_at: string;
}

export class EmbeddingService {
  private config: ConfigSettings;

  constructor(config: ConfigSettings) {
    this.config = config;
  }

  async generateEmbedding(text: string): Promise<EmbeddingResponse> {
    const apiKey = this.config.providerApiKeys[this.config.provider] || this.config.apiKey;
    
    if (!apiKey) {
      throw new Error(`No API key found for provider: ${this.config.provider}`);
    }

    switch (this.config.provider) {
      case 'openai':
        return this.generateOpenAIEmbedding(text, apiKey);
      case 'cohere':
        return this.generateCohereEmbedding(text, apiKey);
      case 'huggingface':
        return this.generateHuggingFaceEmbedding(text, apiKey);
      default:
        throw new Error(`Unsupported embedding provider: ${this.config.provider}`);
    }
  }

  private async generateOpenAIEmbedding(text: string, apiKey: string): Promise<EmbeddingResponse> {
    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: this.config.specificModelId || 'text-embedding-ada-002',
        input: text,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`OpenAI API error: ${error.error?.message || response.statusText}`);
    }

    const data = await response.json();
    return {
      embedding: data.data[0].embedding,
      model: data.model,
      provider: 'openai',
      usage: data.usage,
    };
  }

  private async generateCohereEmbedding(text: string, apiKey: string): Promise<EmbeddingResponse> {
    const response = await fetch('https://api.cohere.ai/v1/embed', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: this.config.specificModelId || 'embed-english-v3.0',
        texts: [text],
        input_type: 'search_document',
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Cohere API error: ${error.message || response.statusText}`);
    }

    const data = await response.json();
    return {
      embedding: data.embeddings[0],
      model: this.config.specificModelId || 'embed-english-v3.0',
      provider: 'cohere',
    };
  }

  private async generateHuggingFaceEmbedding(text: string, apiKey: string): Promise<EmbeddingResponse> {
    const modelId = this.config.specificModelId || 'sentence-transformers/all-MiniLM-L6-v2';
    const response = await fetch(`https://api-inference.huggingface.co/pipeline/feature-extraction/${modelId}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        inputs: text,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Hugging Face API error: ${error || response.statusText}`);
    }

    const embedding = await response.json();
    return {
      embedding: Array.isArray(embedding[0]) ? embedding[0] : embedding,
      model: modelId,
      provider: 'huggingface',
    };
  }

  async storeEmbedding(
    documentId: string,
    chunkId: string,
    embedding: number[],
    metadata: any = {}
  ): Promise<string> {
    const { data, error } = await supabase
      .from('document_embeddings')
      .insert({
        document_id: documentId,
        chunk_id: chunkId,
        embedding_vector: embedding,
        embedding_model: this.config.specificModelId,
        embedding_provider: this.config.provider,
        similarity_threshold: parseFloat(this.config.similarityThreshold),
        metadata: {
          ...metadata,
          ...this.config.embeddingMetadata,
          batch_size: this.config.embeddingBatchSize,
          vector_storage: this.config.vectorStorage,
        },
      })
      .select('id')
      .single();

    if (error) {
      throw new Error(`Failed to store embedding: ${error.message}`);
    }

    return data.id;
  }

  async searchSimilarEmbeddings(
    queryText: string,
    matchCount: number = 10
  ): Promise<any[]> {
    // First generate embedding for the query text
    const queryEmbedding = await this.generateEmbedding(queryText);
    
    // Use the database function to search for similar embeddings
    const { data, error } = await supabase.rpc('search_similar_embeddings', {
      query_embedding: queryEmbedding.embedding,
      similarity_threshold: parseFloat(this.config.similarityThreshold),
      match_count: matchCount,
    });

    if (error) {
      throw new Error(`Failed to search embeddings: ${error.message}`);
    }

    return data || [];
  }

  async getDocumentEmbeddings(documentId: string): Promise<DocumentEmbedding[]> {
    const { data, error } = await supabase
      .from('document_embeddings')
      .select('*')
      .eq('document_id', documentId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch document embeddings: ${error.message}`);
    }

    return data || [];
  }

  async deleteDocumentEmbeddings(documentId: string): Promise<boolean> {
    const { error } = await supabase
      .from('document_embeddings')
      .delete()
      .eq('document_id', documentId);

    if (error) {
      throw new Error(`Failed to delete document embeddings: ${error.message}`);
    }

    return true;
  }
}
