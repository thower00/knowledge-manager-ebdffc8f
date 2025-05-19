
import { useProcessedDocumentsFetch } from "./useProcessedDocumentsFetch";
import { useTextExtraction } from "./useTextExtraction";
import { useProxyConnectionStatus } from "./useProxyConnectionStatus";
import { useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import { validatePdfUrl, convertGoogleDriveUrl } from "../utils/urlUtils";

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

  // Wrapper for extractTextFromDocument that handles connection checking and URL conversion
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

    // Handle URL validation and conversion
    const url = selectedDocument.url || '';
    if (url) {
      // Check if it's a Google Drive URL that needs conversion
      const { url: convertedUrl, wasConverted } = convertGoogleDriveUrl(url);
      
      // If URL was converted, show a toast message and update the document URL
      if (wasConverted) {
        toast({
          variant: "success",
          title: "URL Converted",
          description: "Google Drive URL automatically converted to direct download format."
        });
        
        // Update the document object with the converted URL
        selectedDocument.url = convertedUrl;
      }
      
      // Validate the (possibly converted) URL
      const { isValid, message } = validatePdfUrl(selectedDocument.url);
      if (!isValid) {
        toast({
          variant: "destructive",
          title: "Invalid PDF URL",
          description: message || "The document URL appears to be invalid."
        });
        return;
      }
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
