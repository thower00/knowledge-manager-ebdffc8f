
import { useProcessedDocumentsFetch } from "./useProcessedDocumentsFetch";
import { useTextExtraction } from "./useTextExtraction";
import { useProxyConnectionStatus } from "./useProxyConnectionStatus";
import { useCallback } from "react";

/**
 * Main hook that composes all document extraction functionality
 */
export const useDocumentExtraction = () => {
  const { data: documents, isLoading } = useProcessedDocumentsFetch();
  const { connectionStatus, checkConnection } = useProxyConnectionStatus();
  
  const {
    selectedDocumentId,
    setSelectedDocumentId,
    extractTextFromDocument: extractText,
    isExtracting,
    extractionProgress,
    extractedText,
    error,
    retryExtraction,
    storeInDatabase,
    setStoreInDatabase
  } = useTextExtraction();

  // Wrapper for extractTextFromDocument that handles connection checking
  const extractTextFromDocument = useCallback(async (documentId: string) => {
    console.log("Extract text requested for document:", documentId);
    console.log("Current connection status:", connectionStatus);
    console.log("Using database storage:", storeInDatabase);
    
    // If database storage is enabled, we can proceed regardless of connection status
    if (storeInDatabase) {
      console.log("Database storage enabled, proceeding with extraction regardless of proxy status");
      return extractText(documentId, documents);
    }
    
    // Otherwise, verify connection status before extraction
    if (connectionStatus === "error" || connectionStatus === "idle") {
      console.log("Connection status needs verification before extraction");
      
      // Try connecting and wait for the result
      const status = await checkConnection(true);
      console.log("Connection check completed with status:", status);
      
      // If still error, don't proceed with extraction
      if (status === "error") {
        console.error("Connection still unavailable, cannot proceed with extraction");
        return;
      }
    }
    
    console.log("Connection is good or database storage is enabled, proceeding with extraction");
    return extractText(documentId, documents);
  }, [connectionStatus, checkConnection, extractText, documents, storeInDatabase]);

  return {
    documents,
    isLoading,
    selectedDocumentId,
    setSelectedDocumentId,
    extractTextFromDocument,
    isExtracting,
    extractionProgress,
    extractedText,
    error,
    retryExtraction,
    connectionStatus,
    checkConnection,
    storeInDatabase,
    setStoreInDatabase
  };
};
