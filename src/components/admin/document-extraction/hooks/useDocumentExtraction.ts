
import { useProcessedDocumentsFetch } from "./useProcessedDocumentsFetch";
import { useTextExtraction } from "./useTextExtraction";
import { useProxyConnectionStatus } from "./useProxyConnectionStatus";

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
  } = useTextExtraction();

  // Wrapper for extractTextFromDocument that passes the documents
  const extractTextFromDocument = async (documentId: string) => {
    // Before extraction, verify connection status
    if (connectionStatus === "error") {
      // Try reconnecting before extraction
      await checkConnection(true);
    }
    
    return extractText(documentId, documents);
  };

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
  };
};
