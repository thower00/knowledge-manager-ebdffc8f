
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { ChunkingConfig } from "@/types/chunking";
import { X } from "lucide-react";

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
  const [chunks, setChunks] = useState<string[]>([]);
  
  // Simulate loading document and generating preview chunks
  useEffect(() => {
    const loadDocument = async () => {
      // In a real implementation, this would fetch the document content
      setIsLoading(true);
      
      // Simulate API call
      setTimeout(() => {
        // Mock document data
        const mockDoc = {
          id: documentId,
          title: "Sample Document",
          content: `Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nullam euismod, 
          nisi vel consectetur euismod, nisi nisl consectetur nisl, euismod nisi nisl euismod nisl. 
          Nullam euismod, nisi vel consectetur euismod, nisi nisl consectetur nisl, euismod nisi nisl euismod nisl.
          
          Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, 
          quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.
          
          Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. 
          Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.`,
        };
        
        setDocument(mockDoc);
        
        // Generate chunks based on the configuration
        let previewChunks: string[] = [];
        
        switch (config.chunkStrategy) {
          case "fixed_size":
            // Simple fixed size chunking for demo
            const text = mockDoc.content;
            let startIdx = 0;
            
            while (startIdx < text.length) {
              const endIdx = Math.min(startIdx + config.chunkSize, text.length);
              previewChunks.push(text.substring(startIdx, endIdx));
              startIdx = endIdx - config.chunkOverlap;
            }
            break;
            
          case "paragraph":
            // Simple paragraph splitting for demo
            previewChunks = mockDoc.content.split("\n\n").filter(Boolean);
            break;
            
          case "sentence":
            // Simple sentence splitting for demo
            previewChunks = mockDoc.content.match(/[^.!?]+[.!?]+/g) || [];
            break;
            
          case "recursive":
            // For demo, just use fixed size but with different parameters
            const recursiveText = mockDoc.content;
            let recStartIdx = 0;
            
            while (recStartIdx < recursiveText.length) {
              const recEndIdx = Math.min(recStartIdx + config.chunkSize/2, recursiveText.length);
              previewChunks.push(recursiveText.substring(recStartIdx, recEndIdx));
              recStartIdx = recEndIdx - (config.chunkOverlap/2);
            }
            break;
        }
        
        setChunks(previewChunks);
        setIsLoading(false);
      }, 1000);
    };
    
    loadDocument();
  }, [documentId, config]);

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
              <h3 className="font-medium mb-2">{document?.title}</h3>
              <p className="text-sm text-muted-foreground mb-2">Generated {chunks.length} chunks</p>
            </div>
            
            <div className="space-y-3 max-h-80 overflow-y-auto p-1">
              {chunks.map((chunk, index) => (
                <div key={index} className="p-3 border rounded-md hover:bg-accent/10">
                  <div className="flex justify-between items-start mb-2">
                    <Badge variant="outline">Chunk {index + 1}</Badge>
                    <span className="text-xs text-muted-foreground">{chunk.length} chars</span>
                  </div>
                  <p className="text-sm">{chunk}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
      
      <CardFooter className="flex justify-end">
        <Button variant="outline" onClick={onClose}>Close Preview</Button>
      </CardFooter>
    </Card>
  );
}
