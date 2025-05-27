
import { useCallback } from "react";

/**
 * Hook for handling extraction completion callbacks
 */
export const useExtractionHandlers = (
  onComplete?: (extractedText: string) => void
) => {
  
  // Handle direct extraction (for database documents)
  const handleDirectExtraction = useCallback(async (document: any) => {
    console.log("Direct extraction handler called for:", document?.title);
    
    if (onComplete) {
      // For now, return a placeholder - the actual extraction logic
      // will be handled by the DatabaseDocumentExtractor component
      const placeholderText = `Direct extraction initiated for: ${document?.title || 'Unknown document'}`;
      onComplete(placeholderText);
    }
  }, [onComplete]);

  return {
    handleDirectExtraction
  };
};
