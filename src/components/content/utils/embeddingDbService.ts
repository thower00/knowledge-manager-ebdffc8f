
import { supabase } from "@/integrations/supabase/client";
import { EmbeddingVector, SimilaritySearchResult } from "@/types/embedding";

/**
 * Service for managing document embeddings in the database
 */
export class EmbeddingDbService {
  /**
   * Store an embedding vector in the database
   */
  static async storeEmbedding(
    documentId: string,
    chunkId: string,
    embedding: number[],
    model: string,
    provider: string,
    metadata: any = {}
  ): Promise<string> {
    try {
      const { data, error } = await supabase
        .from('document_embeddings')
        .insert({
          document_id: documentId,
          chunk_id: chunkId,
          embedding_vector: JSON.stringify(embedding), // Convert array to string
          embedding_model: model,
          embedding_provider: provider,
          metadata,
        })
        .select('id')
        .single();

      if (error) {
        throw new Error(`Failed to store embedding: ${error.message}`);
      }

      return data.id;
    } catch (error) {
      console.error('Error storing embedding:', error);
      throw error;
    }
  }

  /**
   * Get all embeddings for a document
   */
  static async getDocumentEmbeddings(documentId: string): Promise<EmbeddingVector[]> {
    try {
      const { data, error } = await supabase
        .from('document_embeddings')
        .select('*')
        .eq('document_id', documentId)
        .order('created_at', { ascending: false });

      if (error) {
        throw new Error(`Failed to fetch embeddings: ${error.message}`);
      }

      // Convert embedding_vector string back to number array and ensure proper typing
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
    } catch (error) {
      console.error('Error fetching document embeddings:', error);
      throw error;
    }
  }

  /**
   * Search for similar embeddings using the database function
   */
  static async searchSimilarEmbeddings(
    queryEmbedding: number[],
    similarityThreshold: number = 0.7,
    maxResults: number = 10
  ): Promise<SimilaritySearchResult[]> {
    try {
      const { data, error } = await supabase.rpc('search_similar_embeddings', {
        query_embedding: JSON.stringify(queryEmbedding), // Convert array to string
        similarity_threshold: similarityThreshold,
        match_count: maxResults,
      });

      if (error) {
        throw new Error(`Failed to search embeddings: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      console.error('Error searching similar embeddings:', error);
      throw error;
    }
  }

  /**
   * Delete all embeddings for a document
   */
  static async deleteDocumentEmbeddings(documentId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('document_embeddings')
        .delete()
        .eq('document_id', documentId);

      if (error) {
        throw new Error(`Failed to delete embeddings: ${error.message}`);
      }

      return true;
    } catch (error) {
      console.error('Error deleting document embeddings:', error);
      throw error;
    }
  }

  /**
   * Get embedding statistics
   */
  static async getEmbeddingStats(): Promise<{
    total_embeddings: number;
    unique_documents: number;
    providers: string[];
    models: string[];
  }> {
    try {
      const { data, error } = await supabase
        .from('document_embeddings')
        .select('document_id, embedding_provider, embedding_model');

      if (error) {
        throw new Error(`Failed to fetch embedding stats: ${error.message}`);
      }

      const uniqueDocuments = new Set(data.map(item => item.document_id)).size;
      const providers = [...new Set(data.map(item => item.embedding_provider))];
      const models = [...new Set(data.map(item => item.embedding_model))];

      return {
        total_embeddings: data.length,
        unique_documents: uniqueDocuments,
        providers,
        models,
      };
    } catch (error) {
      console.error('Error fetching embedding stats:', error);
      throw error;
    }
  }

  /**
   * Clear all embeddings from the database
   */
  static async clearAllEmbeddings(): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('document_embeddings')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all records

      if (error) {
        throw new Error(`Failed to clear all embeddings: ${error.message}`);
      }

      return true;
    } catch (error) {
      console.error('Error clearing all embeddings:', error);
      throw error;
    }
  }

  /**
   * Get embedding count by provider
   */
  static async getEmbeddingCountByProvider(): Promise<Record<string, number>> {
    try {
      const { data, error } = await supabase
        .from('document_embeddings')
        .select('embedding_provider');

      if (error) {
        throw new Error(`Failed to fetch embedding providers: ${error.message}`);
      }

      const counts: Record<string, number> = {};
      data.forEach(item => {
        counts[item.embedding_provider] = (counts[item.embedding_provider] || 0) + 1;
      });

      return counts;
    } catch (error) {
      console.error('Error fetching embedding count by provider:', error);
      throw error;
    }
  }
}
