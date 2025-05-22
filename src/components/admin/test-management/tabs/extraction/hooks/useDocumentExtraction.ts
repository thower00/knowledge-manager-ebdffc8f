
import { useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useDocumentSelection } from "./useDocumentSelection";
import { useUrlValidation } from "./useUrlValidation";
import { useServerExtractionProcess } from "./useServerExtractionProcess";
import { useExtractionHandlers } from "./useExtractionHandlers";
import { ExtractionOptionsType } from "../ExtractionOptions";
import { supabase } from "@/integrations/supabase/client";

interface UseDocumentExtractionProps {
  onRunTest: (data: { extractionText: string, testUrl?: string }) => void;
}

export const useDocumentExtraction = ({ onRunTest }: UseDocumentExtractionProps) => {
  // Initialize extraction options with better defaults
  const [extractionOptions, setExtractionOptions] = useState<ExtractionOptionsType>({
    extractFirstPagesOnly: false,
    pageLimit: 10,
    timeout: 60,
    extractionMode: "progressive"
  });

  // Use server-side extraction process
  const extractionProcess = useServerExtractionProcess();
  
  // First, check if the server-side processing function is available
  const [processingFunctionAvailable, setProcessingFunctionAvailable] = useState<boolean>(false);
  
  useEffect(() => {
    const checkProcessingFunction = async () => {
      try {
        // Try to invoke the function with a minimal request to check if it exists
        const { data, error } = await supabase.functions.invoke("process-pdf", {
          body: { checkAvailability: true }
        });
        
        if (error) {
          console.warn("Server-side PDF processing function check failed:", error);
          setProcessingFunctionAvailable(false);
        } else {
          console.log("Server-side PDF processing function is available");
          setProcessingFunctionAvailable(true);
        }
      } catch (error) {
        console.warn("Error checking PDF processing function:", error);
        setProcessingFunctionAvailable(false);
      }
    };
    
    checkProcessingFunction();
  }, []);

  // Use individual hooks for different aspects of functionality
  const documentSelection = useDocumentSelection();
  const urlValidation = useUrlValidation();
  
  // Create extraction handlers with the dependencies they need
  const { handleExtractFromUrl, handleExtractFromDatabase } = useExtractionHandlers({
    testUrl: urlValidation.testUrl,
    testUrlValid: urlValidation.testUrlValid,
    validateUrl: urlValidation.validateUrl,
    selectedDocumentIds: documentSelection.selectedDocumentIds,
    extractAllDocuments: documentSelection.extractAllDocuments,
    documentsToProcess: documentSelection.documentsToProcess,
    extractionProcess,
    extractionOptions,
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
    
    // Extraction options
    extractionOptions,
    setExtractionOptions,
    
    // Server-side processing availability
    processingFunctionAvailable,
    
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
    
    // Extraction handlers
    handleExtractFromUrl,
    handleExtractFromDatabase
  };
};
