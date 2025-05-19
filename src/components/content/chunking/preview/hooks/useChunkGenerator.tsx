import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ChunkingConfig, DocumentChunk, DbDocumentChunk, mapDbChunkToDocumentChunk } from "@/types/chunking";

export function useChunkGenerator(documentId: string, config: ChunkingConfig, documentContent?: string) {
  const [chunks, setChunks] = useState<DocumentChunk[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!documentId) return;
    
    const loadChunks = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        // First check if chunks already exist for this document
        const { data: existingChunks, error } = await supabase
          .from('document_chunks')
          .select('*')
          .eq('document_id', documentId)
          .order('chunk_index');
          
        if (error) {
          throw error;
        }
        
        // If chunks exist, use them
        if (existingChunks && existingChunks.length > 0) {
          console.log(`Found ${existingChunks.length} existing chunks for document ${documentId}`);
          
          // Map database chunks to our app's DocumentChunk format
          const mappedChunks = existingChunks.map((chunk: any) => {
            // Ensure chunk follows DbDocumentChunk structure before mapping
            const typedChunk: DbDocumentChunk = {
              id: chunk.id,
              document_id: chunk.document_id,
              content: chunk.content,
              chunk_index: chunk.chunk_index,
              start_position: chunk.start_position,
              end_position: chunk.end_position,
              metadata: chunk.metadata,
              created_at: chunk.created_at
            };
            return mapDbChunkToDocumentChunk(typedChunk);
          });
          
          setChunks(mappedChunks);
        } 
        // Otherwise, generate chunks if we have content
        else if (documentContent) {
          console.log(`No existing chunks found for document ${documentId}, generating from content`);
          const generatedChunks = generateChunksFromText(documentContent, documentId, config);
          setChunks(generatedChunks);
        } 
        // No content and no existing chunks
        else {
          console.log("No content available to generate chunks");
          setChunks([]);
        }
      } catch (err) {
        console.error("Error loading chunks:", err);
        setError(err instanceof Error ? err : new Error(String(err)));
      } finally {
        setIsLoading(false);
      }
    };
    
    loadChunks();
  }, [documentId, config, documentContent]);

  // Function to generate chunks from text
  const generateChunksFromText = (text: string, docId: string, chunkingConfig: ChunkingConfig): DocumentChunk[] => {
    console.log(`Generating chunks using strategy: ${chunkingConfig.chunkStrategy}`);
    console.log(`Text length: ${text.length}, Chunk size: ${chunkingConfig.chunkSize}, Overlap: ${chunkingConfig.chunkOverlap}`);
    
    if (!text || text.length === 0) {
      console.warn("Empty text provided for chunking");
      return [];
    }
    
    const generatedChunks: DocumentChunk[] = [];
    
    switch (chunkingConfig.chunkStrategy) {
      case "fixed_size":
        // Simple fixed size chunking
        let startIdx = 0;
        let chunkIndex = 0;
        
        while (startIdx < text.length) {
          const endIdx = Math.min(startIdx + chunkingConfig.chunkSize, text.length);
          const chunkContent = text.substring(startIdx, endIdx);
          
          generatedChunks.push({
            id: `chunk-${docId}-${chunkIndex}`, 
            documentId: docId,
            content: chunkContent,
            metadata: {
              index: chunkIndex,
              startPosition: startIdx,
              endPosition: endIdx,
              strategy: "fixed_size"
            }
          });
          startIdx = endIdx - chunkingConfig.chunkOverlap;
          chunkIndex++;
        }
        break;
        
      case "paragraph":
        // Paragraph splitting
        const paragraphs = text.split(/\n\s*\n/).filter(Boolean);
        let paragraphIndex = 0;
        let position = 0;
        
        for (const paragraph of paragraphs) {
          generatedChunks.push({
            id: `chunk-${docId}-${paragraphIndex}`,
            documentId: docId,
            content: paragraph,
            metadata: {
              index: paragraphIndex,
              startPosition: position,
              endPosition: position + paragraph.length,
              type: 'paragraph',
              strategy: "paragraph"
            }
          });
          position += paragraph.length + 2; // +2 for the newline characters
          paragraphIndex++;
        }
        break;
        
      case "sentence":
        // Sentence splitting
        const sentences = text.match(/[^.!?]+[.!?]+/g) || [];
        let sentenceIndex = 0;
        let sentencePosition = 0;
        
        for (const sentence of sentences) {
          generatedChunks.push({
            id: `chunk-${docId}-${sentenceIndex}`,
            documentId: docId,
            content: sentence,
            metadata: {
              index: sentenceIndex,
              startPosition: sentencePosition,
              endPosition: sentencePosition + sentence.length,
              type: 'sentence',
              strategy: "sentence"
            }
          });
          sentencePosition += sentence.length;
          sentenceIndex++;
        }
        break;
        
      case "recursive":
        // For demo, use a simple recursive approach
        const recursivelyChunk = (content: string, level: number = 0) => {
          if (content.length <= chunkingConfig.chunkSize / 2) {
            return [{
              id: `chunk-${docId}-r-${generatedChunks.length}`,
              documentId: docId,
              content: content,
              metadata: {
                index: generatedChunks.length,
                level,
                size: content.length,
                strategy: "recursive"
              }
            }];
          }
          
          const midpoint = Math.floor(content.length / 2);
          let splitPoint = midpoint;
          
          // Find a better split point near the midpoint (e.g., at a period, comma)
          for (let i = midpoint; i < Math.min(midpoint + 100, content.length); i++) {
            if ('.!?;,'.includes(content[i])) {
              splitPoint = i + 1;
              break;
            }
          }
          
          const firstHalf = content.substring(0, splitPoint);
          const secondHalf = content.substring(splitPoint - chunkingConfig.chunkOverlap);
          
          return [
            ...recursivelyChunk(firstHalf, level + 1),
            ...recursivelyChunk(secondHalf, level + 1)
          ];
        };
        
        generatedChunks.push(...recursivelyChunk(text));
        break;
        
      case "semantic":
        // For semantic chunking preview, we'll simulate with paragraphs and add 'semantic score' metadata
        const semanticParagraphs = text.split(/\n\s*\n/).filter(Boolean);
        let semIndex = 0;
        
        for (const paragraph of semanticParagraphs) {
          // Simulate semantic relevance score (would be calculated by an embedding model)
          const simulatedSemanticScore = Math.random().toFixed(2);
          
          generatedChunks.push({
            id: `chunk-${docId}-sem-${semIndex}`,
            documentId: docId,
            content: paragraph,
            metadata: {
              index: semIndex,
              type: 'semantic',
              semanticScore: simulatedSemanticScore,
              strategy: "semantic"
              // In real implementation, would include embedding vector
            }
          });
          semIndex++;
        }
        break;
    }
    
    console.log(`Generated ${generatedChunks.length} chunks using strategy: ${chunkingConfig.chunkStrategy}`);
    return generatedChunks;
  };

  return {
    chunks,
    isLoading,
    error
  };
}
