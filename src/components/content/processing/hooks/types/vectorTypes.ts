
export interface VectorStats {
  total_embeddings: number;
  unique_documents: number;
  providers: string[];
  models: string[];
}

export interface EmbeddingRecord {
  id: string;
  document_id: string;
  chunk_id: string;
  embedding_model: string;
  embedding_provider: string;
  similarity_threshold: number | null;
  created_at: string;
  vector_dimensions: number;
}

export interface VectorDatabaseState {
  stats: VectorStats | null;
  embeddings: EmbeddingRecord[];
  isLoading: boolean;
  isClearing: boolean;
  isDeleteDialogOpen: boolean;
  isDeleteAllDialogOpen: boolean;
  isDeleteDocumentDialogOpen: boolean;
  selectedDocumentId: string;
}
