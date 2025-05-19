
import { useState, useEffect, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { ProcessedDocument } from "@/types/document";
import { extractPdfText } from "../utils/pdfUtils";

export const useDocumentExtraction = () => {
  const [selectedDocumentId, setSelectedDocumentId] = useState<string>("");
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractedText, setExtractedText] = useState<string>("");
  const [extractionProgress, setExtractionProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<"idle" | "checking" | "connected" | "error">("idle");
  const { toast } = useToast();

  // Fetch processed documents
  const { data: documents, isLoading } = useQuery({
    queryKey: ["processed-documents"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("processed_documents")
        .select("*")
        .eq("status", "completed")
        .order("created_at", { ascending: false });

      if (error) {
        throw new Error(error.message);
      }
      
      return data as ProcessedDocument[];
    },
  });

  // Check proxy service connection on mount
  useEffect(() => {
    const checkConnection = async () => {
      try {
        setConnectionStatus("checking");
        
        // Simple connectivity check - just to see if we can reach the function
        const { data, error } = await supabase.functions.invoke("pdf-proxy", {
          body: { action: "connection_test" },
        });
        
        if (error) {
          console.log("Connection test failed:", error);
          setConnectionStatus("error");
          return;
        }
        
        setConnectionStatus("connected");
      } catch (err) {
        console.error("Connection test error:", err);
        setConnectionStatus("error");
      }
    };
    
    checkConnection();
  }, []);

  // Extract text from a PDF document
  const extractTextFromDocument = async (documentId: string) => {
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
      setExtractionProgress(10);
      
      try {
        // Set a longer timeout for the function call
        const { data, error } = await supabase.functions.invoke("pdf-proxy", {
          body: { 
            url: selectedDocument.url,
            title: selectedDocument.title,
            // Add additional context that might help with debugging
            docType: selectedDocument.mime_type,
            requestedAt: new Date().toISOString()
          },
          headers: { 'Cache-Control': 'no-cache' }, // Avoid caching issues
        });

        if (error) {
          console.error("Edge function error:", error);
          throw new Error(`Proxy service error: ${error.message}`);
        }
        
        if (data?.error) {
          throw new Error(`${data.error}`);
        }
        
        // The data should be the binary file
        if (!data) {
          throw new Error("No data received from proxy");
        }
        
        setExtractionProgress(30);
        
        // Extract text from the PDF data
        const extractedContent = await extractPdfText(data, setExtractionProgress);
        
        setTimeout(() => {
          setExtractedText(extractedContent);
          setExtractionProgress(100);
          toast({
            title: "Text extraction completed",
            description: `Successfully extracted text from "${selectedDocument.title}"`,
          });
        }, 500);
        
      } catch (proxyError) {
        console.error("Proxy fetch failed:", proxyError);
        throw new Error(`Failed to fetch document through proxy: ${proxyError.message}`);
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
    documents,
    isLoading,
    selectedDocumentId,
    setSelectedDocumentId,
    extractTextFromDocument,
    isExtracting,
    extractionProgress,
    extractedText,
    error,
    retryExtraction,
    connectionStatus,
  };
};
