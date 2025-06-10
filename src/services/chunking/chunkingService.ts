
import { ChunkingConfig } from "@/types/chunking";

export interface ChunkResult {
  id: string;
  content: string;
  index: number;
  startPosition?: number;
  endPosition?: number;
  size: number;
}

export class ChunkingService {
  private config: ChunkingConfig;

  constructor(config: ChunkingConfig) {
    this.config = config;
  }

  generateChunks(content: string): string[] {
    console.log(`Starting chunking with strategy: ${this.config.chunkStrategy}, size: ${this.config.chunkSize}, overlap: ${this.config.chunkOverlap}`);
    
    switch (this.config.chunkStrategy) {
      case "fixed_size":
        return this.fixedSizeChunking(content, this.config.chunkSize, this.config.chunkOverlap);
      case "paragraph":
        return this.paragraphChunking(content, this.config.chunkSize);
      case "sentence":
        return this.sentenceChunking(content, this.config.chunkSize);
      case "recursive":
        return this.recursiveChunking(content, this.config.chunkSize, this.config.chunkOverlap);
      case "semantic":
        // For now, fall back to fixed size for semantic chunking
        console.warn("Semantic chunking not fully implemented, using fixed size");
        return this.fixedSizeChunking(content, this.config.chunkSize, this.config.chunkOverlap);
      default:
        return this.fixedSizeChunking(content, this.config.chunkSize, this.config.chunkOverlap);
    }
  }

  generateDetailedChunks(content: string): ChunkResult[] {
    const chunks = this.generateChunks(content);
    return chunks.map((chunk, index) => ({
      id: `chunk_${index}`,
      content: chunk,
      index,
      size: chunk.length
    }));
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
      const sentenceWithPunct = sentence + '.';
      
      if (currentChunk.length + sentenceWithPunct.length <= maxSize) {
        currentChunk += (currentChunk ? ' ' : '') + sentenceWithPunct;
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
}
