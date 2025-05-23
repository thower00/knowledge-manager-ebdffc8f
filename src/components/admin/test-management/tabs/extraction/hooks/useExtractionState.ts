
import { useState } from "react";

/**
 * Hook to manage extraction state
 */
export function useExtractionState() {
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractionText, setExtractionText] = useState("");
  const [extractionProgress, setExtractionProgress] = useState(0);
  const [extractionError, setExtractionError] = useState<string | null>(null);
  const [currentDocumentIndex, setCurrentDocumentIndex] = useState(0);
  const [extractionStatus, setExtractionStatus] = useState<string>("");
  
  // Progressive extraction state
  const [pagesProcessed, setPagesProcessed] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [isProgressiveMode, setIsProgressiveMode] = useState(true);
  
  return {
    isExtracting,
    setIsExtracting,
    extractionText,
    setExtractionText,
    extractionProgress,
    setExtractionProgress,
    extractionError,
    setExtractionError,
    currentDocumentIndex,
    setCurrentDocumentIndex,
    extractionStatus,
    setExtractionStatus,
    pagesProcessed,
    setPagesProcessed,
    totalPages,
    setTotalPages,
    isProgressiveMode,
    setIsProgressiveMode
  };
}
