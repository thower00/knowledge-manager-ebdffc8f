
import { useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { DocumentsListHeader } from "./processed-documents/DocumentsListHeader";
import { DocumentsTable } from "./processed-documents/DocumentsTable";
import { EmptyState } from "./processed-documents/EmptyState";
import { LoadingState } from "./processed-documents/LoadingState";
import { DeleteConfirmationDialog } from "./processed-documents/DeleteConfirmationDialog";
import { useProcessedDocuments } from "./processed-documents/useProcessedDocuments";

export function ProcessedDocumentsList() {
  const {
    documents,
    isLoading,
    selectedDocuments,
    isDeleting,
    isDeleteDialogOpen,
    loadProcessedDocuments,
    handleSelectAll,
    toggleDocumentSelection,
    confirmDeleteSelected,
    handleDeleteSelected,
    setIsDeleteDialogOpen,
  } = useProcessedDocuments();

  // Load documents on initial render
  useEffect(() => {
    console.log("Initial document loading...");
    loadProcessedDocuments();
  }, [loadProcessedDocuments]);
  
  // Function to force refresh from UI
  const handleManualRefresh = () => {
    console.log("Manual refresh triggered");
    loadProcessedDocuments();
  };

  return (
    <Card>
      <CardContent className="p-0">
        <DocumentsListHeader
          selectedCount={selectedDocuments.length}
          onRefresh={handleManualRefresh}
          onDelete={confirmDeleteSelected}
          isLoading={isLoading}
          isDeleting={isDeleting}
        />
        
        {isLoading ? (
          <LoadingState />
        ) : documents.length === 0 ? (
          <EmptyState />
        ) : (
          <DocumentsTable
            documents={documents}
            selectedDocuments={selectedDocuments}
            toggleSelection={toggleDocumentSelection}
            toggleSelectAll={handleSelectAll}
          />
        )}
      </CardContent>

      <DeleteConfirmationDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        onConfirm={handleDeleteSelected}
        count={selectedDocuments.length}
        isDeleting={isDeleting}
      />
    </Card>
  );
}
