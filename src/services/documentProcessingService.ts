
import { supabase } from "@/integrations/supabase/client";
import { ProcessedDocument } from "@/types/document";
import { ChunkingConfig } from "@/types/chunking";
import { TextExtractionService } from "./extraction/textExtractionService";
import { ChunkingService } from "./chunking/chunkingService";
import { EmbeddingService, EmbeddingConfig } from "./embedding/embeddingService";

export interface ProcessingConfig {
  chunking: ChunkingConfig;
  embedding: EmbeddingConfig;
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
  private textExtractionService: TextExtractionService;
  private chunkingService: ChunkingService;
  private embeddingService: EmbeddingService;

  constructor(config: ProcessingConfig, onProgress?: (progress: ProcessingProgress) => void) {
    this.config = config;
    this.onProgress = onProgress;
    this.textExtractionService = new TextExtractionService();
    this.chunkingService = new ChunkingService(config.chunking);
    this.embeddingService = new EmbeddingService(config.embedding);
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

    const typedDocument = document as ProcessedDocument;
    this.updateProgress(documentId, typedDocument.title, 'extraction', 10);

    // Step 1: Extract document content using shared extraction service
    let content: string;
    try {
      content = await this.extractDocumentContent(typedDocument);
      this.updateProgress(documentId, typedDocument.title, 'extraction', 30);
    } catch (error) {
      throw new Error(`Failed to extract content: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    if (!content || content.trim().length === 0) {
      throw new Error('Document content is empty or unavailable');
    }

    this.updateProgress(documentId, typedDocument.title, 'chunking', 40);

    // Step 2: Generate chunks using shared chunking service
    const chunks = this.chunkingService.generateChunks(content);
    this.updateProgress(documentId, typedDocument.title, 'chunking', 60, chunks.length);

    // Step 3: Store chunks in database
    const chunkIds = await this.storeChunks(documentId, chunks);
    this.updateProgress(documentId, typedDocument.title, 'embedding', 70, chunks.length);

    // Step 4: Generate embeddings using shared embedding service
    const embeddingCount = await this.embeddingService.generateEmbeddingsInBatches(
      documentId,
      chunkIds,
      chunks
    );
    this.updateProgress(documentId, typedDocument.title, 'storage', 90, chunks.length, embeddingCount);

    // Step 5: Update document status
    await this.updateDocumentStatus(documentId, 'processed');
    this.updateProgress(documentId, typedDocument.title, 'completed', 100, chunks.length, embeddingCount);

    return {
      documentId,
      success: true,
      chunksGenerated: chunks.length,
      embeddingsGenerated: embeddingCount,
    };
  }

  private async extractDocumentContent(document: ProcessedDocument): Promise<string> {
    if (!document.url) {
      throw new Error('Document URL is required for content extraction');
    }

    try {
      console.log(`Extracting content from document: ${document.title}`);
      
      const extractedContent = await this.textExtractionService.extractFromUrl(
        document.url,
        document.title,
        {
          forceTextMode: true,
          disableBinaryOutput: true,
          strictTextCleaning: true,
          useAdvancedExtraction: true,
          useTextPatternExtraction: true,
          timeout: 60
        },
        (progress) => {
          // Map extraction progress to our 10-30% range
          const mappedProgress = 10 + Math.floor((progress / 100) * 20);
          this.updateProgress(document.id, document.title, 'extraction', mappedProgress);
        }
      );

      if (!extractedContent || extractedContent.trim().length === 0) {
        throw new Error('No content could be extracted from the document');
      }

      console.log(`Successfully extracted ${extractedContent.length} characters from ${document.title}`);
      return extractedContent;
      
    } catch (error) {
      console.error('Error extracting document content:', error);
      throw new Error(`Content extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
