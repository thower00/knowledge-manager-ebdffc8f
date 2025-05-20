
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
        let errorMessage = "Error processing PDF document";
        
        // Check for common PDF.js worker errors
        if (pdfError instanceof Error) {
          if (pdfError.message.includes("Failed to fetch") && pdfError.message.includes("pdf.worker")) {
            errorMessage = "Failed to load PDF processing worker. This may be due to network issues or content filtering. Try again later or on a different network.";
          } else {
            errorMessage = pdfError.message;
          }
        }
        
        throw new Error(errorMessage);
      }
    } catch (error) {
      console.error("Error extracting text:", error);
      
      let errorMessage = "Failed to extract text from the document";
      if (error instanceof Error) {
        // Special handling for common PDF.js errors
        if (error.message.includes("Invalid PDF structure")) {
          errorMessage = "The file is not a valid PDF document.";
        } else if (error.message.includes("Failed to fetch") || error.message.includes("NetworkError")) {
          errorMessage = "Network error: Unable to connect to the proxy service. Please check your internet connection and try again.";
        } else if (error.message.includes("timeout") || error.message.includes("timed out")) {
          errorMessage = "The request timed out. The document may be too large or the server is not responding.";
        } else if (error.message.includes("Failed to decode")) {
          errorMessage = "Failed to decode the document data. The file might be corrupted or in an unsupported format.";
        } else if (error.message.includes("pdf.worker")) {
          errorMessage = "Failed to load PDF processing components. This may be due to network restrictions or content filtering.";
        } else {
          errorMessage = error.message;
        }
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
