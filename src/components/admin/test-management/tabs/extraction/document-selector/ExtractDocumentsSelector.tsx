
import { ProcessedDocument } from "@/types/document";
import { Card } from "@/components/ui/card";
import { DocumentSelectorHeader } from "./DocumentSelectorHeader";
import { DocumentTable } from "./DocumentTable";
import { DocumentSelectorFooter } from "./DocumentSelectorFooter";
import { ConnectionStatus } from "./ConnectionStatus";
import { useEffect, useState } from "react";

interface ExtractDocumentsSelectorProps {
  documents: ProcessedDocument[];
  selectedDocumentIds: string[];
  toggleDocumentSelection: (documentId: string) => void;
  toggleSelectAll: () => void;
  refreshDocuments: () => Promise<void>;
  isLoading: boolean;
  isExtracting: boolean;
  onExtract: () => void;
  extractAllDocuments: boolean;
  setExtractAllDocuments: (value: boolean) => void;
  proxyConnected: boolean | null;
  currentDocumentIndex: number;
  documentsToProcessCount: number;
}

export function ExtractDocumentsSelector({
  documents,
  selectedDocumentIds,
  toggleDocumentSelection,
  toggleSelectAll,
  refreshDocuments,
  isLoading,
  isExtracting,
  onExtract,
  extractAllDocuments,
  setExtractAllDocuments,
  proxyConnected,
  currentDocumentIndex,
  documentsToProcessCount
}: ExtractDocumentsSelectorProps) {
  // Track selection validation state
  const [selectionError, setSelectionError] = useState<string | null>(null);
  
  // Log selection state on render for debugging with more details
  useEffect(() => {
    console.log("ExtractDocumentsSelector rendered with:", {
      documentsCount: documents.length,
      selectedIds: selectedDocumentIds,
      selectedCount: selectedDocumentIds?.length || 0,
      extractAll: extractAllDocuments,
      isLoading,
      isExtracting,
      selectionError
    });
    
    // Clear error message if we have a valid selection
    if ((selectedDocumentIds && selectedDocumentIds.length > 0) || extractAllDocuments) {
      setSelectionError(null);
    }
  }, [documents, selectedDocumentIds, extractAllDocuments, isLoading, isExtracting]);

  // Handle extraction with pre-validation
  const handleExtraction = () => {
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
  
  return (
    <Card>
      <DocumentSelectorHeader 
        refreshDocuments={refreshDocuments}
        isLoading={isLoading}
      />

      <DocumentTable
        documents={documents}
        selectedDocumentIds={selectedDocumentIds}
        toggleDocumentSelection={toggleDocumentSelection}
        toggleSelectAll={toggleSelectAll}
        isLoading={isLoading}
      />

      <DocumentSelectorFooter
        documents={documents}
        selectedDocumentIds={selectedDocumentIds}
        extractAllDocuments={extractAllDocuments}
        setExtractAllDocuments={setExtractAllDocuments}
        isLoading={isLoading}
        isExtracting={isExtracting}
        onExtract={handleExtraction}
        currentDocumentIndex={currentDocumentIndex}
        documentsToProcessCount={documentsToProcessCount}
        selectionError={selectionError}
      />
      
      <ConnectionStatus proxyConnected={proxyConnected} />
    </Card>
  );
}
