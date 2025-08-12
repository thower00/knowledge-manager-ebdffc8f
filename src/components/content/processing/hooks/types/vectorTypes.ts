import { EmbeddingListItem } from "@/types/embedding";

export interface VectorStats {
  total_embeddings: number;
  unique_documents: number;
  providers: string[];
  models: string[];
}

export interface VectorDatabaseState {
  stats: VectorStats | null;
  embeddings: EmbeddingListItem[];
  isLoading: boolean;
  isClearing: boolean;
  isDeleteDialogOpen: boolean;
  isDeleteAllDialogOpen: boolean;
  isDeleteDocumentDialogOpen: boolean;
  selectedDocumentId: string;
}
