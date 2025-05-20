
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { ProcessedDocument } from "@/types/document";
import { extractPdfText } from "@/components/admin/document-extraction/utils/pdfUtils";
import { fetchDocumentViaProxy } from "@/components/admin/document-extraction/services/documentFetchService";

export const useExtractionProcess = () => {
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractionText, setExtractionText] = useState("");
  const [extractionProgress, setExtractionProgress] = useState(0);
  const [extractionError, setExtractionError] = useState<string | null>(null);
  const [proxyConnected, setProxyConnected] = useState<boolean | null>(null);
  const [currentDocumentIndex, setCurrentDocumentIndex] = useState(0);
  const { toast } = useToast();

  // Check proxy connection
  const checkProxyConnection = async () => {
    try {
      await fetchDocumentViaProxy("", "connection_test", 0);
      setProxyConnected(true);
      return true;
    } catch (error) {
      console.error("Proxy connection failed:", error);
      setProxyConnected(false);
      return false;
    }
  };

  // Extract text from a single document
  const extractFromDocument = async (document: ProcessedDocument) => {
    if (!document || !document.url) {
      toast({
        title: "Error",
        description: "Selected document has no URL",
        variant: "destructive"
      });
      return "";
    }

    try {
      // Set initial progress
      setExtractionProgress(10);
      
      // Fetch the document via proxy
      console.log(`Starting extraction for document: ${document.title} (${document.url})`);
      const documentData = await fetchDocumentViaProxy(document.url, document.title);
      
      // Update progress after fetch completes
      setExtractionProgress(40);
      
      // Extract text from the document
      const text = await extractPdfText(documentData, (progress) => {
        // Map the progress to our overall progress (40-95)
        const overallProgress = 40 + Math.floor((progress / 100) * 55);
        setExtractionProgress(overallProgress);
      });
      
      // Complete the extraction
      setExtractionProgress(100);
      return text;
    } catch (error) {
      console.error(`Error extracting from document ${document.title}:`, error);
      throw error;
    }
  };

  return {
    isExtracting,
    setIsExtracting,
    extractionText,
    setExtractionText,
    extractionProgress,
    setExtractionProgress,
    extractionError,
    setExtractionError,
    proxyConnected,
    setProxyConnected,
    currentDocumentIndex,
    setCurrentDocumentIndex,
    checkProxyConnection,
    extractFromDocument
  };
};
