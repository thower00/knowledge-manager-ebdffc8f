import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { ChunkingConfig, DocumentChunk, DbDocumentChunk, mapDbChunkToDocumentChunk } from "@/types/chunking";
import { Eye, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface ChunkingPreviewProps {
  documentId: string;
  config: ChunkingConfig;
  onClose: () => void;
}

export function ChunkingPreview({
  documentId,
  config,
  onClose,
}: ChunkingPreviewProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [document, setDocument] = useState<any>(null);
  const [chunks, setChunks] = useState<DocumentChunk[]>([]);
  const [activeChunkIndex, setActiveChunkIndex] = useState<number | null>(null);
  
  // Check if chunks already exist in the database for this document
  useEffect(() => {
    const checkExistingChunks = async () => {
      try {
        // Try to fetch chunks from the document_chunks table
        const { data: existingChunks, error } = await supabase
          .from('document_chunks')
          .select('*')
          .eq('document_id', documentId)
          .order('chunk_index');
          
        if (error) {
          console.error("Error fetching chunks:", error);
        }
        
        // If we found existing chunks, use them
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
          // We still need the document info
          loadDocument(false);
        } else {
          // Otherwise, load the document and generate chunks
          console.log(`No existing chunks found for document ${documentId}, generating new ones`);
          loadDocument(true);
        }
      } catch (err) {
        console.error("Error checking for existing chunks:", err);
        loadDocument(true);
      }
    };
    
    checkExistingChunks();
  }, [documentId, config]);

  // Load document and generate preview chunks
  const loadDocument = async (shouldGenerateChunks: boolean) => {
    setIsLoading(true);
    
    try {
      // Fetch the actual document from the database
      const { data: documentData, error: documentError } = await supabase
        .from('processed_documents')
        .select('id, title, source_id')
        .eq('id', documentId)
        .single();
      
      if (documentError) {
        console.error("Error fetching document:", documentError);
        throw documentError;
      }
      
      if (!documentData) {
        console.error("No document found with id:", documentId);
        throw new Error("Document not found");
      }
      
      // Try to fetch binary content
      const { data: binaryData, error: binaryError } = await supabase
        .from('document_binaries')
        .select('binary_data, content_type')
        .eq('document_id', documentId)
        .maybeSingle();
        
      if (binaryError) {
        console.error("Error fetching document binary:", binaryError);
      }
      
      let documentContent = "";
      
      if (binaryData?.binary_data) {
        try {
          // Try to extract text content from binary data
          documentContent = new TextDecoder().decode(base64ToArrayBuffer(binaryData.binary_data));
          console.log("Successfully decoded document content, length:", documentContent.length);
        } catch (decodeError) {
          console.error("Error decoding binary data:", decodeError);
          documentContent = "Error: Could not decode document content.";
        }
      } else {
        // Fallback to a simpler representation for preview purposes
        documentContent = `This is a placeholder for the document content. In a production environment, this would contain the actual text of "${documentData.title}".`;
      }
      
      // Enrich document data with content
      const enrichedDoc = {
        ...documentData,
        content: documentContent
      };
      
      setDocument(enrichedDoc);
      
      if (shouldGenerateChunks) {
        console.log("Generating chunks with config:", config);
        generateChunks(documentContent);
      }
    } catch (err) {
      console.error("Error in loadDocument:", err);
      // Fallback to mock data
      const mockDoc = {
        id: documentId,
        title: "Document Not Found",
        content: "Could not load document content. Please try again later.",
      };
      setDocument(mockDoc);
      if (shouldGenerateChunks) {
        generateChunks(mockDoc.content);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Helper function to convert base64 to ArrayBuffer
  const base64ToArrayBuffer = (base64: string): ArrayBuffer => {
    const binaryString = window.atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
  };

  // Generate chunks based on configuration
  const generateChunks = (text: string) => {
    const previewChunks: DocumentChunk[] = [];
    
    switch (config.chunkStrategy) {
      case "fixed_size":
        // Simple fixed size chunking
        let startIdx = 0;
        let chunkIndex = 0;
        
        while (startIdx < text.length) {
          const endIdx = Math.min(startIdx + config.chunkSize, text.length);
          previewChunks.push({
            id: `chunk-${documentId}-${chunkIndex}`, // Use a unique ID including document ID
            documentId: documentId,
            content: text.substring(startIdx, endIdx),
            metadata: {
              index: chunkIndex,
              startPosition: startIdx,
              endPosition: endIdx
            }
          });
          startIdx = endIdx - config.chunkOverlap;
          chunkIndex++;
        }
        break;
        
      case "paragraph":
        // Paragraph splitting
        const paragraphs = text.split(/\n\s*\n/).filter(Boolean);
        let paragraphIndex = 0;
        let position = 0;
        
        for (const paragraph of paragraphs) {
          previewChunks.push({
            id: `chunk-${documentId}-${paragraphIndex}`,
            documentId: documentId,
            content: paragraph,
            metadata: {
              index: paragraphIndex,
              startPosition: position,
              endPosition: position + paragraph.length,
              type: 'paragraph'
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
          previewChunks.push({
            id: `chunk-${documentId}-${sentenceIndex}`,
            documentId: documentId,
            content: sentence,
            metadata: {
              index: sentenceIndex,
              startPosition: sentencePosition,
              endPosition: sentencePosition + sentence.length,
              type: 'sentence'
            }
          });
          sentencePosition += sentence.length;
          sentenceIndex++;
        }
        break;
        
      case "recursive":
        // For demo, use a simple recursive approach
        const recursivelyChunk = (text: string, level: number = 0) => {
          if (text.length <= config.chunkSize / 2) {
            return [{
              id: `chunk-${documentId}-r-${previewChunks.length}`,
              documentId: documentId,
              content: text,
              metadata: {
                index: previewChunks.length,
                level,
                size: text.length
              }
            }];
          }
          
          const midpoint = Math.floor(text.length / 2);
          let splitPoint = midpoint;
          
          // Find a better split point near the midpoint (e.g., at a period, comma)
          for (let i = midpoint; i < Math.min(midpoint + 100, text.length); i++) {
            if ('.!?;,'.includes(text[i])) {
              splitPoint = i + 1;
              break;
            }
          }
          
          const firstHalf = text.substring(0, splitPoint);
          const secondHalf = text.substring(splitPoint - config.chunkOverlap);
          
          return [
            ...recursivelyChunk(firstHalf, level + 1),
            ...recursivelyChunk(secondHalf, level + 1)
          ];
        };
        
        previewChunks.push(...recursivelyChunk(text));
        break;
        
      case "semantic":
        // For semantic chunking preview, we'll simulate with paragraphs and add 'semantic score' metadata
        const semanticParagraphs = text.split(/\n\s*\n/).filter(Boolean);
        let semIndex = 0;
        
        for (const paragraph of semanticParagraphs) {
          // Simulate semantic relevance score (would be calculated by an embedding model)
          const simulatedSemanticScore = Math.random().toFixed(2);
          
          previewChunks.push({
            id: `chunk-${documentId}-sem-${semIndex}`,
            documentId: documentId,
            content: paragraph,
            metadata: {
              index: semIndex,
              type: 'semantic',
              semanticScore: simulatedSemanticScore,
              // In real implementation, would include embedding vector
            }
          });
          semIndex++;
        }
        break;
    }
    
    console.log(`Generated ${previewChunks.length} preview chunks using strategy: ${config.chunkStrategy}`);
    setChunks(previewChunks);
    
    // In a real implementation, we would save these chunks to the database
    // saveChunksToDatabase(previewChunks);
  };

  const viewFullDocument = () => {
    const newWindow = window.open('', '_blank');
    if (newWindow) {
      newWindow.document.write(`
        <html>
          <head>
            <title>${document?.title || 'Document Preview'}</title>
            <style>
              body { font-family: system-ui, sans-serif; line-height: 1.5; padding: 2rem; max-width: 800px; margin: 0 auto; }
              h1 { margin-bottom: 2rem; }
              pre { white-space: pre-wrap; }
            </style>
          </head>
          <body>
            <h1>${document?.title || 'Document Preview'}</h1>
            <pre>${document?.content || ''}</pre>
          </body>
        </html>
      `);
      newWindow.document.close();
    }
  };

  return (
    <Card className="relative">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-center">
          <CardTitle className="text-xl">Chunking Preview</CardTitle>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>Strategy: {config.chunkStrategy.replace('_', ' ')}</span>
          <Separator orientation="vertical" className="h-4" />
          <span>Size: {config.chunkSize}</span>
          <Separator orientation="vertical" className="h-4" />
          <span>Overlap: {config.chunkOverlap}</span>
        </div>
      </CardHeader>
      
      <CardContent>
        {isLoading ? (
          <div className="h-60 flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Generating preview...</p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="p-4 border rounded-md bg-muted/30">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-medium">{document?.title || 'Document Preview'}</h3>
                <Button variant="outline" size="sm" onClick={viewFullDocument}>
                  <Eye className="h-4 w-4 mr-2" />
                  View Full Document
                </Button>
              </div>
              <p className="text-sm text-muted-foreground mb-2">Generated {chunks.length} chunks</p>
            </div>
            
            <div className="space-y-3 max-h-80 overflow-y-auto p-1">
              {chunks.length > 0 ? (
                chunks.map((chunk, index) => (
                  <div 
                    key={chunk.id} 
                    className={`p-3 border rounded-md transition-colors ${activeChunkIndex === index ? 'bg-accent/20' : 'hover:bg-accent/10'}`}
                    onClick={() => setActiveChunkIndex(index === activeChunkIndex ? null : index)}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <Badge variant="outline">Chunk {index + 1}</Badge>
                      <span className="text-xs text-muted-foreground">{chunk.content.length} chars</span>
                    </div>
                    <p className="text-sm">{chunk.content}</p>
                    
                    {activeChunkIndex === index && (
                      <div className="mt-3 pt-3 border-t text-xs">
                        <h4 className="font-medium mb-1">Metadata:</h4>
                        <pre className="bg-muted p-2 rounded overflow-x-auto">
                          {JSON.stringify(chunk.metadata, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div className="p-6 text-center border rounded-md text-muted-foreground">
                  No chunks generated. The document may be empty or the chunking strategy may not be applicable to this document.
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
      
      <CardFooter className="flex justify-between">
        <div className="text-sm text-muted-foreground">
          Click on a chunk to view its metadata
        </div>
        <Button variant="outline" onClick={onClose}>Close Preview</Button>
      </CardFooter>
    </Card>
  );
}
