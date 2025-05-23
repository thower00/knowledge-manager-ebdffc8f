import { useRef } from "react";

/**
 * Hook to manage extraction timeout
 */
export function useExtractionTimeout(
  setExtractionError: (error: string | null) => void,
  setIsExtracting: (extracting: boolean) => void,
  setExtractionProgress: (progress: number) => void,
  extractionText: string
) {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Create a timeout for extraction
  const createExtractionTimeout = (documentTitle: string, timeoutSeconds: number = 60) => {
    // Clear any existing timeout
    clearExtractionTimeout();
    
    // Set a new timeout
    timeoutRef.current = setTimeout(() => {
      // If we already have some text, consider it a success despite timeout
      if (extractionText && extractionText.length > 100) {
        console.log("Extraction timed out but we have some text, continuing");
        setExtractionProgress(100);
        setIsExtracting(false);
        return;
      }
      
      // Otherwise, show error
      setExtractionError(`Extraction timed out after ${timeoutSeconds} seconds for document: ${documentTitle}`);
      setIsExtracting(false);
      setExtractionProgress(0);
    }, timeoutSeconds * 1000);
  };
  
  // Clear the timeout
  const clearExtractionTimeout = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  };
  
  return {
    createExtractionTimeout,
    clearExtractionTimeout
  };
}
