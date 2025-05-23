
import { useState } from "react";

/**
 * Hook to manage extraction progress state
 */
export function useExtractionProgress() {
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractionProgress, setExtractionProgress] = useState(0);
  
  // Reset progress
  const resetProgress = () => {
    setExtractionProgress(0);
    setIsExtracting(false);
  };
  
  // Start extraction with optional initial progress
  const startExtraction = (initialProgress = 0) => {
    setIsExtracting(true);
    setExtractionProgress(initialProgress);
  };
  
  // Complete extraction
  const completeExtraction = () => {
    setExtractionProgress(100);
    setIsExtracting(false);
  };
  
  return {
    isExtracting,
    setIsExtracting,
    extractionProgress,
    setExtractionProgress,
    resetProgress,
    startExtraction,
    completeExtraction
  };
}
