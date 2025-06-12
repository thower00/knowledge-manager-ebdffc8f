
import { useState, useCallback } from "react";

export function useVectorDialogs() {
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleteAllDialogOpen, setIsDeleteAllDialogOpen] = useState(false);
  const [isDeleteDocumentDialogOpen, setIsDeleteDocumentDialogOpen] = useState(false);
  const [selectedDocumentId, setSelectedDocumentId] = useState("");

  const handleDeleteAll = useCallback(() => {
    setIsDeleteAllDialogOpen(true);
  }, []);

  const handleDeleteDocument = useCallback((documentId: string) => {
    setSelectedDocumentId(documentId);
    setIsDeleteDocumentDialogOpen(true);
  }, []);

  const closeAllDialogs = useCallback(() => {
    setIsDeleteDialogOpen(false);
    setIsDeleteAllDialogOpen(false);
    setIsDeleteDocumentDialogOpen(false);
    setSelectedDocumentId("");
  }, []);

  return {
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
    closeAllDialogs,
  };
}
