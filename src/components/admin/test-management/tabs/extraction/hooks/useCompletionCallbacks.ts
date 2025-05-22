
import { useCallback } from "react";
import { ProcessedDocument } from "@/types/document";

export type ExtractionCallbackFunction = (extractedText: string, testUrl?: string) => void;

export const useCompletionCallbacks = (
  onRunTest: (data: { extractionText: string, testUrl?: string }) => void
) => {
  // Create the callback for handling extraction completion
  const handleExtractionComplete = useCallback((extractedText: string, testUrl?: string) => {
    onRunTest({ extractionText: extractedText, testUrl });
  }, [onRunTest]);
  
  return {
    handleExtractionComplete
  };
};
