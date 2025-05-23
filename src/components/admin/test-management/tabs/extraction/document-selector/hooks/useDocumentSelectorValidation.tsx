
import { ProcessedDocument } from "@/types/document";
import { useEffect, useState } from "react";

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
  // Track selection validation state
  const [selectionError, setSelectionError] = useState<string | null>(null);
  
  // Log selection state on render for debugging with more details
  useEffect(() => {
    console.log("DocumentSelection validation state:", {
      documentsCount: documents.length,
      selectedIds: selectedDocumentIds,
      selectedCount: selectedDocumentIds?.length || 0,
      extractAll: extractAllDocuments
    });
    
    // Clear error message if we have a valid selection
    if ((selectedDocumentIds && selectedDocumentIds.length > 0) || extractAllDocuments) {
      setSelectionError(null);
    }
  }, [documents, selectedDocumentIds, extractAllDocuments]);

  // Handle extraction with pre-validation
  const validateAndExtract = () => {
    console.log("Extraction requested with state:", {
      selectedIds: selectedDocumentIds,
      selectedCount: selectedDocumentIds?.length || 0, 
      extractAll: extractAllDocuments
    });

    // Validate selection before triggering extraction
    const hasSelection = selectedDocumentIds && selectedDocumentIds.length > 0;
    if (!extractAllDocuments && !hasSelection) {
      console.error("Extraction attempted with no documents selected and extract all not enabled");
      setSelectionError("No documents selected. Please select at least one document or enable 'Extract All'.");
      return;
    }
    
    // Clear any previous errors and proceed with extraction
    setSelectionError(null);
    console.log("Calling onExtract with valid selection");
    onExtract();
  };

  return { selectionError, validateAndExtract };
}
