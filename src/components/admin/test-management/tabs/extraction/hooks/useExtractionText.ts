
import { useState } from "react";

/**
 * Hook to manage extraction text and error state
 */
export function useExtractionText() {
  const [extractionText, setExtractionText] = useState("");
  const [extractionError, setExtractionError] = useState<string | null>(null);
  
  // Clear text and error
  const clearText = () => {
    setExtractionText("");
    setExtractionError(null);
  };
  
  // Set error with optional text clearing
  const setError = (error: string, clearExistingText = false) => {
    setExtractionError(error);
    if (clearExistingText) {
      setExtractionText("");
    }
  };
  
  return {
    extractionText,
    setExtractionText,
    extractionError,
    setExtractionError,
    clearText,
    setError
  };
}
