
export interface ChunkingConfig {
  chunkSize: number;
  chunkOverlap: number;
  chunkStrategy: "fixed_size" | "paragraph" | "sentence" | "recursive";
}

export interface DocumentChunk {
  id: string;
  documentId: string;
  content: string;
  metadata: {
    index: number;
    startPosition?: number;
    endPosition?: number;
    location?: string;
    page?: number;
    level?: number;
    type?: string;
    size?: number;
    [key: string]: any;
  };
  embedding?: number[];
}

// Add interface for the database response structure
export interface DbDocumentChunk {
  id: string;
  document_id: string;
  content: string;
  chunk_index: number;
  start_position?: number;
  end_position?: number;
  metadata?: Record<string, any>;
  created_at: string;
}

// Mapper function to convert from DB format to our app format
export function mapDbChunkToDocumentChunk(dbChunk: DbDocumentChunk): DocumentChunk {
  return {
    id: dbChunk.id,
    documentId: dbChunk.document_id,
    content: dbChunk.content,
    metadata: {
      index: dbChunk.chunk_index,
      startPosition: dbChunk.start_position,
      endPosition: dbChunk.end_position,
      ...(dbChunk.metadata || {})
    }
  };
}
