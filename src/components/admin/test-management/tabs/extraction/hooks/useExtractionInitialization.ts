
import { useEffect } from "react";
import { useServerExtractionProcess } from "./useServerExtractionProcess";
import { useDocumentSelection } from "./useDocumentSelection";

export const useExtractionInitialization = () => {
  const extractionProcess = useServerExtractionProcess();
  const documentSelection = useDocumentSelection();
  
  // Initialize services on mount
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
    await extractionProcess.checkProxyConnection();
    await documentSelection.fetchDocuments();
  };
  
  return {
    proxyConnected: extractionProcess.proxyConnected,
    handleRefresh
  };
};
