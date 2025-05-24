
import { useState, useRef, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { ProcessedDocument } from "@/types/document";
import { fetchAndExtractPdfServerSide } from "@/components/admin/document-extraction/services/serverPdfService";
import { ExtractionOptionsType } from "../ExtractionOptions";
import { useProxyConnectionCheck } from "./useProxyConnectionCheck";
import { useExtractionState } from "./useExtractionState";
import { useExtractionTimeout } from "./useExtractionTimeout";

export const useServerExtractionProcess = () => {
  const { 
    isExtracting, setIsExtracting,
    extractionText, setExtractionText,
    extractionProgress, setExtractionProgress,
    extractionError, setExtractionError,
    currentDocumentIndex, setCurrentDocumentIndex,
    extractionStatus, setExtractionStatus,
    pagesProcessed, setPagesProcessed,
    totalPages, setTotalPages,
    isProgressiveMode, setIsProgressiveMode
  } = useExtractionState();
  
  // Use the proxy connection hook
  const { 
    proxyConnected, 
    setProxyConnected,
    checkProxyConnection 
  } = useProxyConnectionCheck();
  
  // Use the timeout management hook
  const { 
    createExtractionTimeout, 
    clearExtractionTimeout 
  } = useExtractionTimeout(setExtractionError, setIsExtracting, setExtractionProgress, extractionText);
  
  const { toast } = useToast();
  
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
      
      // Create client-side timeout
      createExtractionTimeout(document.title, timeoutValue + 15);
      
      // Clear any previous error
      setExtractionError(null);

      try {
        const text = await fetchAndExtractPdfServerSide(
          document.url,
          document.title,
          {
            maxPages: options?.extractFirstPagesOnly ? options.pageLimit : 0,
            streamMode: options?.extractionMode === 'progressive',
            // Reduce timeout to ensure server responds before client times out
            timeout: Math.max(15, timeoutValue - 5),
            // Add these flags for better extraction
            forceTextMode: true,
            disableBinaryOutput: true,
            strictTextCleaning: true
          },
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
        
        // Mark as complete
        setExtractionProgress(100);
        setExtractionStatus('Extraction completed successfully');
        
        if (!text || text.length < 50) {
          throw new Error("No meaningful text could be extracted from the document.");
        }
        
        return text;
      } catch (serverError) {
        console.error("Server-side extraction failed:", serverError);
        
        // Set status to indicate fallback mode
        setExtractionStatus('Server extraction failed. Using fallback method...');
        
        // For fallback, provide a placeholder with error info
        const fallbackText = generateFallbackText(document, serverError);
        
        // Update the UI to show we're done but with limited success
        setExtractionProgress(100);
        setExtractionStatus('Extraction completed with limited results (fallback mode)');
        
        // Show a toast for fallback mode
        toast({
          title: "Extraction Failed", 
          description: `Could not extract text from "${document.title}". ${serverError instanceof Error ? serverError.message : 'Unknown error'}`,
          variant: "destructive"
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

// Generate fallback text when extraction fails
function generateFallbackText(document: ProcessedDocument, error: any): string {
  return `
Document Title: ${document.title}
URL: ${document.url}

Server-side extraction failed with error: 
${error instanceof Error ? error.message : String(error)}

This is a fallback message. The document content could not be extracted properly.
You might want to:
1. Try again later
2. Check if the document URL is accessible
3. Try with a different document
  `;
}
