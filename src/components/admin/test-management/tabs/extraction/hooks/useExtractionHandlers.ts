
import { useState } from "react";
import { useDocumentSelection } from "./useDocumentSelection";
import { useUrlValidation } from "./useUrlValidation";
import { useServerExtractionProcess } from "./useServerExtractionProcess";
import { useUrlExtraction } from "./useUrlExtraction";
import { useDatabaseExtraction } from "./useDatabaseExtraction";
import { useRefresh } from "./useRefresh";
import { ExtractionOptionsType } from "../ExtractionOptions";

export const useExtractionHandlers = (
  onComplete?: (extractedText: string, testUrl?: string) => void
) => {
  const [extractionText, setExtractionText] = useState("");
  
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
  
  // Create a wrapped handler that console logs the current state before extraction
  const handleExtractFromDatabase = () => {
    console.log("Extract button clicked - current state:", {
      selectedIds: selectedDocumentIds,
      documentsToProcess,
      extractAllDocuments
    });
    return handleExtractFromDbBase();
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
    handleRefresh,
    
    // Progressive extraction states
    pagesProcessed,
    totalPages,
    isProgressiveMode,
    
    // Status message
    extractionStatus
  };
};
