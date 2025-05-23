
import { useState, useRef, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";

/**
 * Hook to manage extraction timeout
 */
export function useExtractionTimeout(
  setExtractionError: (error: string | null) => void,
  setIsExtracting: (state: boolean) => void,
  setExtractionProgress: (progress: number) => void,
  extractionText: string
) {
  const [timeoutId, setTimeoutId] = useState<number | null>(null);
  const extractionCompletedRef = useRef(false);
  const { toast } = useToast();
  
  // Effect to clear timeout on unmount
  useEffect(() => {
    return () => {
      // Cleanup timeout on unmount
      if (timeoutId) {
        window.clearTimeout(timeoutId);
      }
    };
  }, [timeoutId]);
  
  // Create a timeout that will trigger if the extraction takes too long
  const createExtractionTimeout = (documentTitle: string, timeoutSeconds: number = 90) => {
    // Clear any existing timeout
    if (timeoutId) {
      window.clearTimeout(timeoutId);
    }
    
    // Reset the extraction completed flag
    extractionCompletedRef.current = false;
    
    // Convert seconds to milliseconds
    const timeoutValue = timeoutSeconds * 1000;
    
    // Create a new timeout - add a small buffer to the server timeout
    const newTimeoutId = window.setTimeout(() => {
      console.log(`Extraction timeout reached for document: ${documentTitle}`);
      
      // Only show timeout error if extraction hasn't been marked as completed
      if (!extractionCompletedRef.current) {
        // Don't reset extraction state if we have text but may have timed out
        // This allows seeing partial results
        const hasPartialResults = extractionText && extractionText.length > 0;
        
        if (!hasPartialResults) {
          // Reset extraction state only if we have no results
          setIsExtracting(false);
          setExtractionProgress(0);
        } else {
          // Mark as complete but with a warning if we have partial results
          setIsExtracting(false);
          setExtractionProgress(100);
        }
        
        // Set error message
        setExtractionError(`Extraction timed out after ${timeoutSeconds} seconds. The server might be overloaded or the PDF might be too complex.${hasPartialResults ? " Partial results are shown." : ""}`);
        
        // Show toast to user
        toast({
          title: "Extraction Timeout",
          description: `The extraction process for "${documentTitle}" took too long and was terminated.${hasPartialResults ? " Partial results are available." : ""}`,
          variant: "destructive"
        });
      }
    }, timeoutValue);
    
    setTimeoutId(newTimeoutId);
    
    return newTimeoutId;
  };

  // Clear the extraction timeout
  const clearExtractionTimeout = () => {
    if (timeoutId) {
      window.clearTimeout(timeoutId);
      setTimeoutId(null);
    }
    // Mark extraction as completed
    extractionCompletedRef.current = true;
  };
  
  return {
    createExtractionTimeout,
    clearExtractionTimeout
  };
}
