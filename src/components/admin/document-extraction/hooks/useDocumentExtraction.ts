
import { useState } from "react";
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
        // Attempt to fetch document through the proxy service
        const { data, error } = await supabase.functions.invoke("pdf-proxy", {
          body: { url: selectedDocument.url },
        });

        if (error) {
          console.error("Edge function error:", error);
          throw new Error(`Proxy service error: ${error.message}`);
        }
        
        if (data?.error) {
          throw new Error(`Proxy service error: ${data.error}`);
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
  };
};
