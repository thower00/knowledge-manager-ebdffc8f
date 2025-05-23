
import { useState } from "react";
import { useDocumentSelection } from "./useDocumentSelection";
import { useUrlValidation } from "./useUrlValidation";
import { useServerExtractionProcess } from "./useServerExtractionProcess";
import { useUrlExtraction } from "./useUrlExtraction";
import { useDatabaseExtraction } from "./useDatabaseExtraction";
import { useRefresh } from "./useRefresh";
import { ExtractionOptionsType } from "../ExtractionOptions";
import { ProcessedDocument } from "@/types/document";
import { useToast } from "@/hooks/use-toast";

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
  
  // Get document selection and handling
  const documentSelection = useDocumentSelection();
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
  } = documentSelection;
  
  // Server extraction process
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
    currentDocumentIndex
  } = useServerExtractionProcess();

  // Use the refactored URL extraction hook
  const { 
    setExtractionText: setUrlExtractionText,
    handleExtractFromUrl 
  } = useUrlExtraction(
    testUrl, 
    testUrlValid, 
    testUrlError, 
    checkProxyConnection, 
    extractFromDocument, 
    setIsExtracting, 
    setExtractionError, 
    setProcessExtractionText, 
    onComplete
  );

  // Use the refactored database extraction hook
  const { 
    setExtractionText: setDbExtractionText,
    handleExtractFromDatabase: handleExtractFromDbBase
  } = useDatabaseExtraction(
    selectedDocumentIds,
    extractAllDocuments,
    dbDocuments,
    documentsToProcess,
    checkProxyConnection,
    extractFromDocument,
    setIsExtracting,
    setExtractionError,
    setProcessExtractionText,
    onComplete ? (text) => onComplete(text) : undefined
  );
  
  // Create a wrapper that passes the current state directly to the extraction function
  const handleExtractFromDatabase = () => {
    console.log("handleExtractFromDatabase called - current selection state:", {
      selectedIds: selectedDocumentIds,
      extractAll: extractAllDocuments,
      documentsCount: dbDocuments?.length || 0,
      documentsToProcessCount: documentsToProcess?.length || 0
    });
    
    // Call the base handler which has the dependency array with current state values
    return handleExtractFromDbBase();
  };
  
  // Direct extraction function for immediate processing
  const handleDirectExtraction = (doc: ProcessedDocument) => {
    console.log("Starting direct extraction for document:", doc.title, doc.id);
    
    // Check if we're already extracting
    if (isExtracting) {
      console.log("Extraction already in progress, ignoring request");
      return;
    }
    
    // Start extraction immediately with the document
    setIsExtracting(true);
    setExtractionError(null);
    
    console.log("Calling extractFromDocument with:", doc.title);
    
    // Extract directly using the document
    extractFromDocument(doc)
      .then(text => {
        console.log("Extraction completed successfully, text length:", text.length);
        setExtractionText(text);
        setDbExtractionText(text);
        setProcessExtractionText(text);
        
        toast({
          title: "Extraction Complete",
          description: `Successfully extracted text from "${doc.title}"`
        });
        
        if (onComplete) {
          onComplete(text);
        }
      })
      .catch(error => {
        console.error("Extraction failed:", error);
        setExtractionError(error instanceof Error ? error.message : String(error));
        
        toast({
          title: "Extraction Failed", 
          description: error instanceof Error ? error.message : "Unknown extraction error"
        });
      })
      .finally(() => {
        setIsExtracting(false);
      });
  };
  
  // Use the refactored refresh hook
  const { handleRefresh } = useRefresh(
    refreshDocuments,
    checkProxyConnection
  );

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
    setExtractionText: (text: string) => {
      setExtractionText(text);
      setUrlExtractionText(text);
      setDbExtractionText(text);
      setProcessExtractionText(text);
    },
    isExtracting,
    extractionProgress,
    extractionError,
    proxyConnected,
    
    // Main extraction functions
    handleExtractFromUrl,
    handleExtractFromDatabase,
    handleDirectExtraction,
    handleRefresh,
    
    // Progressive extraction states
    pagesProcessed,
    totalPages,
    isProgressiveMode,
    
    // Status message
    extractionStatus
  };
};
