
import { supabase } from "@/integrations/supabase/client";
import { ProcessedDocument } from "@/types/document";
import { ChunkingConfig } from "@/types/chunking";

export interface ProcessingConfig {
  chunking: ChunkingConfig;
  embedding: {
    provider: "openai" | "cohere" | "huggingface";
    model: string;
    apiKey: string;
    batchSize: number;
  };
}

export interface ProcessingProgress {
  documentId: string;
  documentTitle: string;
  stage: 'extraction' | 'chunking' | 'embedding' | 'storage' | 'completed' | 'failed';
  progress: number; // 0-100
  chunksGenerated?: number;
  embeddingsGenerated?: number;
  error?: string;
}

export interface ProcessingResult {
  documentId: string;
  success: boolean;
  chunksGenerated: number;
  embeddingsGenerated: number;
  error?: string;
}

export class DocumentProcessingService {
  private config: ProcessingConfig;
  private onProgress?: (progress: ProcessingProgress) => void;

  constructor(config: ProcessingConfig, onProgress?: (progress: ProcessingProgress) => void) {
    this.config = config;
    this.onProgress = onProgress;
  }

  async processDocuments(documentIds: string[]): Promise<ProcessingResult[]> {
    const results: ProcessingResult[] = [];
    
    for (const documentId of documentIds) {
      try {
        const result = await this.processDocument(documentId);
        results.push(result);
      } catch (error) {
        console.error(`Error processing document ${documentId}:`, error);
        results.push({
          documentId,
          success: false,
          chunksGenerated: 0,
          embeddingsGenerated: 0,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
    
    return results;
  }

  private async processDocument(documentId: string): Promise<ProcessingResult> {
    // Get document details
    const { data: document, error: docError } = await supabase
      .from('processed_documents')
      .select('*')
      .eq('id', documentId)
      .single();

    if (docError || !document) {
      throw new Error(`Failed to fetch document: ${docError?.message}`);
    }

    this.updateProgress(documentId, document.title, 'extraction', 10);

    // Step 1: Extract document content
    let content: string;
    try {
      content = await this.extractDocumentContent(document);
      this.updateProgress(documentId, document.title, 'extraction', 30);
    } catch (error) {
      throw new Error(`Failed to extract content: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    if (!content || content.trim().length === 0) {
      throw new Error('Document content is empty or unavailable');
    }

    this.updateProgress(documentId, document.title, 'chunking', 40);

    // Step 2: Generate chunks
    const chunks = await this.generateChunks(content, this.config.chunking);
    this.updateProgress(documentId, document.title, 'chunking', 60, chunks.length);

    // Step 3: Store chunks in database
    const chunkIds = await this.storeChunks(documentId, chunks);
    this.updateProgress(documentId, document.title, 'embedding', 70, chunks.length);

    // Step 4: Generate embeddings
    const embeddingCount = await this.generateEmbeddings(documentId, chunkIds, chunks);
    this.updateProgress(documentId, document.title, 'storage', 90, chunks.length, embeddingCount);

    // Step 5: Update document status
    await this.updateDocumentStatus(documentId, 'processed');
    this.updateProgress(documentId, document.title, 'completed', 100, chunks.length, embeddingCount);

    return {
      documentId,
      success: true,
      chunksGenerated: chunks.length,
      embeddingsGenerated: embeddingCount,
    };
  }

  private async extractDocumentContent(document: ProcessedDocument): Promise<string> {
    // For now, we'll use a placeholder content extraction
    // In a real implementation, this would extract text from the document based on its type
    
    if (document.mime_type === 'application/pdf') {
      // For PDFs, we would typically use a PDF extraction service
      // For now, return a placeholder indicating we need content extraction
      throw new Error('PDF content extraction not yet implemented. Please ensure documents have been processed through the extraction pipeline first.');
    } else if (document.mime_type === 'text/plain') {
      // For text files, we could fetch the content directly if available
      // For now, return sample content
      return `Sample content for document: ${document.title}. This is placeholder text that would normally be extracted from the actual document file.`;
    } else if (document.mime_type.startsWith('application/vnd.google-apps.document')) {
      // For Google Docs, we would use the Google Drive API
      return `Sample Google Doc content for: ${document.title}. This would normally be extracted using the Google Drive API.`;
    } else {
      // For other file types, provide a meaningful error
      throw new Error(`Content extraction not supported for file type: ${document.mime_type}`);
    }
  }

  private updateProgress(
    documentId: string,
    documentTitle: string,
    stage: ProcessingProgress['stage'],
    progress: number,
    chunksGenerated?: number,
    embeddingsGenerated?: number
  ) {
    if (this.onProgress) {
      this.onProgress({
        documentId,
        documentTitle,
        stage,
        progress,
        chunksGenerated,
        embeddingsGenerated,
      });
    }
  }

  private async generateChunks(content: string, config: ChunkingConfig): Promise<string[]> {
    // Simple chunking implementation based on strategy
    switch (config.chunkStrategy) {
      case 'fixed_size':
        return this.fixedSizeChunking(content, config.chunkSize, config.chunkOverlap);
      case 'paragraph':
        return this.paragraphChunking(content, config.chunkSize);
      case 'sentence':
        return this.sentenceChunking(content, config.chunkSize);
      case 'recursive':
      default:
        return this.recursiveChunking(content, config.chunkSize, config.chunkOverlap);
    }
  }

  private fixedSizeChunking(content: string, chunkSize: number, overlap: number): string[] {
    const chunks: string[] = [];
    let start = 0;
    
    while (start < content.length) {
      const end = Math.min(start + chunkSize, content.length);
      chunks.push(content.slice(start, end));
      start = end - overlap;
      
      if (start >= content.length) break;
    }
    
    return chunks.filter(chunk => chunk.trim().length > 0);
  }

  private paragraphChunking(content: string, maxSize: number): string[] {
    const paragraphs = content.split(/\n\s*\n/);
    const chunks: string[] = [];
    let currentChunk = '';
    
    for (const paragraph of paragraphs) {
      if (currentChunk.length + paragraph.length <= maxSize) {
        currentChunk += (currentChunk ? '\n\n' : '') + paragraph;
      } else {
        if (currentChunk) chunks.push(currentChunk);
        currentChunk = paragraph;
      }
    }
    
    if (currentChunk) chunks.push(currentChunk);
    return chunks.filter(chunk => chunk.trim().length > 0);
  }

  private sentenceChunking(content: string, maxSize: number): string[] {
    const sentences = content.split(/[.!?]+/).map(s => s.trim()).filter(s => s.length > 0);
    const chunks: string[] = [];
    let currentChunk = '';
    
    for (const sentence of sentences) {
      if (currentChunk.length + sentence.length <= maxSize) {
        currentChunk += (currentChunk ? '. ' : '') + sentence;
      } else {
        if (currentChunk) chunks.push(currentChunk + '.');
        currentChunk = sentence;
      }
    }
    
    if (currentChunk) chunks.push(currentChunk + '.');
    return chunks.filter(chunk => chunk.trim().length > 0);
  }

  private recursiveChunking(content: string, chunkSize: number, overlap: number): string[] {
    // Split by paragraphs first, then sentences, then words if needed
    const separators = ['\n\n', '\n', '. ', ' '];
    return this.recursiveTextSplitter(content, chunkSize, overlap, separators, 0);
  }

  private recursiveTextSplitter(
    text: string,
    chunkSize: number,
    overlap: number,
    separators: string[],
    separatorIndex: number
  ): string[] {
    if (text.length <= chunkSize) {
      return [text];
    }

    if (separatorIndex >= separators.length) {
      // If no separators work, fall back to fixed size
      return this.fixedSizeChunking(text, chunkSize, overlap);
    }

    const separator = separators[separatorIndex];
    const splits = text.split(separator);
    
    if (splits.length === 1) {
      // Current separator doesn't help, try next one
      return this.recursiveTextSplitter(text, chunkSize, overlap, separators, separatorIndex + 1);
    }

    const chunks: string[] = [];
    let currentChunk = '';
    
    for (const split of splits) {
      const potentialChunk = currentChunk + (currentChunk ? separator : '') + split;
      
      if (potentialChunk.length <= chunkSize) {
        currentChunk = potentialChunk;
      } else {
        if (currentChunk) {
          chunks.push(currentChunk);
        }
        
        if (split.length > chunkSize) {
          // Split is too large, recursively split it
          const subChunks = this.recursiveTextSplitter(split, chunkSize, overlap, separators, separatorIndex + 1);
          chunks.push(...subChunks);
          currentChunk = '';
        } else {
          currentChunk = split;
        }
      }
    }
    
    if (currentChunk) {
      chunks.push(currentChunk);
    }
    
    return chunks.filter(chunk => chunk.trim().length > 0);
  }

  private async storeChunks(documentId: string, chunks: string[]): Promise<string[]> {
    const chunkRecords = chunks.map((content, index) => ({
      document_id: documentId,
      chunk_index: index,
      content,
      metadata: {
        chunk_size: content.length,
        strategy: this.config.chunking.chunkStrategy,
      },
    }));

    const { data, error } = await supabase
      .from('document_chunks')
      .insert(chunkRecords)
      .select('id');

    if (error) {
      throw new Error(`Failed to store chunks: ${error.message}`);
    }

    return data.map(record => record.id);
  }

  private async generateEmbeddings(documentId: string, chunkIds: string[], chunks: string[]): Promise<number> {
    let embeddingCount = 0;
    const batchSize = this.config.embedding.batchSize;
    
    for (let i = 0; i < chunks.length; i += batchSize) {
      const batch = chunks.slice(i, i + batchSize);
      const batchChunkIds = chunkIds.slice(i, i + batchSize);
      
      for (let j = 0; j < batch.length; j++) {
        try {
          const embedding = await this.generateSingleEmbedding(batch[j]);
          await this.storeEmbedding(documentId, batchChunkIds[j], embedding);
          embeddingCount++;
        } catch (error) {
          console.error(`Failed to generate embedding for chunk ${batchChunkIds[j]}:`, error);
        }
      }
    }
    
    return embeddingCount;
  }

  private async generateSingleEmbedding(text: string): Promise<number[]> {
    // This is a simplified implementation - in production you'd call the actual embedding API
    // For now, return a mock embedding
    const mockEmbedding = Array.from({ length: 1536 }, () => Math.random() - 0.5);
    return mockEmbedding;
  }

  private async storeEmbedding(documentId: string, chunkId: string, embedding: number[]): Promise<void> {
    const { error } = await supabase
      .from('document_embeddings')
      .insert({
        document_id: documentId,
        chunk_id: chunkId,
        embedding_vector: JSON.stringify(embedding),
        embedding_model: this.config.embedding.model,
        embedding_provider: this.config.embedding.provider,
        metadata: {
          vector_dimension: embedding.length,
        },
      });

    if (error) {
      throw new Error(`Failed to store embedding: ${error.message}`);
    }
  }

  private async updateDocumentStatus(documentId: string, status: string): Promise<void> {
    const { error } = await supabase
      .from('processed_documents')
      .update({ 
        status,
        processed_at: new Date().toISOString(),
      })
      .eq('id', documentId);

    if (error) {
      throw new Error(`Failed to update document status: ${error.message}`);
    }
  }
}
