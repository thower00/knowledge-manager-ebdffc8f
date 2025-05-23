
import { Button } from "@/components/ui/button";
import { ProcessedDocument } from "@/types/document";
import { DocumentList } from "./document-selector/DocumentList";
import { ExtractControls } from "./document-selector/ExtractControls";
import { ProxyStatus } from "./document-selector/ProxyStatus";

interface DatabaseDocumentSelectorProps {
  dbDocuments: ProcessedDocument[];
  selectedDocumentIds: string[];
  toggleDocumentSelection: (documentId: string) => void;
  toggleSelectAll: () => void;
  isLoadingDocuments: boolean;
  refreshDocuments: () => void;
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
  disabled,
  onExtract,
}: DatabaseDocumentSelectorProps) => {
  // Debug: Log selection state when component renders
  console.log("DatabaseDocumentSelector rendering with:", {
    dbDocumentsCount: dbDocuments?.length || 0,
    selectedDocumentIds,
    extractAllDocuments,
    documentsToProcessCount: Array.isArray(documentsToProcess) ? documentsToProcess.length : 0
  });

  return (
    <div className="space-y-2 p-4 border rounded-md bg-gray-50">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-md font-medium">Extract from Database Documents</h3>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={refreshDocuments}
          disabled={isLoadingDocuments}
        >
          {isLoadingDocuments ? "Loading..." : "Refresh Documents"}
        </Button>
      </div>
      
      {/* Document List with checkboxes */}
      <DocumentList 
        documents={dbDocuments}
        isLoading={isLoadingDocuments}
        selectedDocumentIds={selectedDocumentIds}
        toggleDocumentSelection={toggleDocumentSelection}
        toggleSelectAll={toggleSelectAll}
        disabled={disabled || isExtracting}
      />
      
      <ExtractControls 
        dbDocuments={dbDocuments}
        documentsToProcess={documentsToProcess}
        selectedDocumentIds={selectedDocumentIds}
        extractAllDocuments={extractAllDocuments}
        setExtractAllDocuments={setExtractAllDocuments}
        isExtracting={isExtracting}
        currentDocumentIndex={currentDocumentIndex}
        handleExtractFromDatabase={handleExtractFromDatabase}
        disabled={disabled}
      />
      
      {/* Connection status indicator */}
      <ProxyStatus proxyConnected={proxyConnected} />
    </div>
  );
};
