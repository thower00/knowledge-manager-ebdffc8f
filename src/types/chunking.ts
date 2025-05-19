
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
