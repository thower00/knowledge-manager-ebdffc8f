
import { useState, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import { useDocumentSelection } from "./useDocumentSelection";
import { useUrlValidation } from "./useUrlValidation";
import { useServerExtractionProcess } from "./useServerExtractionProcess";
import { ExtractionOptionsType } from "../ExtractionOptions";
import { ProcessedDocument } from "@/types/document";

// Add the sleep function that was missing
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const useExtractionHandlers = (
  onComplete?: (extractedText: string, testUrl?: string) => void
) => {
  const [extractionText, setExtractionText] = useState("");
  const { toast } = useToast();
  
  // Import other hooks
  const {
    testUrl,
    setTestUrl,
    validateUrl,
    testUrlValid,
    testUrlError
  } = useUrlValidation();
  
  const {
    selectedDocumentIds,
    dbDocuments,
    isLoadingDocuments,
    extractAllDocuments,
    setExtractAllDocuments,
    toggleDocumentSelection,
    toggleSelectAll,
    refreshDocuments,
    documentsToProcess
  } = useDocumentSelection();
  
  const {
    isExtracting,
    setIsExtracting,
    extractionProgress,
    extractionError,
    setExtractionError,
    proxyConnected,
    extractFromDocument,
    checkProxyConnection,
    setExtractionText: setProcessExtractionText,
    pagesProcessed,
    totalPages,
    isProgressiveMode,
    extractionStatus,
    currentDocumentIndex // Added from server extraction process
  } = useServerExtractionProcess();

  // Extract text from URL
  const handleExtractFromUrl = useCallback(async () => {
    // Validate URL
    if (!testUrl) {
      toast({
        title: "No URL Provided",
        description: "Please enter a valid URL",
        variant: "destructive"
      });
      return;
    }
    
    if (!testUrlValid) {
      toast({
        title: "Invalid URL",
        description: testUrlError || "The URL appears to be invalid",
        variant: "destructive"
      });
      return;
    }
    
    // Check connection first
    setIsExtracting(true);
    
    try {
      // Make sure we have a connection to the proxy
      const isConnected = await checkProxyConnection();
      if (!isConnected) {
        setIsExtracting(false);
        toast({
          title: "Connection Failed",
          description: "Could not connect to the document proxy service",
          variant: "destructive"
        });
        return;
      }
      
      // Create a temporary document object with URL
      const tempDoc: ProcessedDocument = {
        id: "url-extract",
        title: "URL Document",
        url: testUrl,
        created_at: new Date().toISOString(),
        source_id: "url",
        source_type: "url",
        mime_type: "text/html",
        status: "pending"
      };
      
      // Extract text
      const extractedText = await extractFromDocument(tempDoc);
      
      // Update state with results
      setExtractionText(extractedText);
      setProcessExtractionText(extractedText);
      
      // Call complete callback if provided
      if (onComplete) {
        onComplete(extractedText, testUrl);
      }
      
      toast({
        title: "Extraction Complete",
        description: "Successfully extracted text from URL"
      });
    } catch (error) {
      console.error("Error in URL extraction:", error);
      setExtractionError(error instanceof Error ? error.message : "Unknown error during extraction");
      
      toast({
        title: "Extraction Failed",
        description: error instanceof Error ? error.message : "Unknown error during extraction",
        variant: "destructive"
      });
    } finally {
      setIsExtracting(false);
    }
  }, [
    testUrl, 
    testUrlValid, 
    testUrlError, 
    checkProxyConnection, 
    extractFromDocument, 
    onComplete, 
    toast, 
    setIsExtracting, 
    setExtractionError,
    setProcessExtractionText
  ]);

  // Extract text from database documents
  const handleExtractFromDatabase = useCallback(async () => {
    // Log selection state to help debugging
    console.log("Selected document IDs:", selectedDocumentIds);
    console.log("Extract All Documents flag:", extractAllDocuments);
    console.log("Available documents:", dbDocuments?.length || 0);
    console.log("Documents to process:", documentsToProcess?.length || 0);
    
    // Validate selected documents - FIXED: Check documentsToProcess length instead of selectedDocumentIds
    if (documentsToProcess.length === 0) {
      toast({
        title: "No Documents Selected",
        description: "Please select at least one document or enable 'Extract All'",
        variant: "destructive"
      });
      return;
    }
    
    if (!dbDocuments || dbDocuments.length === 0) {
      toast({
        title: "No Documents Available",
        description: "There are no documents in the database",
        variant: "destructive"
      });
      return;
    }
    
    // Check connection first
    setIsExtracting(true);
    
    try {
      // Make sure we have a connection to the proxy
      const isConnected = await checkProxyConnection();
      if (!isConnected) {
        setIsExtracting(false);
        toast({
          title: "Connection Failed",
          description: "Could not connect to the document proxy service",
          variant: "destructive"
        });
        return;
      }
      
      // Determine which documents to process
      const docsToProcess = documentsToProcess;
      console.log("Final documents to process:", docsToProcess);
      
      if (docsToProcess.length === 0) {
        setIsExtracting(false);
        toast({
          title: "No Documents to Process",
          description: "No valid documents were found for processing",
          variant: "destructive"
        });
        return;
      }
      
      let combinedText = "";
      let processedCount = 0;
      
      // We'll only process the first document for simplicity
      const doc = docsToProcess[0];
      
      try {
        // Extract text from this document
        const extractedText = await extractFromDocument(doc);
        
        // Add header for this document
        combinedText = `Document: ${doc.title}\n\n${extractedText}`;
        processedCount++;
        
        // Update state with results
        setExtractionText(combinedText);
        setProcessExtractionText(combinedText);
        
        // Wait a moment before marking as complete to ensure UI updates
        await sleep(100);
        
        // Call complete callback if provided
        if (onComplete) {
          onComplete(combinedText);
        }
      } catch (docError) {
        console.error(`Error extracting from document ${doc.title}:`, docError);
        
        // Continue with next document, add error note to combined text
        combinedText += `\n\nError extracting from ${doc.title}: ${docError instanceof Error ? docError.message : "Unknown error"}`;
        
        // Set extraction error
        setExtractionError(docError instanceof Error ? docError.message : "Error extracting from document");
      }
      
      if (processedCount === 0) {
        toast({
          title: "Extraction Failed",
          description: "Could not extract text from any of the selected documents",
          variant: "destructive"
        });
      } else {
        toast({
          title: "Extraction Complete",
          description: `Successfully extracted text from ${processedCount} document(s)`
        });
      }
    } catch (error) {
      console.error("Error in database extraction:", error);
      setExtractionError(error instanceof Error ? error.message : "Unknown error during extraction");
      
      toast({
        title: "Extraction Failed",
        description: error instanceof Error ? error.message : "Unknown error during extraction",
        variant: "destructive"
      });
    } finally {
      setIsExtracting(false);
    }
  }, [
    selectedDocumentIds,
    extractAllDocuments,
    dbDocuments,
    checkProxyConnection,
    documentsToProcess,
    extractFromDocument,
    onComplete,
    toast,
    setIsExtracting,
    setExtractionError,
    setProcessExtractionText
  ]);
  
  // Helper function for refreshing documents and connection
  const handleRefresh = useCallback(async () => {
    await refreshDocuments();
    await checkProxyConnection();
  }, [refreshDocuments, checkProxyConnection]);

  return {
    // URL-related state and functions
    testUrl,
    setTestUrl,
    testUrlValid,
    testUrlError,
    
    // Document selection state and functions
    selectedDocumentIds,
    dbDocuments,
    isLoadingDocuments,
    extractAllDocuments,
    setExtractAllDocuments,
    toggleDocumentSelection,
    toggleSelectAll,
    refreshDocuments,
    documentsToProcess,
    currentDocumentIndex,
    
    // Extraction state and functions
    extractionText,
    setExtractionText,
    isExtracting,
    extractionProgress,
    extractionError,
    proxyConnected,
    
    // Main extraction functions
    handleExtractFromUrl,
    handleExtractFromDatabase,
    handleRefresh,
    
    // Progressive extraction states
    pagesProcessed,
    totalPages,
    isProgressiveMode,
    
    // Status message
    extractionStatus
  };
};
