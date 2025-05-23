
import { useState } from "react";
import { ProcessedDocument } from "@/types/document";

interface UseDocumentSelectorValidationProps {
  selectedDocumentIds: string[];
  extractAllDocuments: boolean;
  documents: ProcessedDocument[];
  onExtract: () => void;
}

export function useDocumentSelectorValidation({
  selectedDocumentIds,
  extractAllDocuments,
  documents,
  onExtract
}: UseDocumentSelectorValidationProps) {
  const [selectionError, setSelectionError] = useState<string | null>(null);
  
  // Validate selection and extract
  const validateAndExtract = () => {
    // Clear previous error
    setSelectionError(null);
    
    // Check if no documents selected
    if (!extractAllDocuments && selectedDocumentIds.length === 0) {
      setSelectionError("Please select at least one document");
      return;
    }
    
    // Check if documents array is empty
    if (documents.length === 0) {
      setSelectionError("No documents available for extraction");
      return;
    }
    
    // All validation passed, proceed with extraction
    onExtract();
  };
  
  return {
    selectionError,
    validateAndExtract
  };
}
