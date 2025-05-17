
import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { DocumentsListHeader } from "./processed-documents/DocumentsListHeader";
import { DocumentsTable } from "./processed-documents/DocumentsTable";
import { EmptyState } from "./processed-documents/EmptyState";
import { LoadingState } from "./processed-documents/LoadingState";
import { DeleteConfirmationDialog } from "./processed-documents/DeleteConfirmationDialog";
import { useProcessedDocuments } from "./processed-documents/useProcessedDocuments";

export function ProcessedDocumentsList() {
  // Add a local state to force re-renders
  const [localRefreshKey, setLocalRefreshKey] = useState(0);
  
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
    refreshCounter
  } = useProcessedDocuments();

  // Handle both initial load and refresh operations
  useEffect(() => {
    console.log("Loading documents (effect trigger)");
    loadProcessedDocuments();
  }, [loadProcessedDocuments, localRefreshKey, refreshCounter]);
  
  // Function to force refresh from UI
  const handleManualRefresh = () => {
    console.log("Manual refresh triggered");
    setLocalRefreshKey(prev => prev + 1);
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
