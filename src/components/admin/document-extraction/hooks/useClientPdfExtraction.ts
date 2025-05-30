
import { useState, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import { ProcessedDocument } from "@/types/document";
import { extractPdfText } from "../utils/enhancedPdfUtils";

/**
 * Hook for client-side PDF text extraction
 */
export const useClientPdfExtraction = () => {
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractedText, setExtractedText] = useState<string>("");
  const [extractionProgress, setExtractionProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const extractTextFromDocument = useCallback(async (document: ProcessedDocument) => {
    if (!document.url) {
      const errorMsg = "Document URL is required for extraction";
      setError(errorMsg);
      toast({
        title: "Extraction Error",
        description: errorMsg,
        variant: "destructive",
      });
      return;
    }

    setIsExtracting(true);
    setExtractedText("");
    setExtractionProgress(0);
    setError(null);

    try {
      console.log("Starting client-side PDF extraction for:", document.title);
      
      const extractedContent = await extractPdfText(
        document.url,
        document.title,
        (progress) => {
          setExtractionProgress(progress);
        }
      );
      
      setExtractedText(extractedContent);
      setExtractionProgress(100);
      
      toast({
        title: "Extraction Completed",
        description: `Successfully extracted text from "${document.title}" using PDF.js`,
      });
      
      return extractedContent;
      
    } catch (error) {
      console.error("Client-side PDF extraction error:", error);
      
      const errorMessage = error instanceof Error ? error.message : "PDF extraction failed";
      setError(errorMessage);
      setExtractedText("");
      
      toast({
        title: "Extraction Failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsExtracting(false);
    }
  }, [toast]);

  const resetExtraction = useCallback(() => {
    setExtractedText("");
    setExtractionProgress(0);
    setError(null);
  }, []);

  return {
    extractTextFromDocument,
    isExtracting,
    extractionProgress,
    extractedText,
    error,
    resetExtraction
  };
};
