
import { useProcessedDocumentsFetch } from "./useProcessedDocumentsFetch";
import { useTextExtraction } from "./useTextExtraction";
import { useProxyConnectionStatus } from "./useProxyConnectionStatus";
import { useCallback } from "react";
import { useToast } from "@/components/ui/use-toast";

/**
 * Main hook that composes all document extraction functionality
 */
export const useDocumentExtraction = () => {
  const { data: documents, isLoading } = useProcessedDocumentsFetch();
  const { connectionStatus, connectionError, checkConnection } = useProxyConnectionStatus();
  const { toast } = useToast();
  
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
    
    // Select the document from the list
    const selectedDocument = documents?.find(doc => doc.id === documentId);
    if (!selectedDocument) {
      toast({
        variant: "destructive",
        title: "Document not found",
        description: "The selected document could not be found."
      });
      return;
    }

    // Check URL format for Google Drive documents
    const url = selectedDocument.url || '';
    if (url.includes('drive.google.com') && !url.includes('alt=media')) {
      toast({
        variant: "warning",
        title: "Google Drive URL Format",
        description: "For Google Drive documents, ensure the URL ends with '?alt=media' for direct download."
      });
    }
    
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
        toast({
          variant: "destructive",
          title: "Connection Unavailable",
          description: "Cannot connect to the proxy service. Please try again later or enable database storage."
        });
        return;
      }
    }
    
    console.log("Connection is good or database storage is enabled, proceeding with extraction");
    return extractText(documentId, documents);
  }, [connectionStatus, checkConnection, extractText, documents, storeInDatabase, toast]);

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
    connectionError,
    checkConnection,
    storeInDatabase,
    setStoreInDatabase
  };
};
