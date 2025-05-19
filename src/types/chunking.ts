
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
    location?: string;
    page?: number;
    [key: string]: any;
  };
  embedding?: number[];
}
