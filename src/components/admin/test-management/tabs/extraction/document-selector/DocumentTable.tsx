
import { Table } from "@/components/ui/table";
import { ProcessedDocument } from "@/types/document";
import { CardContent } from "@/components/ui/card";
import { DocumentTableHeader } from "./components/DocumentTableHeader";
import { DocumentTableBody } from "./components/DocumentTableBody";
import { EmptyTableState } from "./components/EmptyTableState";
import { useEffect } from "react";

interface DocumentTableProps {
  documents: ProcessedDocument[];
  selectedDocumentIds: string[];
  toggleDocumentSelection: (documentId: string) => void;
  toggleSelectAll: () => void;
  isLoading: boolean;
}

export function DocumentTable({
  documents,
  selectedDocumentIds,
  toggleDocumentSelection,
  toggleSelectAll,
  isLoading
}: DocumentTableProps) {
  // Enhanced debug logging for document selection
  useEffect(() => {
    console.log("DocumentTable rendered with:", {
      documentsCount: documents.length,
      selectedIds: selectedDocumentIds,
      selectedCount: selectedDocumentIds?.length || 0,
      selectedDocIds: JSON.stringify(selectedDocumentIds)
    });
  }, [documents, selectedDocumentIds]);

  if (isLoading || documents.length === 0) {
    return <EmptyTableState isLoading={isLoading} />;
  }

  // Safety check for selectedDocumentIds
  const safeSelectedIds = selectedDocumentIds || [];
  const allSelected = safeSelectedIds.length === documents.length && documents.length > 0;

  return (
    <CardContent className="p-0">
      <div className="overflow-x-auto">
        <Table>
          <DocumentTableHeader 
            toggleSelectAll={toggleSelectAll}
            allSelected={allSelected}
            documentsCount={documents.length}
          />
          <DocumentTableBody 
            documents={documents}
            selectedDocumentIds={selectedDocumentIds}
            toggleDocumentSelection={toggleDocumentSelection}
            isLoading={isLoading}
          />
        </Table>
      </div>
    </CardContent>
  );
}
