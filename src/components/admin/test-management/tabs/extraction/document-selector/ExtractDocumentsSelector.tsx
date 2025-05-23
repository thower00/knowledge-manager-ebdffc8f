
import { ProcessedDocument } from "@/types/document";
import { Card } from "@/components/ui/card";
import { DocumentSelectorHeader } from "./DocumentSelectorHeader";
import { DocumentTable } from "./DocumentTable";
import { DocumentSelectorFooter } from "./DocumentSelectorFooter";
import { ConnectionStatus } from "./ConnectionStatus";
import { useDocumentSelectorValidation } from "./hooks/useDocumentSelectorValidation";

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
  // Use the validation hook to handle selection validation
  const { selectionError, validateAndExtract } = useDocumentSelectorValidation({
    selectedDocumentIds,
    extractAllDocuments,
    documents,
    onExtract
  });
  
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
        onExtract={validateAndExtract}
        currentDocumentIndex={currentDocumentIndex}
        documentsToProcessCount={documentsToProcessCount}
        selectionError={selectionError}
      />
      
      <ConnectionStatus proxyConnected={proxyConnected} />
    </Card>
  );
}
