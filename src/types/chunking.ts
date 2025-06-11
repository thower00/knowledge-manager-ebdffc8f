
export interface ChunkingConfig {
  chunkSize: number;
  chunkOverlap: number;
  chunkStrategy: "fixed_size" | "paragraph" | "sentence" | "recursive" | "semantic";
  preserveSentences?: boolean;
  minChunkSize?: number;
}

export interface ChunkResult {
  id: string;
  index: number;
  content: string;
  size: number;
  startPosition?: number;
  endPosition?: number;
  metadata?: Record<string, any>;
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

// Update interface for the database response structure to match actual response
export interface DbDocumentChunk {
  id: string;
  document_id: string;
  content: string;
  chunk_index: number;
  start_position?: number;
  end_position?: number;
  metadata?: any; // Changed from Record<string, any> to any to accept Json type
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
      ...(typeof dbChunk.metadata === 'object' && dbChunk.metadata !== null ? dbChunk.metadata : {})
    }
  };
}
