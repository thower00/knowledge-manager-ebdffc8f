
import { supabase } from "@/integrations/supabase/client";
import { VectorStats } from "../types/vectorTypes";
import { EmbeddingListItem } from "@/types/embedding";

export class VectorDatabaseService {
  static async loadStats(): Promise<VectorStats> {
    const { data, error } = await supabase
      .from('document_embeddings')
      .select('document_id, embedding_provider, embedding_model');
    
    if (error) throw error;
    
    const uniqueDocuments = new Set(data?.map(item => item.document_id) || []).size;
    const providers = [...new Set(data?.map(item => item.embedding_provider) || [])];
    const models = [...new Set(data?.map(item => item.embedding_model) || [])];

    return {
      total_embeddings: data?.length || 0,
      unique_documents: uniqueDocuments,
      providers,
      models,
    };
  }

  static async loadEmbeddings(): Promise<EmbeddingListItem[]> {
    const { data, error } = await supabase
      .from('document_embeddings')
      .select('id, document_id, chunk_id, embedding_model, embedding_provider, similarity_threshold, created_at')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    
    // Transform the data to match EmbeddingListItem interface
    return (data || []).map(item => ({
      ...item,
      vector_dimensions: 0,
    }));
  }

  static async clearAllEmbeddings(): Promise<void> {
    const { error } = await supabase
      .from('document_embeddings')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all records
    
    if (error) throw error;
  }

  static async clearDocumentEmbeddings(documentId: string): Promise<void> {
    const { error } = await supabase
      .from('document_embeddings')
      .delete()
      .eq('document_id', documentId);
    
    if (error) throw error;
  }
}
