
import { useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { useDocumentSelection } from "./useDocumentSelection";
import { useUrlValidation } from "./useUrlValidation";
import { useExtractionProcess } from "./useExtractionProcess";
import { useExtractionHandlers } from "./useExtractionHandlers";

interface UseDocumentExtractionProps {
  onRunTest: (data: { extractionText: string, testUrl?: string }) => void;
}

export const useDocumentExtraction = ({ onRunTest }: UseDocumentExtractionProps) => {
  // Use individual hooks for different aspects of functionality
  const documentSelection = useDocumentSelection();
  const urlValidation = useUrlValidation();
  const extractionProcess = useExtractionProcess();
  
  // Create extraction handlers with the dependencies they need
  const { handleExtractFromUrl, handleExtractFromDatabase } = useExtractionHandlers({
    testUrl: urlValidation.testUrl,
    testUrlValid: urlValidation.testUrlValid,
    validateUrl: urlValidation.validateUrl,
    selectedDocumentIds: documentSelection.selectedDocumentIds,
    extractAllDocuments: documentSelection.extractAllDocuments,
    documentsToProcess: documentSelection.documentsToProcess,
    extractionProcess,
    onRunTest
  });

  // Check proxy connection on mount
  useEffect(() => {
    extractionProcess.checkProxyConnection();
    documentSelection.fetchDocuments();

    // Clean up any timeout when component unmounts
    return () => {
      extractionProcess.clearExtractionTimeout();
    };
  }, []);

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
    
    // Extraction process
    isExtracting: extractionProcess.isExtracting,
    extractionText: extractionProcess.extractionText,
    setExtractionText: extractionProcess.setExtractionText,
    extractionProgress: extractionProcess.extractionProgress,
    extractionError: extractionProcess.extractionError,
    proxyConnected: extractionProcess.proxyConnected,
    currentDocumentIndex: extractionProcess.currentDocumentIndex,
    
    // Extraction handlers
    handleExtractFromUrl,
    handleExtractFromDatabase
  };
};
