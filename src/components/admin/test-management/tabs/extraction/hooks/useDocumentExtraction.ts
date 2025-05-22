
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
  const [processingFunctionAvailable, setProcessingFunctionAvailable] = useState<boolean | null>(null);
  const [checkingProcessingFunction, setCheckingProcessingFunction] = useState<boolean>(false);
  const { toast } = useToast();
  
  const checkProcessingFunction = async () => {
    if (checkingProcessingFunction) return;
    
    try {
      setCheckingProcessingFunction(true);
      console.log("Checking PDF processing function availability...");
      
      // Use a direct fetch with appropriate CORS headers for more reliable checking
      const functionUrl = `https://sxrinuxxlmytddymjbmr.supabase.co/functions/v1/process-pdf`;
      const authSession = await supabase.auth.getSession();
      const authToken = authSession.data.session?.access_token || '';
      
      // Access the anon key directly from a constant - this is a public key
      const apiKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN4cmludXh4bG15dGRkeW1qYm1yIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDczODk0NzIsImV4cCI6MjA2Mjk2NTQ3Mn0.iT8OfJi5-PvKoF_hsjCytPpWiM2bhB6z8Q_XY6klqt0";
      
      const response = await fetch(functionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
          'apikey': apiKey,
          'X-Check-Availability': 'true'
        },
        body: JSON.stringify({ 
          checkAvailability: true,
          timestamp: Date.now()
        })
      });
      
      if (!response.ok) {
        console.error("Server-side PDF processing function check failed:", await response.text());
        setProcessingFunctionAvailable(false);
        return false;
      }
      
      const data = await response.json();
      console.log("Server-side PDF processing function check response:", data);
      
      // Verify the response indicates availability
      const isAvailable = data && (data.available === true || data.success === true);
      
      setProcessingFunctionAvailable(isAvailable);
      return isAvailable;
    } catch (error) {
      console.error("Error checking PDF processing function:", error);
      setProcessingFunctionAvailable(false);
      return false;
    } finally {
      setCheckingProcessingFunction(false);
    }
  };
  
  // Add retry mechanism for checking function availability
  useEffect(() => {
    const checkWithRetry = async () => {
      // Don't retry if we've already determined availability
      if (processingFunctionAvailable !== null) return;
      
      const maxRetries = 2;
      let currentRetry = 0;
      
      while (currentRetry <= maxRetries) {
        const available = await checkProcessingFunction();
        
        if (available) {
          // Function is available, no need to retry
          return;
        }
        
        // Wait before retrying
        if (currentRetry < maxRetries) {
          const delay = Math.pow(2, currentRetry) * 1000;
          console.log(`Retrying function check in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          currentRetry++;
        } else {
          // We've exhausted retries
          console.warn("PDF processing function unavailable after retries");
          toast({
            title: "PDF Processing Unavailable",
            description: "The document extraction service is currently unavailable. You can try again later or use manual text input.",
            variant: "destructive"
          });
          break;
        }
      }
    };
    
    checkWithRetry();
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
  
  // Handle refresh
  const handleRefresh = async () => {
    await checkProcessingFunction();
    await extractionProcess.checkProxyConnection();
    await documentSelection.fetchDocuments();
  };

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
    handleExtractFromUrl,
    handleExtractFromDatabase
  };
};
