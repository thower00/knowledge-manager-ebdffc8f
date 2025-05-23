
import { useState } from "react";

/**
 * Hook to manage extraction status and document tracking
 */
export function useExtractionStatus() {
  const [extractionStatus, setExtractionStatus] = useState<string>("");
  const [currentDocumentIndex, setCurrentDocumentIndex] = useState(0);
  
  // Reset status
  const resetStatus = () => {
    setExtractionStatus("");
    setCurrentDocumentIndex(0);
  };
  
  // Update status with document info
  const updateStatusWithDocument = (documentTitle: string, index: number, total: number) => {
    setCurrentDocumentIndex(index);
    setExtractionStatus(`Processing ${documentTitle} (${index + 1}/${total})`);
  };
  
  return {
    extractionStatus,
    setExtractionStatus,
    currentDocumentIndex,
    setCurrentDocumentIndex,
    resetStatus,
    updateStatusWithDocument
  };
}
