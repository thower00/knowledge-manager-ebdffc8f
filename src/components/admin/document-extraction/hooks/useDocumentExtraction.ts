
import { useProcessedDocumentsFetch } from "./useProcessedDocumentsFetch";
import { useTextExtraction } from "./useTextExtraction";
import { useProxyConnectionStatus } from "./useProxyConnectionStatus";
import { useCallback } from "react";
import { useToast } from "@/hooks/use-toast";

// Helper function to check and convert Google Drive URLs
function checkAndFormatGoogleDriveUrl(url: string): { url: string, warning: string | null } {
  if (!url || !url.includes('drive.google.com')) {
    return { url, warning: null };
  }
  
  // Already in the correct format
  if (url.includes('alt=media')) {
    return { url, warning: null };
  }
  
  // File view format that needs to be converted
  if (url.includes('/file/d/')) {
    // Extract file ID and create direct download URL
    const filePattern = /\/file\/d\/([^/]+)/;
    const fileMatch = url.match(filePattern);
    
    if (fileMatch && fileMatch[1]) {
      const fileId = fileMatch[1];
      const newUrl = `https://drive.google.com/uc?export=download&id=${fileId}&alt=media`;
      return { 
        url: newUrl,
        warning: "URL automatically converted to Google Drive direct download format."
      };
    }
  }
  
  // Any other Google Drive URL that might not work
  return { 
    url, 
    warning: "This Google Drive URL may not work. Use the direct download format with '?alt=media'."
  };
}

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

    // Check and potentially convert Google Drive URL
    const url = selectedDocument.url || '';
    if (url) {
      const { url: formattedUrl, warning } = checkAndFormatGoogleDriveUrl(url);
      
      // If URL was converted, show a toast message
      if (warning) {
        toast({
          variant: "warning",
          title: "Google Drive URL Notice",
          description: warning
        });
        
        // Update the URL in the document object before extraction
        selectedDocument.url = formattedUrl;
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
