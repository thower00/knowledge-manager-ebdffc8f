
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

// Import ContextSource from the main types file instead of duplicating it
export type { ContextSource } from '../types.ts';
