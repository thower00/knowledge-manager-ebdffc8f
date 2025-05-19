
import { useState, useCallback } from "react";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { ProcessedDocument } from "@/types/document";
import { extractPdfText } from "../utils/pdfUtils";

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

  /**
   * Fetches a document through the proxy service
   * @param url URL of document to fetch
   * @param title Optional document title for better error messages
   * @returns ArrayBuffer of document data
   */
  const fetchDocumentViaProxy = async (url: string, title?: string) => {
    setExtractionProgress(10);
    
    try {
      console.log("Calling pdf-proxy Edge Function with URL:", url);
      
      // Fix: Remove the responseType option which doesn't exist in FunctionInvokeOptions
      // and handle the binary response conversion manually
      const { data, error: functionError } = await supabase.functions.invoke("pdf-proxy", {
        body: { 
          url,
          title,
          // Add additional context that might help with debugging
          requestedAt: new Date().toISOString()
        }
      });

      // Explicit error checking for Edge Function call
      if (functionError) {
        console.error("Edge function error:", functionError);
        throw new Error(`Proxy service error: ${functionError.message || "Unknown error"}`);
      }
      
      if (!data) {
        throw new Error("No data received from proxy");
      }
      
      // Convert the base64 data to ArrayBuffer
      // The Edge Function now returns base64 encoded data instead of binary
      const binaryString = window.atob(data as string);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const arrayBuffer = bytes.buffer;
      
      setExtractionProgress(30);
      return arrayBuffer;
    } catch (proxyError) {
      console.error("Proxy fetch failed:", proxyError);
      
      // More specific error messages
      let errorMessage = "Failed to fetch document through proxy";
      if (proxyError instanceof Error) {
        errorMessage = proxyError.message;
        
        // Enhance known error types
        if (errorMessage.includes("Failed to fetch")) {
          errorMessage = "Network error: Unable to connect to the proxy service. Please check your internet connection and try again.";
        } else if (errorMessage.includes("timeout") || errorMessage.includes("timed out")) {
          errorMessage = "The request timed out. The document may be too large or the server is not responding.";
        }
      }
      
      throw new Error(errorMessage);
    }
  };

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
      console.log("Original document URL:", selectedDocument.url);
      
      // Use the proxy service to fetch the document
      const documentData = await fetchDocumentViaProxy(
        selectedDocument.url, 
        selectedDocument.title
      );
      
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
    retryExtraction,
  };
};
