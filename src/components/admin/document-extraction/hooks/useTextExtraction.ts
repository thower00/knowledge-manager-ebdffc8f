
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
      
      try {
        const documentData = await fetchDocumentViaProxy(
          selectedDocument.url, 
          selectedDocument.title
        );
        setExtractionProgress(30);
        
        try {
          // Extract text from the PDF data
          const extractedContent = await extractPdfText(documentData, setExtractionProgress);
          
          setTimeout(() => {
            setExtractedText(extractedContent);
            setExtractionProgress(100);
            toast({
              title: "Text extraction completed",
              description: `Successfully extracted text from "${selectedDocument.title}"`,
            });
          }, 500);
        } catch (pdfError) {
          console.error("Error extracting text from PDF:", pdfError);
          throw pdfError; // Propagate PDF-specific errors to the outer catch
        }
      } catch (fetchError) {
        console.error("Error fetching document:", fetchError);
        
        // Specific error handling for fetch errors
        let errorMessage = "Failed to fetch the document";
        if (fetchError instanceof Error) {
          if (fetchError.message.includes("NetworkError") || 
              fetchError.message.includes("Failed to fetch")) {
            errorMessage = "Network error: Unable to connect to the proxy service. Please check your internet connection and try again.";
          } else {
            errorMessage = fetchError.message;
          }
        }
        
        throw new Error(errorMessage);
      }
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
