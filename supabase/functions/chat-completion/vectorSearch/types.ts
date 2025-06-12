
import { ContextSource } from '../types.ts'

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

export { ContextSource }
