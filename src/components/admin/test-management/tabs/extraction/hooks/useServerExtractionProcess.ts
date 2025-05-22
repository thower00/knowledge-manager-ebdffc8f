
import { useState, useRef } from "react";
import { useToast } from "@/hooks/use-toast";
import { ProcessedDocument } from "@/types/document";
import { fetchAndExtractPdfServerSide } from "@/components/admin/document-extraction/services/serverPdfService";
import { ExtractionOptionsType } from "../ExtractionOptions";
import { supabase } from "@/integrations/supabase/client";

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

  // Enhanced proxy connection check with more informative logging
  const checkProxyConnection = async () => {
    try {
      setExtractionStatus("Testing proxy connection...");
      
      // Get the auth token
      const authSession = await supabase.auth.getSession();
      const authToken = authSession.data.session?.access_token || '';
      
      // Use the public anon key
      const apiKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN4cmludXh4bG15dGRkeW1qYm1yIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDczODk0NzIsImV4cCI6MjA2Mjk2NTQ3Mn0.iT8OfJi5-PvKoF_hsjCytPpWiM2bhB6z8Q_XY6klqt0";
      
      const response = await fetch('https://sxrinuxxlmytddymjbmr.supabase.co/functions/v1/pdf-proxy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
          'apikey': apiKey
        },
        body: JSON.stringify({ 
          action: "connection_test",
          timestamp: Date.now(),
          nonce: Math.random().toString(36).substring(2, 10)
        })
      });
      
      if (!response.ok) {
        console.error("Proxy connection failed:", await response.text());
        setProxyConnected(false);
        setExtractionStatus("");
        return false;
      }
      
      const data = await response.json();
      console.log("Proxy connection test result:", data);
      
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

      try {
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
      } catch (serverError) {
        console.error("Server-side extraction failed, checking if we have PDF data...", serverError);
        
        // If server-side fails, we'll try to fall back to a simple extraction
        // This is a simplified approach that will return limited text
        setExtractionStatus('Server extraction failed. Using fallback method...');
        
        // For fallback, we'll just provide a placeholder with error info
        const fallbackText = `
Document Title: ${document.title}
URL: ${document.url}

Server-side extraction failed with error: 
${serverError instanceof Error ? serverError.message : String(serverError)}

This is a fallback message. The document content could not be extracted properly.
You might want to:
1. Try again later
2. Check if the document URL is accessible
3. Try with a different document
        `;
        
        // Update the UI to show we're done but with limited success
        setExtractionProgress(100);
        setExtractionStatus('Extraction completed with limited results (fallback mode)');
        
        // Show a toast indicating we used fallback mode
        toast({
          title: "Using Fallback Extraction",
          description: "The server extraction failed. Limited text has been provided as a fallback.",
          variant: "warning"
        });
        
        // Clear the timeout since we're done
        clearExtractionTimeout();
        
        return fallbackText;
      }
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
