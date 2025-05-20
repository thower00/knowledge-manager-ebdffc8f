
import { useState, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import { ProcessedDocument } from "@/types/document";
import { extractPdfText } from "../utils/pdfUtils";
import { fetchDocumentViaProxy } from "../services/documentFetchService";

/**
 * Hook for handling document text extraction logic
 */
export const useTextExtraction = () => {
  const [selectedDocumentId, setSelectedDocumentId] = useState<string>("");
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractedText, setExtractedText] = useState<string>("");
  const [extractionProgress, setExtractionProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  // Extract text from a PDF document
  const extractTextFromDocument = async (documentId: string, documents?: ProcessedDocument[]) => {
    if (!documentId) {
      toast({
        title: "No document selected",
        description: "Please select a document to extract text from",
        variant: "destructive",
      });
      return;
    }

    setIsExtracting(true);
    setExtractedText("");
    setExtractionProgress(0);
    setError(null);

    try {
      // Get the selected document to retrieve its URL
      const selectedDocument = documents?.find(doc => doc.id === documentId);
      
      if (!selectedDocument || !selectedDocument.url) {
        throw new Error("Document URL not found");
      }
      
      console.log("Starting extraction for document:", selectedDocument.title);
      
      // Set initial progress
      setExtractionProgress(5);
      
      // Fetch document via proxy
      console.log("Fetching document via proxy:", selectedDocument.url);
      setExtractionProgress(10);
      
      const documentData = await fetchDocumentViaProxy(
        selectedDocument.url, 
        selectedDocument.title
      );
      setExtractionProgress(30);
      
      // Extract text from the PDF data
      const extractedContent = await extractPdfText(documentData, progress => {
        // Map progress to our 30-95% range
        const mappedProgress = 30 + Math.floor((progress / 100) * 65);
        setExtractionProgress(mappedProgress);
      });
      
      // Successful extraction
      setExtractedText(extractedContent);
      setExtractionProgress(100);
      toast({
        title: "Text extraction completed",
        description: `Successfully extracted text from "${selectedDocument.title}"`,
      });
      
    } catch (error) {
      console.error("Error in extraction process:", error);
      
      let errorMessage = "Failed to extract text from the document";
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      setError(errorMessage);
      setExtractedText("");
      toast({
        title: "Extraction failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsExtracting(false);
    }
  };

  // Retry the extraction
  const retryExtraction = useCallback(() => {
    if (selectedDocumentId) {
      extractTextFromDocument(selectedDocumentId);
    }
  }, [selectedDocumentId]);

  return {
    selectedDocumentId,
    setSelectedDocumentId,
    extractTextFromDocument,
    isExtracting,
    extractionProgress,
    extractedText,
    error,
    retryExtraction
  };
};
