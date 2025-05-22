
import { useState, useRef } from "react";
import { useToast } from "@/hooks/use-toast";
import { ProcessedDocument } from "@/types/document";
import { extractPdfText, extractPdfFirstPages, extractPdfTextProgressively } from "@/components/admin/document-extraction/utils/pdfUtils";
import { fetchDocumentViaProxy } from "@/components/admin/document-extraction/services/documentFetchService";
import { ExtractionOptionsType } from "../ExtractionOptions";
import { PageProcessingEvent } from "@/components/admin/document-extraction/utils/pdfTypes";

// Default extraction configuration with increased timeouts
const EXTRACTION_CONFIG = {
  loadingTimeout: 30000,      // 30 seconds for the whole document loading (decreased from 90s)
  pageTimeout: 20000,         // 20 seconds per page
  maxConcurrentPages: 1       // Process just 1 page at a time to reduce memory usage
};

export const useExtractionProcess = () => {
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractionText, setExtractionText] = useState("");
  const [extractionProgress, setExtractionProgress] = useState(0);
  const [extractionError, setExtractionError] = useState<string | null>(null);
  const [proxyConnected, setProxyConnected] = useState<boolean | null>(null);
  const [currentDocumentIndex, setCurrentDocumentIndex] = useState(0);
  const [timeoutId, setTimeoutId] = useState<number | null>(null);
  const [abortController, setAbortController] = useState<AbortController | null>(null);
  const [extractionStatus, setExtractionStatus] = useState<string>("");
  
  // Progressive extraction state
  const [pagesProcessed, setPagesProcessed] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [isProgressiveMode, setIsProgressiveMode] = useState(false);
  
  // Keep a buffer of received page texts for progressive mode
  const textBufferRef = useRef<string[]>([]);
  
  const { toast } = useToast();

  // Check proxy connection
  const checkProxyConnection = async () => {
    try {
      setExtractionStatus("Testing proxy connection...");
      await fetchDocumentViaProxy("", "connection_test", 0);
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
  const createExtractionTimeout = (documentTitle: string, timeoutSeconds: number = 30) => {
    // Clear any existing timeout
    if (timeoutId) {
      window.clearTimeout(timeoutId);
    }
    
    // Convert seconds to milliseconds
    const timeoutValue = timeoutSeconds * 1000;
    
    // Create a new timeout
    const newTimeoutId = window.setTimeout(() => {
      console.error(`Extraction timeout reached for document: ${documentTitle}`);
      
      // Abort the extraction if possible
      if (abortController) {
        abortController.abort();
      }
      
      // Reset extraction state
      setIsExtracting(false);
      setExtractionProgress(0);
      
      // Set error message
      setExtractionError(`Extraction timed out after ${timeoutSeconds} seconds. The PDF might be corrupted, too large, or in an unsupported format.`);
      
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

  // Handle progressive extraction page events
  const handleProgressiveExtraction = (event: PageProcessingEvent) => {
    switch (event.type) {
      case 'metadata':
        console.log(`Progressive extraction: Document has ${event.pageCount} pages, processing ${event.pagesToProcess}`);
        setTotalPages(event.pagesToProcess);
        setPagesProcessed(0);
        textBufferRef.current = [];
        // Update progress to show we've started processing
        setExtractionProgress(20);
        setExtractionStatus(`PDF loaded, found ${event.pageCount} pages, processing ${event.pagesToProcess}`);
        break;
        
      case 'page':
        console.log(`Progressive extraction: Processed page ${event.pageNumber} of ${event.totalPages}`);
        setPagesProcessed(event.pageNumber);
        
        // Add this page's text to our buffer
        if (textBufferRef.current.length <= event.pageNumber) {
          // Extend the array if needed
          textBufferRef.current = [...textBufferRef.current, ...Array(event.pageNumber - textBufferRef.current.length + 1).fill('')];
        }
        textBufferRef.current[event.pageNumber - 1] = event.text;
        
        // Join all pages processed so far and update the extraction text
        const currentText = textBufferRef.current.filter(text => text).join('\n\n');
        setExtractionText(currentText);
        
        // Update the progress percentage
        const progressPercentage = Math.floor((event.pagesProcessed / event.totalPages) * 100);
        setExtractionProgress(progressPercentage);
        setExtractionStatus(`Processing PDF: Page ${event.pageNumber}/${event.totalPages} completed`);
        
        // Reset the extraction timeout to avoid timeouts between pages
        if (timeoutId) {
          clearExtractionTimeout();
          createExtractionTimeout(`${event.pageNumber}/${event.totalPages}`, 30);
        }
        break;
        
      case 'complete':
        console.log(`Progressive extraction: Completed with ${event.pagesProcessed} pages processed`);
        // Final progress update
        setExtractionProgress(100);
        setExtractionStatus(`Extraction completed: ${event.pagesProcessed} pages processed`);
        // Clear any timeouts as we're done
        clearExtractionTimeout();
        break;
        
      case 'error':
        console.error(`Progressive extraction error: ${event.error}`);
        setExtractionError(event.error);
        setExtractionStatus(`Error: ${event.error}`);
        break;
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

    // Create a new abort controller for this extraction
    const controller = new AbortController();
    setAbortController(controller);
    
    // Determine if we should use progressive mode - use it by default for now
    const useProgressiveMode = options?.extractionMode === 'progressive';
    setIsProgressiveMode(useProgressiveMode);

    try {
      // Set initial progress and create timeout
      setExtractionProgress(10);
      setExtractionStatus(`Fetching document from ${document.url}`);
      const timeoutValue = options?.timeout || 30; // Default to 30s now (reduced from 90s)
      createExtractionTimeout(document.title, timeoutValue);
      
      // Fetch the document via proxy
      console.log(`Starting extraction for document: ${document.title} (${document.url})`);
      const documentData = await fetchDocumentViaProxy(document.url, document.title);
      
      // Update progress after fetch completes
      setExtractionProgress(40);
      setExtractionStatus('Document fetched, starting text extraction...');
      
      // Configure extraction options
      const extractionConfig = {
        ...EXTRACTION_CONFIG,
        loadingTimeout: (timeoutValue * 1000), // Use the full timeout for loading
        abortSignal: controller.signal,
        maxPages: options?.extractFirstPagesOnly ? options.pageLimit : 0
      };
      
      // Extract text based on options and mode
      let text;
      if (useProgressiveMode) {
        console.log("Using progressive extraction mode");
        // Reset progressive extraction state
        setPagesProcessed(0);
        setTotalPages(0);
        textBufferRef.current = [];
        
        setExtractionStatus('Starting progressive extraction...');
        
        // Use progressive extraction that processes and shows pages as they complete
        text = await extractPdfTextProgressively(
          documentData,
          handleProgressiveExtraction,
          (progress) => {
            // In progressive mode, progress is handled by the page callback
            // This is just a backup progress tracker for loading phase
            if (progress < 40) {
              setExtractionProgress(progress);
            }
          },
          extractionConfig
        );
      } else if (options?.extractFirstPagesOnly) {
        setExtractionStatus('Extracting first pages...');
        text = await extractPdfFirstPages(
          documentData,
          options.pageLimit,
          (progress) => {
            // Map the progress to our overall progress (40-95)
            const overallProgress = 40 + Math.floor((progress / 100) * 55);
            setExtractionProgress(overallProgress);
            setExtractionStatus(`Extracting first ${options.pageLimit} pages: ${progress}% complete`);
          },
          extractionConfig // Pass the config with increased timeouts
        );
      } else {
        setExtractionStatus('Extracting all pages...');
        // Extract text from the document with configured timeouts
        text = await extractPdfText(
          documentData, 
          (progress) => {
            // Map the progress to our overall progress (40-95)
            const overallProgress = 40 + Math.floor((progress / 100) * 55);
            setExtractionProgress(overallProgress);
            setExtractionStatus(`Extracting text: ${progress}% complete`);
          },
          extractionConfig
        );
      }
      
      // Clear the timeout since extraction completed successfully
      clearExtractionTimeout();
      
      // Complete the extraction
      setExtractionProgress(100);
      setExtractionStatus('Extraction completed successfully');
      return text;
    } catch (error) {
      // Clear the timeout since we have an error
      clearExtractionTimeout();
      
      // Check if this was an abort error
      if (error instanceof DOMException && error.name === 'AbortError') {
        console.error(`Extraction aborted for document ${document.title}`);
        setExtractionStatus('Extraction was cancelled');
        throw new Error('Extraction was cancelled due to timeout');
      }
      
      console.error(`Error extracting from document ${document.title}:`, error);
      setExtractionStatus(`Extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    } finally {
      // Clear the abort controller
      setAbortController(null);
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
    abortController,
    // Progressive extraction states
    pagesProcessed,
    totalPages,
    isProgressiveMode,
    // Status message
    extractionStatus
  };
};
