
import { useState, useRef } from "react";
import { useToast } from "@/hooks/use-toast";
import { ProcessedDocument } from "@/types/document";
import { fetchAndExtractPdfServerSide } from "@/components/admin/document-extraction/services/serverPdfService";
import { ExtractionOptionsType } from "../ExtractionOptions";

export const useServerExtractionProcess = () => {
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractionText, setExtractionText] = useState("");
  const [extractionProgress, setExtractionProgress] = useState(0);
  const [extractionError, setExtractionError] = useState<string | null>(null);
  const [proxyConnected, setProxyConnected] = useState<boolean | null>(null);
  const [currentDocumentIndex, setCurrentDocumentIndex] = useState(0);
  const [timeoutId, setTimeoutId] = useState<number | null>(null);
  const [extractionStatus, setExtractionStatus] = useState<string>("");
  
  // Progressive extraction state
  const [pagesProcessed, setPagesProcessed] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [isProgressiveMode, setIsProgressiveMode] = useState(true);
  
  const { toast } = useToast();

  // Check proxy connection
  const checkProxyConnection = async () => {
    try {
      setExtractionStatus("Testing proxy connection...");
      
      const { data, error } = await supabase.functions.invoke("pdf-proxy", {
        body: { 
          action: "connection_test",
          timestamp: Date.now(),
          nonce: Math.random().toString(36).substring(2, 10)
        }
      });
      
      if (error) {
        console.error("Proxy connection failed:", error);
        setProxyConnected(false);
        setExtractionStatus("");
        return false;
      }
      
      setProxyConnected(true);
      setExtractionStatus("");
      return true;
    } catch (error) {
      console.error("Proxy connection failed:", error);
      setProxyConnected(false);
      setExtractionStatus("");
      return false;
    }
  };

  // Create a timeout that will trigger if the extraction takes too long
  const createExtractionTimeout = (documentTitle: string, timeoutSeconds: number = 90) => {
    // Clear any existing timeout
    if (timeoutId) {
      window.clearTimeout(timeoutId);
    }
    
    // Convert seconds to milliseconds
    const timeoutValue = timeoutSeconds * 1000;
    
    // Create a new timeout
    const newTimeoutId = window.setTimeout(() => {
      console.error(`Extraction timeout reached for document: ${documentTitle}`);
      
      // Reset extraction state
      setIsExtracting(false);
      setExtractionProgress(0);
      
      // Set error message
      setExtractionError(`Extraction timed out after ${timeoutSeconds} seconds. The server might be overloaded or the PDF might be too complex.`);
      
      // Show toast to user
      toast({
        title: "Extraction Timeout",
        description: `The extraction process for "${documentTitle}" took too long and was terminated.`,
        variant: "destructive"
      });
    }, timeoutValue);
    
    setTimeoutId(newTimeoutId);
    
    return newTimeoutId;
  };

  // Clear the extraction timeout
  const clearExtractionTimeout = () => {
    if (timeoutId) {
      window.clearTimeout(timeoutId);
      setTimeoutId(null);
    }
  };

  // Extract text from a single document with options
  const extractFromDocument = async (
    document: ProcessedDocument, 
    options?: ExtractionOptionsType
  ) => {
    if (!document || !document.url) {
      toast({
        title: "Error",
        description: "Selected document has no URL",
        variant: "destructive"
      });
      return "";
    }

    try {
      // Set initial progress and create timeout
      setExtractionProgress(10);
      setExtractionStatus(`Fetching document from ${document.url}`);
      const timeoutValue = options?.timeout || 90;
      createExtractionTimeout(document.title, timeoutValue);
      
      // Extract text using our server-side solution
      console.log(`Starting server-side extraction for document: ${document.title}`);
      
      const extractionOptions = {
        maxPages: options?.extractFirstPagesOnly ? options.pageLimit : 0,
        streamMode: options?.extractionMode === 'progressive',
        timeout: timeoutValue
      };
      
      const text = await fetchAndExtractPdfServerSide(
        document.url,
        document.title,
        extractionOptions,
        progress => {
          setExtractionProgress(progress);
          
          if (progress < 40) {
            setExtractionStatus('Fetching document...');
          } else if (progress < 95) {
            setExtractionStatus(`Processing PDF: ${Math.floor(progress)}% complete`);
          } else {
            setExtractionStatus('Extraction completed');
          }
        }
      );
      
      // Clear the timeout since extraction completed successfully
      clearExtractionTimeout();
      
      // Complete the extraction
      setExtractionProgress(100);
      setExtractionStatus('Extraction completed successfully');
      return text;
    } catch (error) {
      // Clear the timeout since we have an error
      clearExtractionTimeout();
      
      console.error(`Error extracting from document ${document.title}:`, error);
      setExtractionStatus(`Extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
    extractFromDocument,
    createExtractionTimeout,
    clearExtractionTimeout,
    // Progressive extraction states
    pagesProcessed,
    totalPages,
    isProgressiveMode,
    // Status message
    extractionStatus
  };
};
