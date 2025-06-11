import { supabase } from "@/integrations/supabase/client";

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
  similarity_threshold: number | null;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface EmbeddingConfig {
  provider: "openai" | "cohere" | "huggingface";
  model: string;
  apiKey: string;
  batchSize: number;
  similarityThreshold: string;
  embeddingMetadata?: Record<string, any>;
  vectorStorage?: string;
}

export class EmbeddingService {
  private config: EmbeddingConfig;

  constructor(config: EmbeddingConfig) {
    this.config = config;
    console.log('EmbeddingService initialized:', {
      provider: config.provider,
      model: config.model,
      batchSize: config.batchSize,
      hasApiKey: !!config.apiKey,
      similarityThreshold: config.similarityThreshold
    });
    
    this.validateConfig();
  }

  private validateConfig(): void {
    if (!this.config.apiKey) {
      throw new Error(`No API key provided for ${this.config.provider} embedding provider`);
    }
    
    if (!this.config.model) {
      throw new Error(`No model specified for ${this.config.provider} embedding provider`);
    }
    
    if (this.config.batchSize <= 0) {
      throw new Error('Batch size must be greater than 0');
    }
    
    console.log('EmbeddingService configuration validated successfully');
  }

  async generateEmbedding(text: string): Promise<EmbeddingResponse> {
    if (!text || text.trim().length === 0) {
      throw new Error('Text content cannot be empty for embedding generation');
    }

    console.log(`Generating embedding for text (${text.length} chars) using ${this.config.provider}/${this.config.model}`);

    switch (this.config.provider) {
      case 'openai':
        return this.generateOpenAIEmbedding(text, this.config.apiKey);
      case 'cohere':
        return this.generateCohereEmbedding(text, this.config.apiKey);
      case 'huggingface':
        return this.generateHuggingFaceEmbedding(text, this.config.apiKey);
      default:
        throw new Error(`Unsupported embedding provider: ${this.config.provider}`);
    }
  }

