
import { Button } from "@/components/ui/button";
import { ProcessedDocument } from "@/types/document";
import { DocumentList } from "./document-selector/DocumentList";
import { DocumentSelectorHeader } from "./document-selector/DocumentSelectorHeader";
import { DocumentSelectorFooter } from "./document-selector/DocumentSelectorFooter";
import { ConnectionStatus } from "./document-selector/ConnectionStatus";
import { ProxyStatus } from "./document-selector/ProxyStatus";

interface DatabaseDocumentSelectorProps {
  dbDocuments: ProcessedDocument[];
  selectedDocumentIds: string[];
  toggleDocumentSelection: (documentId: string) => void;
  toggleSelectAll: () => void;
  isLoadingDocuments: boolean;
  refreshDocuments: () => Promise<void>;
  extractAllDocuments: boolean;
  setExtractAllDocuments: (checked: boolean) => void;
  handleExtractFromDatabase: () => void;
  isExtracting: boolean;
  currentDocumentIndex: number;
  documentsToProcess: ProcessedDocument[];
  proxyConnected: boolean | null;
  disabled?: boolean;
  onExtract: (document: ProcessedDocument) => void;
}

export const DatabaseDocumentSelector = ({
  dbDocuments,
  selectedDocumentIds,
  toggleDocumentSelection,
  toggleSelectAll,
  isLoadingDocuments,
  refreshDocuments,
  extractAllDocuments,
  setExtractAllDocuments,
  handleExtractFromDatabase,
  isExtracting,
  currentDocumentIndex,
  documentsToProcess,
  proxyConnected,
  disabled = false,
  onExtract,
}: DatabaseDocumentSelectorProps) => {
  // Calculate the count of documents to process
  const documentsToProcessCount = documentsToProcess?.length || 0;

  return (
    <div className="space-y-2 p-4 border rounded-md bg-gray-50">
      <DocumentSelectorHeader 
        refreshDocuments={refreshDocuments}
        isLoading={isLoadingDocuments}
      />
      
      <DocumentList 
        documents={dbDocuments}
        isLoading={isLoadingDocuments}
        selectedDocumentIds={selectedDocumentIds}
        toggleDocumentSelection={toggleDocumentSelection}
        toggleSelectAll={toggleSelectAll}
        disabled={disabled || isExtracting}
      />
      
      <DocumentSelectorFooter 
        documents={dbDocuments}
        documentsToProcessCount={documentsToProcessCount}
        selectedDocumentIds={selectedDocumentIds}
        extractAllDocuments={extractAllDocuments}
        setExtractAllDocuments={setExtractAllDocuments}
        isExtracting={isExtracting}
        isLoading={isLoadingDocuments}
        currentDocumentIndex={currentDocumentIndex}
        onExtract={handleExtractFromDatabase}
      />
      
      <ProxyStatus proxyConnected={proxyConnected} />
    </div>
  );
};
