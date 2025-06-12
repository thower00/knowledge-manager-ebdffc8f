
import { useEffect } from "react";
import { useVectorOperations } from "./useVectorOperations";
import { useVectorDialogs } from "./useVectorDialogs";

export function useVectorDatabase() {
  const {
    stats,
    embeddings,
    isLoading,
    isClearing,
    loadStats,
    loadEmbeddings,
    loadVectorData,
    clearAllEmbeddings,
    clearDocumentEmbeddings,
  } = useVectorOperations();

  const {
    isDeleteDialogOpen,
    isDeleteAllDialogOpen,
    isDeleteDocumentDialogOpen,
    selectedDocumentId,
    setIsDeleteDialogOpen,
    setIsDeleteAllDialogOpen,
    setIsDeleteDocumentDialogOpen,
    setSelectedDocumentId,
    handleDeleteAll,
    handleDeleteDocument,
  } = useVectorDialogs();

  const confirmDeleteAll = async () => {
    await clearAllEmbeddings();
    setIsDeleteAllDialogOpen(false);
  };

  const confirmDeleteDocument = async () => {
    if (selectedDocumentId) {
      await clearDocumentEmbeddings(selectedDocumentId);
      setIsDeleteDocumentDialogOpen(false);
      setSelectedDocumentId("");
    }
  };

  useEffect(() => {
    loadVectorData();
  }, [loadVectorData]);

  return {
    stats,
    embeddings,
    isLoading,
    isClearing,
    isDeleting: isClearing, // Alias for backward compatibility
    isDeleteDialogOpen,
    isDeleteAllDialogOpen,
    isDeleteDocumentDialogOpen,
    selectedDocumentId,
    setSelectedDocumentId,
    loadStats,
    loadEmbeddings,
    loadVectorData,
    handleDeleteAll,
    handleDeleteDocument,
    setIsDeleteDialogOpen,
    setIsDeleteAllDialogOpen,
    setIsDeleteDocumentDialogOpen,
    confirmDeleteAll,
    confirmDeleteDocument,
    clearDocumentEmbeddings,
    clearAllEmbeddings
  };
}
