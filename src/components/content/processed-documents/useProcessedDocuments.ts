
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
      
      // First, update the UI immediately for better user experience
      const remainingDocs = documents.filter(doc => !idsToDelete.includes(doc.id));
      setDocuments(remainingDocs);
      
      // Close dialog
      setIsDeleteDialogOpen(false);
      
      // Perform actual deletion (this may take time)
      const success = await deleteProcessedDocuments(idsToDelete);
      
      // After deletion attempt completes:
      if (success) {
        // Show success message
        toast({
          title: "Success",
          description: `Deleted ${idsToDelete.length} document(s).`,
        });
        
        // Clear selection
        setSelectedDocuments([]);
        
        // Force reload data from the server after a short delay to ensure data is in sync
        setTimeout(() => {
          loadProcessedDocuments();
        }, 1500);
      } else {
        // If deletion failed, refresh and show error
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to delete one or more documents. Please try again."
        });
        
        // Reload to get the latest state from database
        await loadProcessedDocuments();
      }
    } catch (err: any) {
      console.error("Error deleting documents:", err);
      toast({
        variant: "destructive",
        title: "Error",
        description: err.message || "Failed to delete documents."
      });
      
      // Reload to get accurate state
      await loadProcessedDocuments();
      
      // Reopen dialog if there was an exception
      setIsDeleteDialogOpen(false);
    } finally {
      setIsDeleting(false);
    }
  }, [selectedDocuments, documents, toast, loadProcessedDocuments]);

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
