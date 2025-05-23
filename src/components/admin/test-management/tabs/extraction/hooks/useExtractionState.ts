
import { useState } from "react";
import { useExtractionProgress } from "./useExtractionProgress";
import { useExtractionText } from "./useExtractionText";
import { useExtractionStatus } from "./useExtractionStatus";

/**
 * Hook to manage extraction state, refactored to use smaller, focused hooks
 */
export function useExtractionState() {
  // Use the focused hooks for different parts of the state
  const { 
    isExtracting, 
    setIsExtracting, 
    extractionProgress, 
    setExtractionProgress 
  } = useExtractionProgress();
  
  const { 
    extractionText, 
    setExtractionText, 
    extractionError, 
    setExtractionError 
  } = useExtractionText();
  
  const { 
    extractionStatus, 
    setExtractionStatus, 
    currentDocumentIndex, 
    setCurrentDocumentIndex 
  } = useExtractionStatus();
  
  // Progressive extraction state
  const [pagesProcessed, setPagesProcessed] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [isProgressiveMode, setIsProgressiveMode] = useState(true);
  
  return {
    // Extraction process state
    isExtracting,
    setIsExtracting,
    extractionProgress,
    setExtractionProgress,
    
    // Text and error state
    extractionText,
    setExtractionText,
    extractionError,
    setExtractionError,
    
    // Status and document tracking
    currentDocumentIndex,
    setCurrentDocumentIndex,
    extractionStatus,
    setExtractionStatus,
    
    // Progressive extraction state
    pagesProcessed,
    setPagesProcessed,
    totalPages,
    setTotalPages,
    isProgressiveMode,
    setIsProgressiveMode
  };
}
