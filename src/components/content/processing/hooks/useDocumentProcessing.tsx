
import { useState, useCallback } from "react";
import { useToast } from "@/components/ui/use-toast";
import { 
  DocumentProcessingService, 
  ProcessingProgress, 
  ProcessingResult,
  ProcessingConfig 
} from "../services/documentProcessingService";

export function useDocumentProcessing() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingProgress, setProcessingProgress] = useState<ProcessingProgress[]>([]);
  const [processingResults, setProcessingResults] = useState<ProcessingResult[]>([]);
  const { toast } = useToast();

  const handleProgressUpdate = useCallback((progress: ProcessingProgress) => {
    setProcessingProgress(prev => {
      const existing = prev.find(p => p.documentId === progress.documentId);
      if (existing) {
        return prev.map(p => p.documentId === progress.documentId ? progress : p);
      } else {
        return [...prev, progress];
      }
    });
  }, []);

  const processDocuments = useCallback(async (
    documentIds: string[],
    config: ProcessingConfig
  ) => {
    if (documentIds.length === 0) {
      toast({
        variant: "destructive",
        title: "No Documents Selected",
        description: "Please select at least one document to process",
      });
      return;
    }

    setIsProcessing(true);
    setProcessingProgress([]);
    setProcessingResults([]);

    try {
      console.log(`Starting processing pipeline for ${documentIds.length} documents`);
      
      const processingService = new DocumentProcessingService(config, handleProgressUpdate);
      const results = await processingService.processDocuments(documentIds);
      
      setProcessingResults(results);
      
      const successCount = results.filter(r => r.success).length;
      const failureCount = results.length - successCount;
      
      if (failureCount === 0) {
        toast({
          title: "Processing Complete",
          description: `Successfully processed ${successCount} document(s)`,
        });
      } else {
        toast({
          variant: failureCount === results.length ? "destructive" : "default",
          title: "Processing Complete",
          description: `${successCount} successful, ${failureCount} failed`,
        });
      }
    } catch (error) {
      console.error("Error during document processing:", error);
      toast({
        variant: "destructive",
        title: "Processing Failed",
        description: error instanceof Error ? error.message : "An error occurred during processing",
      });
    } finally {
      setIsProcessing(false);
    }
  }, [handleProgressUpdate, toast]);

  const clearResults = useCallback(() => {
    setProcessingProgress([]);
    setProcessingResults([]);
  }, []);

  return {
    isProcessing,
    processingProgress,
    processingResults,
    processDocuments,
    clearResults,
  };
}