  private async generateOpenAIEmbedding(text: string, apiKey: string): Promise<EmbeddingResponse> {
    console.log(`Calling OpenAI API for embedding generation`);
    
    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: this.config.model || 'text-embedding-ada-002',
        input: text,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error:', errorText);
      throw new Error(`OpenAI API error: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    
    if (!data.data || !data.data[0] || !data.data[0].embedding) {
      throw new Error('Invalid response format from OpenAI API');
    }

    console.log(`OpenAI embedding generated successfully (${data.data[0].embedding.length} dimensions)`);
    
    return {
      embedding: data.data[0].embedding,
      model: data.model,
      provider: 'openai',
      usage: data.usage,
    };
  }

  private async generateCohereEmbedding(text: string, apiKey: string): Promise<EmbeddingResponse> {
    console.log(`Calling Cohere API for embedding generation`);
    
    const response = await fetch('https://api.cohere.ai/v1/embed', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: this.config.model || 'embed-english-v3.0',
        texts: [text],
        input_type: 'search_document',
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Cohere API error:', errorText);
      throw new Error(`Cohere API error: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    
    if (!data.embeddings || !data.embeddings[0]) {
      throw new Error('Invalid response format from Cohere API');
    }

    console.log(`Cohere embedding generated successfully (${data.embeddings[0].length} dimensions)`);

    return {
      embedding: data.embeddings[0],
      model: this.config.model || 'embed-english-v3.0',
      provider: 'cohere',
    };
  }

  private async generateHuggingFaceEmbedding(text: string, apiKey: string): Promise<EmbeddingResponse> {
    console.log(`Calling Hugging Face API for embedding generation`);
    
    const modelId = this.config.model || 'sentence-transformers/all-MiniLM-L6-v2';
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
      const errorText = await response.text();
      console.error('Hugging Face API error:', errorText);
      throw new Error(`Hugging Face API error: ${response.status} ${errorText}`);
    }

    const embedding = await response.json();
    const finalEmbedding = Array.isArray(embedding[0]) ? embedding[0] : embedding;
    
    console.log(`Hugging Face embedding generated successfully (${finalEmbedding.length} dimensions)`);

    return {
      embedding: finalEmbedding,
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
    console.log(`Storing embedding for chunk ${chunkId}`);
    
    if (!embedding || embedding.length === 0) {
      throw new Error('Embedding vector cannot be empty');
    }

    const { data, error } = await supabase
      .from('document_embeddings')
      .insert({
        document_id: documentId,
        chunk_id: chunkId,
        embedding_vector: JSON.stringify(embedding),
        embedding_model: this.config.model,
        embedding_provider: this.config.provider,
        similarity_threshold: parseFloat(this.config.similarityThreshold),
        metadata: {
          ...metadata,
          ...this.config.embeddingMetadata,
          batch_size: this.config.batchSize,
          vector_storage: this.config.vectorStorage,
          embedding_dimensions: embedding.length,
          created_at: new Date().toISOString()
        },
      })
      .select('id')
      .single();

    if (error) {
      console.error('Failed to store embedding:', error);
      throw new Error(`Failed to store embedding: ${error.message}`);
    }

    if (!data || !data.id) {
      throw new Error('No embedding ID returned after insertion');
    }

    console.log(`Embedding stored successfully with ID: ${data.id}`);
    return data.id;
  }

  async searchSimilarEmbeddings(
    queryText: string,
    matchCount: number = 10
  ): Promise<any[]> {
    const queryEmbedding = await this.generateEmbedding(queryText);
    
    const { data, error } = await supabase.rpc('search_similar_embeddings', {
      query_embedding: JSON.stringify(queryEmbedding.embedding),
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

    return (data || []).map(item => ({
      id: item.id,
      document_id: item.document_id,
      chunk_id: item.chunk_id,
      embedding_vector: typeof item.embedding_vector === 'string' 
        ? JSON.parse(item.embedding_vector) 
        : item.embedding_vector,
      embedding_model: item.embedding_model,
      embedding_provider: item.embedding_provider,
      similarity_threshold: item.similarity_threshold,
      metadata: item.metadata as Record<string, any> || {},
      created_at: item.created_at,
      updated_at: item.updated_at,
    }));
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

  async generateEmbeddingsInBatches(
    documentId: string,
    chunkIds: string[],
    chunks: string[]
  ): Promise<number> {
    console.log(`Starting batch embedding generation for ${chunks.length} chunks`);
    
    if (chunks.length !== chunkIds.length) {
      throw new Error(`Chunk count mismatch: ${chunks.length} chunks vs ${chunkIds.length} chunk IDs`);
    }

    let embeddingCount = 0;
    const batchSize = this.config.batchSize;
    
    for (let i = 0; i < chunks.length; i += batchSize) {
      const batch = chunks.slice(i, i + batchSize);
      const batchChunkIds = chunkIds.slice(i, i + batchSize);
      
      console.log(`Processing embedding batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(chunks.length / batchSize)} (${batch.length} items)`);
      
      for (let j = 0; j < batch.length; j++) {
        try {
          const chunkText = batch[j];
          const chunkId = batchChunkIds[j];
          
          if (!chunkText || chunkText.trim().length === 0) {
            console.warn(`Skipping empty chunk ${chunkId}`);
            continue;
          }
          
          console.log(`Generating embedding for chunk ${j + 1}/${batch.length} (${chunkText.length} chars)`);
          
          const embedding = await this.generateEmbedding(chunkText);
          await this.storeEmbedding(documentId, chunkId, embedding.embedding, {
            batch_index: Math.floor(i / batchSize),
            chunk_index_in_batch: j,
            chunk_length: chunkText.length
          });
          
          embeddingCount++;
          console.log(`Successfully processed chunk ${embeddingCount}/${chunks.length}`);
          
        } catch (error) {
          console.error(`Failed to generate embedding for chunk ${batchChunkIds[j]}:`, error);
          // Continue with other chunks rather than failing completely
        }
      }
      
      // Add a small delay between batches to avoid rate limiting
      if (i + batchSize < chunks.length) {
        console.log('Waiting 100ms before next batch...');
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    console.log(`Batch embedding generation completed. Generated ${embeddingCount} embeddings out of ${chunks.length} chunks`);
    return embeddingCount;
  }
}
