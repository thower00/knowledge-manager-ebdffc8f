
import { ChunkingConfig, ChunkResult } from "@/types/chunking";

export class ChunkingService {
  private config: ChunkingConfig;

  constructor(config: ChunkingConfig) {
    this.config = {
      ...config,
      preserveSentences: config.preserveSentences ?? true,
      minChunkSize: config.minChunkSize ?? 50
    };
    console.log('ChunkingService initialized with config:', {
      strategy: this.config.chunkStrategy,
      size: this.config.chunkSize,
      overlap: this.config.chunkOverlap,
      preserveSentences: this.config.preserveSentences,
      minChunkSize: this.config.minChunkSize
    });
  }

  generateChunks(text: string): string[] {
    if (!text || text.trim().length === 0) {
      console.warn('ChunkingService: Empty text provided for chunking');
      return [];
    }

    console.log(`Starting chunking process for text of ${text.length} characters`);
    
    // Clean up the text first
    const cleanedText = this.cleanText(text);
    console.log(`Text cleaned: ${cleanedText.length} characters (${text.length - cleanedText.length} removed)`);
    
    if (cleanedText.length === 0) {
      console.warn('ChunkingService: Text became empty after cleaning');
      return [];
    }

    let chunks: string[];

    switch (this.config.chunkStrategy) {
      case 'sentence':
        chunks = this.chunkBySentence(cleanedText);
        break;
      case 'paragraph':
        chunks = this.chunkByParagraph(cleanedText);
        break;
      case 'fixed_size':
      default:
        chunks = this.chunkByFixedSize(cleanedText);
        break;
    }

    // Filter out chunks that are too small
    const minSize = this.config.minChunkSize || 50;
    const filteredChunks = chunks.filter(chunk => chunk.trim().length >= minSize);
    
    console.log(`Chunking completed: ${chunks.length} initial chunks, ${filteredChunks.length} chunks after filtering (min size: ${minSize})`);
    
    if (filteredChunks.length === 0) {
      console.warn('ChunkingService: No chunks met minimum size requirement');
      // If all chunks are too small, return the original text as a single chunk
      return [cleanedText];
    }

    return filteredChunks;
  }

  generateDetailedChunks(text: string): ChunkResult[] {
    const chunks = this.generateChunks(text);
    let currentPosition = 0;
    
    return chunks.map((chunk, index) => {
      const startPosition = currentPosition;
      const endPosition = startPosition + chunk.length;
      currentPosition = endPosition - (this.config.chunkOverlap || 0);
      
      return {
        id: `chunk-${index}`,
        index,
        content: chunk,
        size: chunk.length,
        startPosition,
        endPosition,
        metadata: {
          strategy: this.config.chunkStrategy,
          chunkSize: this.config.chunkSize,
          overlap: this.config.chunkOverlap || 0
        }
      };
    });
  }

  private cleanText(text: string): string {
    return text
      // Remove excessive whitespace
      .replace(/\s+/g, ' ')
      // Remove page markers that might have been added during extraction
      .replace(/--- Page \d+ ---/g, '')
      .replace(/--- Page \d+ - Error ---/g, '')
      // Remove common PDF artifacts
      .replace(/\u0000/g, '') // Null characters
      .replace(/\uFFFD/g, '') // Replacement characters
      // Normalize line breaks
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      // Remove excessive line breaks
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  private chunkByFixedSize(text: string): string[] {
    const chunks: string[] = [];
    const chunkSize = this.config.chunkSize;
    const overlap = this.config.chunkOverlap || 0;
    
    console.log(`Chunking by fixed size: ${chunkSize} chars with ${overlap} overlap`);

    let start = 0;
    while (start < text.length) {
      let end = start + chunkSize;
      
      // If we're not at the end of the text and preserveSentences is enabled
      if (end < text.length && this.config.preserveSentences) {
        // Try to end at a sentence boundary
        const sentenceEnd = this.findSentenceEnd(text, end);
        if (sentenceEnd > start && sentenceEnd - start < chunkSize * 1.2) {
          end = sentenceEnd;
        }
      }
      
      const chunk = text.slice(start, end).trim();
      if (chunk.length > 0) {
        chunks.push(chunk);
      }
      
      start = Math.max(start + 1, end - overlap);
    }

    return chunks;
  }

  private chunkBySentence(text: string): string[] {
    console.log('Chunking by sentence boundaries');
    
    // Split by sentence-ending punctuation
    const sentences = text.split(/[.!?]+/).map(s => s.trim()).filter(s => s.length > 0);
    const chunks: string[] = [];
    const chunkSize = this.config.chunkSize;
    
    let currentChunk = '';
    
    for (const sentence of sentences) {
      const potentialChunk = currentChunk ? `${currentChunk}. ${sentence}` : sentence;
      
      if (potentialChunk.length <= chunkSize) {
        currentChunk = potentialChunk;
      } else {
        if (currentChunk) {
          chunks.push(currentChunk.trim());
        }
        // If single sentence is longer than chunk size, split it
        if (sentence.length > chunkSize) {
          chunks.push(...this.chunkByFixedSize(sentence));
          currentChunk = '';
        } else {
          currentChunk = sentence;
        }
      }
    }
    
    if (currentChunk) {
      chunks.push(currentChunk.trim());
    }

    return chunks;
  }

  private chunkByParagraph(text: string): string[] {
    console.log('Chunking by paragraph boundaries');
    
    // Split by paragraph breaks
    const paragraphs = text.split(/\n\s*\n/).map(p => p.trim()).filter(p => p.length > 0);
    const chunks: string[] = [];
    const chunkSize = this.config.chunkSize;
    
    let currentChunk = '';
    
    for (const paragraph of paragraphs) {
      const potentialChunk = currentChunk ? `${currentChunk}\n\n${paragraph}` : paragraph;
      
      if (potentialChunk.length <= chunkSize) {
        currentChunk = potentialChunk;
      } else {
        if (currentChunk) {
          chunks.push(currentChunk.trim());
        }
        // If single paragraph is longer than chunk size, split it
        if (paragraph.length > chunkSize) {
          chunks.push(...this.chunkByFixedSize(paragraph));
          currentChunk = '';
        } else {
          currentChunk = paragraph;
        }
      }
    }
    
    if (currentChunk) {
      chunks.push(currentChunk.trim());
    }

    return chunks;
  }

  private findSentenceEnd(text: string, start: number): number {
    // Look for sentence-ending punctuation within a reasonable range
    const searchRange = Math.min(200, text.length - start);
    const searchText = text.slice(start, start + searchRange);
    
    const match = searchText.match(/[.!?]+\s/);
    if (match && match.index !== undefined) {
      return start + match.index + match[0].length;
    }
    
    return start;
  }
}

export { ChunkResult };
