
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { ProcessedDocument } from "@/types/document";

export function useChunkingProcessor(documents: ProcessedDocument[]) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [chunkingResults, setChunkingResults] = useState<any[]>([]);
  const { toast } = useToast();

  const handleProcessChunking = async (selectedDocuments: string[]) => {
    if (selectedDocuments.length === 0) {
      toast({
        variant: "destructive",
        title: "No Documents Selected",
        description: "Please select at least one document to chunk",
      });
      return;
    }

    setIsProcessing(true);
    
    try {
      // This would call an API to perform the actual chunking
      // For now, we'll simulate the process
      console.log(`Processing ${selectedDocuments.length} documents for chunking`);
      
      // Simulate API call with delay
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Generate mock results
      const results = selectedDocuments.map(docId => {
        const doc = documents.find(d => d.id === docId);
        return {
          documentId: docId,
          documentTitle: doc?.title || "Unknown document",
          chunkCount: Math.floor(Math.random() * 10) + 5,
          success: true,
        };
      });
      
      setChunkingResults(results);
      
      toast({
        title: "Chunking Complete",
        description: `Successfully chunked ${results.length} document(s)`,
      });
    } catch (err) {
      console.error("Error chunking documents:", err);
      toast({
        variant: "destructive",
        title: "Chunking Failed",
        description: "An error occurred while chunking documents",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return {
    isProcessing,
    chunkingResults,
    handleProcessChunking
  };
}
