
import { useState, useCallback } from "react";
import { ProcessedDocument } from "@/types/document";
import { fetchProcessedDocuments, deleteProcessedDocuments } from "../utils/documentDbService";
import { useToast } from "@/components/ui/use-toast";

export function useProcessedDocuments() {
  const [documents, setDocuments] = useState<ProcessedDocument[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDocuments, setSelectedDocuments] = useState<string[]>([]);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const { toast } = useToast();

  const loadProcessedDocuments = useCallback(async () => {
    console.log("Loading processed documents...");
    setIsLoading(true);
    try {
      const docs = await fetchProcessedDocuments();
      console.log("Fetched processed documents:", docs);
      setDocuments(docs);
      
      // Clear selection when documents are reloaded
      setSelectedDocuments([]);
    } catch (err: any) {
      console.error("Error fetching processed documents:", err);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load processed documents."
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  const handleSelectAll = useCallback(() => {
    if (selectedDocuments.length === documents.length) {
      // If all are selected, deselect all
      setSelectedDocuments([]);
    } else {
      // Select all
      setSelectedDocuments(documents.map(doc => doc.id));
    }
  }, [documents, selectedDocuments]);

  const toggleDocumentSelection = useCallback((documentId: string) => {
    setSelectedDocuments(prev => 
      prev.includes(documentId)
        ? prev.filter(id => id !== documentId)
        : [...prev, documentId]
    );
  }, []);

  const confirmDeleteSelected = useCallback(() => {
    if (selectedDocuments.length === 0) {
      toast({
        title: "No Documents Selected",
        description: "Please select at least one document to delete.",
      });
      return;
    }

    setIsDeleteDialogOpen(true);
  }, [selectedDocuments.length, toast]);

  const handleDeleteSelected = useCallback(async () => {
    if (selectedDocuments.length === 0) {
      setIsDeleteDialogOpen(false);
      return;
    }

    setIsDeleting(true);
    try {
      const idsToDelete = [...selectedDocuments];
      console.log("Attempting to delete IDs:", idsToDelete);
      
      const success = await deleteProcessedDocuments(idsToDelete);
      
      if (success) {
        // Update local state immediately for quick UI feedback
        setDocuments(prevDocs => prevDocs.filter(doc => !idsToDelete.includes(doc.id)));
        setSelectedDocuments([]);
        
        // Show success message
        toast({
          title: "Success",
          description: `Deleted ${idsToDelete.length} document(s).`,
        });
        
        // Close dialog
        setIsDeleteDialogOpen(false);
        
        // Refresh the data from database to ensure we're in sync
        await loadProcessedDocuments();
      } else {
        throw new Error("Failed to delete documents");
      }
    } catch (err: any) {
      console.error("Error deleting documents:", err);
      toast({
        variant: "destructive",
        title: "Error",
        description: err.message || "Failed to delete documents."
      });
    } finally {
      setIsDeleting(false);
    }
  }, [loadProcessedDocuments, selectedDocuments, toast]);

  return {
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
  };
}
