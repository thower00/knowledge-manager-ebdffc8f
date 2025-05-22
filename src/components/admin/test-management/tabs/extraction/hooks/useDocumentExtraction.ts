
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useDocumentSelection } from "./useDocumentSelection";
import { useUrlValidation } from "./useUrlValidation";
import { useServerExtractionProcess } from "./useServerExtractionProcess";
import { useExtractionHandlers } from "./useExtractionHandlers";
import { useExtractionOptions } from "./useExtractionOptions";
import { useProcessingFunctionCheck } from "./useProcessingFunctionCheck";
import { useExtractionInitialization } from "./useExtractionInitialization";
import { useCompletionCallbacks, ExtractionCallbackFunction } from "./useCompletionCallbacks";

interface UseDocumentExtractionProps {
  onRunTest: (data: { extractionText: string, testUrl?: string }) => void;
}

export const useDocumentExtraction = ({ onRunTest }: UseDocumentExtractionProps) => {
  // Use our smaller, focused hooks
  const { extractionOptions, setExtractionOptions } = useExtractionOptions();
  const { processingFunctionAvailable, checkProcessingFunction, checkingProcessingFunction } = useProcessingFunctionCheck();
  const { handleRefresh } = useExtractionInitialization();
  const { handleExtractionComplete } = useCompletionCallbacks(onRunTest);
  
  // Use extraction process hook for extraction state
  const extractionProcess = useServerExtractionProcess();
  
  // Use document selection hook
  const documentSelection = useDocumentSelection();
  
  // Use URL validation hook
  const urlValidation = useUrlValidation();
  
  // Use extraction handlers hook with our callback
  const extractionHandlers = useExtractionHandlers(handleExtractionComplete);

  // Return all the properties and methods needed by the component
  return {
    // URL validation
    testUrl: urlValidation.testUrl,
    setTestUrl: urlValidation.setTestUrl,
    testUrlError: urlValidation.testUrlError,
    testUrlValid: urlValidation.testUrlValid,
    
    // Document selection
    dbDocuments: documentSelection.dbDocuments,
    selectedDocumentIds: documentSelection.selectedDocumentIds,
    isLoadingDocuments: documentSelection.isLoadingDocuments,
    extractAllDocuments: documentSelection.extractAllDocuments,
    setExtractAllDocuments: documentSelection.setExtractAllDocuments,
    toggleDocumentSelection: documentSelection.toggleDocumentSelection,
    toggleSelectAll: documentSelection.toggleSelectAll,
    refreshDocuments: documentSelection.refreshDocuments,
    documentsToProcess: documentSelection.documentsToProcess,
    
    // Extraction options
    extractionOptions,
    setExtractionOptions,
    
    // Server-side processing availability
    processingFunctionAvailable,
    checkProcessingFunction,
    checkingProcessingFunction,
    
    // Extraction process
    isExtracting: extractionProcess.isExtracting,
    extractionText: extractionProcess.extractionText,
    setExtractionText: extractionProcess.setExtractionText,
    extractionProgress: extractionProcess.extractionProgress,
    extractionError: extractionProcess.extractionError,
    proxyConnected: extractionProcess.proxyConnected,
    currentDocumentIndex: extractionProcess.currentDocumentIndex,
    
    // Progressive extraction status
    pagesProcessed: extractionProcess.pagesProcessed,
    totalPages: extractionProcess.totalPages,
    isProgressiveMode: extractionProcess.isProgressiveMode,
    
    // Status message
    extractionStatus: extractionProcess.extractionStatus,
    
    // Refresh handler
    handleRefresh,
    
    // Extraction handlers
    handleExtractFromUrl: extractionHandlers.handleExtractFromUrl,
    handleExtractFromDatabase: extractionHandlers.handleExtractFromDatabase
  };
};
