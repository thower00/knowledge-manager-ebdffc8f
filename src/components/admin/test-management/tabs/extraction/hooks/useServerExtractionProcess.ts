
import { useState, useRef, useEffect } from "react";
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
  
  // Track if extraction has been completed
  const extractionCompletedRef = useRef(false);
  
  const { toast } = useToast();

  // Effect to clear timeout on unmount
  useEffect(() => {
    return () => {
      // Cleanup timeout on unmount
      if (timeoutId) {
        window.clearTimeout(timeoutId);
      }
    };
  }, [timeoutId]);

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
    
    // Reset the extraction completed flag
    extractionCompletedRef.current = false;
    
    // Convert seconds to milliseconds
    const timeoutValue = timeoutSeconds * 1000;
    
    // Create a new timeout - add a small buffer to the server timeout
    const newTimeoutId = window.setTimeout(() => {
      console.log(`Extraction timeout reached for document: ${documentTitle}`);
      
      // Only show timeout error if extraction hasn't been marked as completed
      if (!extractionCompletedRef.current) {
        // Don't reset extraction state if we have text but may have timed out
        // This allows seeing partial results
        const hasPartialResults = extractionText && extractionText.length > 0;
        
        if (!hasPartialResults) {
          // Reset extraction state only if we have no results
          setIsExtracting(false);
          setExtractionProgress(0);
        } else {
          // Mark as complete but with a warning if we have partial results
          setIsExtracting(false);
          setExtractionProgress(100);
        }
        
        // Set error message
        setExtractionError(`Extraction timed out after ${timeoutSeconds} seconds. The server might be overloaded or the PDF might be too complex.${hasPartialResults ? " Partial results are shown." : ""}`);
        
        // Show toast to user
        toast({
          title: "Extraction Timeout",
          description: `The extraction process for "${documentTitle}" took too long and was terminated.${hasPartialResults ? " Partial results are available." : ""}`,
          variant: "destructive"
        });
      }
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
    // Mark extraction as completed
    extractionCompletedRef.current = true;
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
      const timeoutValue = options?.timeout || 60;
      
      // Create client-side timeout that's a little longer than server-side
      createExtractionTimeout(document.title, timeoutValue + 15); // Increased timeout buffer
      
      // Extract text using our server-side solution
      console.log(`Starting server-side extraction for document: ${document.title}`);
      
      const extractionOptions = {
        maxPages: options?.extractFirstPagesOnly ? options.pageLimit : 0,
        streamMode: options?.extractionMode === 'progressive',
        // Reduce timeout slightly to ensure server responds before client times out
        timeout: Math.max(15, timeoutValue - 3)
      };

      // Clear any previous error
      setExtractionError(null);

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
        
        // Always clear the timeout since extraction completed successfully
        clearExtractionTimeout();
        
        // Mark as complete even if text is empty
        setExtractionProgress(100);
        setExtractionStatus('Extraction completed successfully');
        
        if (!text || text.length < 100) {
          throw new Error("No meaningful text could be extracted from the document.");
        }
        
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
