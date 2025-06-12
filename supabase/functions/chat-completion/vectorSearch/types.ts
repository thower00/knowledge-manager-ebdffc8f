
export interface ContextSource {
  document_title: string;
  chunk_content: string;
  similarity?: number;
  document_id?: string;
  document_url?: string;
}

export interface VectorSearchResult {
  contextText: string;
  relevantDocs: ContextSource[];
  searchDuration?: number;
}

export interface DocumentInfo {
  id: string;
  title: string;
  url: string;
  status: string;
  processed_at: string;
  mime_type: string;
  chunksCount: number;
  embeddingsCount: number;
}
