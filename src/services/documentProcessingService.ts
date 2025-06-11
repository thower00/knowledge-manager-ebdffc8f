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
    
    console.log('DocumentProcessingService initialized with config:', {
      chunkStrategy: config.chunking.chunkStrategy,
      chunkSize: config.chunking.chunkSize,
      embeddingProvider: config.embedding.provider,
      embeddingModel: config.embedding.model,
      hasApiKey: !!config.embedding.apiKey
    });
  }

  async processDocuments(documentIds: string[]): Promise<ProcessingResult[]> {
    console.log(`Starting batch processing of ${documentIds.length} documents`);
    const results: ProcessingResult[] = [];
    
    for (const documentId of documentIds) {
      try {
        console.log(`Processing document ${documentId}`);
        
        // Set status to processing at the start
        await this.updateDocumentStatus(documentId, 'processing');
        
        const result = await this.processDocument(documentId);
        results.push(result);
        console.log(`Document ${documentId} processed successfully:`, result);
      } catch (error) {
        console.error(`Error processing document ${documentId}:`, error);
        
        // Update document status to failed
        await this.updateDocumentStatus(documentId, 'failed', error instanceof Error ? error.message : 'Unknown error');
        
        results.push({
          documentId,
          success: false,
          chunksGenerated: 0,
          embeddingsGenerated: 0,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
    
    console.log(`Batch processing completed. Results:`, results);
    return results;
  }

  private async processDocument(documentId: string): Promise<ProcessingResult> {
    console.log(`Starting processing for document ${documentId}`);
    
    // Get document details
    const { data: document, error: docError } = await supabase
      .from('processed_documents')
      .select('*')
      .eq('id', documentId)
      .single();

    if (docError || !document) {
      console.error(`Failed to fetch document ${documentId}:`, docError);
      throw new Error(`Failed to fetch document: ${docError?.message}`);
    }

    const typedDocument = document as ProcessedDocument;
    console.log(`Processing document: ${typedDocument.title}`);
    this.updateProgress(documentId, typedDocument.title, 'extraction', 10);

    // Check if document already has chunks and embeddings (skip extraction if already processed)
    const { count: existingChunks } = await supabase
      .from('document_chunks')
      .select('*', { count: 'exact', head: true })
      .eq('document_id', documentId);

    const { count: existingEmbeddings } = await supabase
      .from('document_embeddings')
      .select('*', { count: 'exact', head: true })
      .eq('document_id', documentId);

    if (existingChunks && existingChunks > 0 && existingEmbeddings && existingEmbeddings > 0) {
      console.log(`Document ${typedDocument.title} already has ${existingChunks} chunks and ${existingEmbeddings} embeddings - updating status to completed`);
      
      // Update status to completed since processing is already done
      await this.updateDocumentStatus(documentId, 'completed');
      this.updateProgress(documentId, typedDocument.title, 'completed', 100, existingChunks, existingEmbeddings);

      return {
        documentId,
        success: true,
        chunksGenerated: existingChunks,
        embeddingsGenerated: existingEmbeddings,
      };
    }

    // Step 1: Extract document content
    let content: string;
    try {
      console.log(`Starting content extraction for ${typedDocument.title}`);
      content = await this.extractDocumentContent(typedDocument);
      
      if (!content || content.trim().length === 0) {
        throw new Error('Extracted content is empty');
      }
      
      console.log(`Content extracted successfully: ${content.length} characters`);
      this.updateProgress(documentId, typedDocument.title, 'extraction', 30);
    } catch (error) {
      console.error(`Content extraction failed for ${typedDocument.title}:`, error);
      await this.updateDocumentStatus(documentId, 'failed', `Content extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw new Error(`Failed to extract content: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    // Step 2: Generate chunks
    try {
      console.log(`Starting chunking for ${typedDocument.title}`);
      this.updateProgress(documentId, typedDocument.title, 'chunking', 40);
      
      const chunks = this.chunkingService.generateChunks(content);
      
      if (!chunks || chunks.length === 0) {
        throw new Error('No chunks were generated from the content');
      }
      
      console.log(`Generated ${chunks.length} chunks for ${typedDocument.title}`);
      this.updateProgress(documentId, typedDocument.title, 'chunking', 60, chunks.length);

      // Step 3: Store chunks in database
      console.log(`Storing ${chunks.length} chunks in database`);
      const chunkIds = await this.storeChunks(documentId, chunks);
      
      if (chunkIds.length !== chunks.length) {
        throw new Error(`Failed to store all chunks. Expected ${chunks.length}, stored ${chunkIds.length}`);
      }
      
      console.log(`Successfully stored ${chunkIds.length} chunks`);
      this.updateProgress(documentId, typedDocument.title, 'embedding', 70, chunks.length);

      // Step 4: Generate embeddings
      console.log(`Starting embedding generation for ${chunks.length} chunks`);
      const embeddingCount = await this.embeddingService.generateEmbeddingsInBatches(
        documentId,
        chunkIds,
        chunks
      );
      
      if (embeddingCount === 0) {
        throw new Error('No embeddings were generated');
      }
      
      console.log(`Generated ${embeddingCount} embeddings`);
      this.updateProgress(documentId, typedDocument.title, 'storage', 90, chunks.length, embeddingCount);

      // Step 5: Update document status to completed
      console.log(`Updating document ${documentId} status to completed`);
      await this.updateDocumentStatus(documentId, 'completed');
      console.log(`Document ${typedDocument.title} processing completed successfully`);
      this.updateProgress(documentId, typedDocument.title, 'completed', 100, chunks.length, embeddingCount);

      return {
        documentId,
        success: true,
        chunksGenerated: chunks.length,
        embeddingsGenerated: embeddingCount,
      };
    } catch (error) {
      console.error(`Processing failed after extraction for ${typedDocument.title}:`, error);
      await this.updateDocumentStatus(documentId, 'failed', error instanceof Error ? error.message : 'Unknown error');
      throw error;
    }
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
          const mappedProgress = 10 + Math.floor((progress / 100) * 20);
          this.updateProgress(document.id, document.title, 'extraction', mappedProgress);
        }
      );

      // Validate extracted content more thoroughly
      if (!extractedContent || extractedContent.trim().length === 0) {
        throw new Error('No content could be extracted from the document');
      }

      // Check for common error patterns
      const errorPatterns = [
        'Unable to extract text',
        'Server-side error',
        'Cannot connect to PDF processing',
        'PDF extraction failed',
        'Service temporarily unavailable',
        'Network connectivity issues'
      ];

      for (const pattern of errorPatterns) {
        if (extractedContent.includes(pattern)) {
          throw new Error(`PDF extraction service failed: Content contains error message - ${pattern}`);
        }
      }

      // Check minimum content length
      if (extractedContent.trim().length < 50) {
        console.warn(`Warning: Extracted content is very short (${extractedContent.length} chars) for ${document.title}`);
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
    const progressInfo = {
      documentId,
      documentTitle,
      stage,
      progress,
      chunksGenerated,
      embeddingsGenerated,
    };
    
    console.log(`Progress update:`, progressInfo);
    
    if (this.onProgress) {
      this.onProgress(progressInfo);
    }
  }

  private async storeChunks(documentId: string, chunks: string[]): Promise<string[]> {
    console.log(`Storing ${chunks.length} chunks for document ${documentId}`);
    
    const chunkRecords = chunks.map((content, index) => ({
      document_id: documentId,
      chunk_index: index,
      content,
      metadata: {
        chunk_size: content.length,
        strategy: this.config.chunking.chunkStrategy,
        chunk_overlap: this.config.chunking.chunkOverlap || 0,
        created_at: new Date().toISOString()
      },
    }));

    const { data, error } = await supabase
      .from('document_chunks')
      .insert(chunkRecords)
      .select('id');

    if (error) {
      console.error('Failed to store chunks:', error);
      throw new Error(`Failed to store chunks: ${error.message}`);
    }

    if (!data || data.length === 0) {
      throw new Error('No chunk IDs returned after insertion');
    }

    console.log(`Successfully stored ${data.length} chunks`);
    return data.map(record => record.id);
  }

  private async updateDocumentStatus(documentId: string, status: string, error?: string): Promise<void> {
    console.log(`Updating document ${documentId} status to: ${status}${error ? ` with error: ${error}` : ''}`);
    
    const updateData: any = { 
      status,
      processed_at: new Date().toISOString(),
    };
    
    if (error) {
      updateData.error = error;
    } else if (status === 'pending') {
      // Clear error when resetting to pending
      updateData.error = null;
      updateData.processed_at = null;
    } else if (status === 'completed') {
      // Ensure error is cleared when completed
      updateData.error = null;
    }
    
    const { error: updateError } = await supabase
      .from('processed_documents')
      .update(updateData)
      .eq('id', documentId);

    if (updateError) {
      console.error(`Failed to update document status:`, updateError);
      throw new Error(`Failed to update document status: ${updateError.message}`);
    }
    
    console.log(`Document ${documentId} status successfully updated to ${status}`);
  }
}
